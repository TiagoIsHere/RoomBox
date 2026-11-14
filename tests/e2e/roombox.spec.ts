import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

test.describe('RoomBox Native Electron End-to-End Suite (roombox.spec.ts)', () => {
  let tempDir: string;
  let electronApp: ElectronApplication;
  let window: Page;

  test.beforeEach(async () => {
    // CRITICAL SAFETY RULE: Always isolate E2E file system + userData inside os.tmpdir()
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-e2e-'));

    // Seed disposable test files and folders inside the temporary sandbox
    const subFolder = path.join(tempDir, '01_Subfolder');
    await fs.mkdir(subFolder, { recursive: true });
    await fs.writeFile(
      path.join( subFolder, 'nested_readme.md'),
      '# Inside Subfolder\nTesting Vim l and h navigation.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'alpha_notes.txt'),
      'Initial note content for E2E rename and symlink verification.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'beta_collision.txt'),
      'Existing file used to trigger EEXIST collision logging.',
      'utf-8'
    );

    const mainEntry = path.resolve(process.cwd(), 'dist-electron/main.js');
    electronApp = await electron.launch({
      args: [mainEntry],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ROOMBOX_TEST_DIR: tempDir,
      },
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await expect(window.getByText('alpha_notes.txt').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('1. Click-to-Rename in Metadata Inspector updates UI, active selection, and real file on disk', async () => {
    // Select alpha_notes.txt to inspect it in the right-hand Metadata Inspector
    await window.getByText('alpha_notes.txt').first().click();

    const inspectorRenameTrigger = window.locator(
      'div[title="Click to rename file or folder"]'
    );
    await expect(inspectorRenameTrigger).toBeVisible();
    await inspectorRenameTrigger.click();

    const renameInput = window
      .locator('aside input[type="text"]')
      .first();
    await expect(renameInput).toBeVisible();
    await renameInput.fill('renamed_test.txt');
    await renameInput.press('Enter');

    // Assert edit mode closes and inspector + file list immediately reflect renamed_test.txt
    await expect(renameInput).toBeHidden();
    await expect(
      window.locator('aside h3', { hasText: 'renamed_test.txt' })
    ).toBeVisible();
    await expect(window.getByText('renamed_test.txt').first()).toBeVisible();

    // Assert real file was renamed inside tempDir on disk
    const entriesOnDisk = await fs.readdir(tempDir);
    expect(entriesOnDisk).toContain('renamed_test.txt');
    expect(entriesOnDisk).not.toContain('alpha_notes.txt');
  });

  test('2. Optional Vim Motions & Visible Focus Ring (j/k/l/h) + clean toggle OFF', async () => {
    // Toggle VIM: ON in the top bar
    const vimButton = window.locator('button', { hasText: /VIM:\s*(OFF|ON)/i });
    await expect(vimButton).toBeVisible();

    const initialLabel = await vimButton.innerText();
    if (initialLabel.toUpperCase().includes('OFF')) {
      await vimButton.click();
    }
    await expect(window.locator('button', { hasText: 'VIM: ON' })).toBeVisible();

    // Press j to move focus down and assert the 2px visible focus ring (ring-2) is applied
    await window.keyboard.press('j');
    const focusedItemAfterJ = window.locator('[data-vim-focused="true"]').first();
    await expect(focusedItemAfterJ).toBeVisible();
    await expect(focusedItemAfterJ).toHaveClass(/ring-2/);

    // Press k to move focus back up to the first item (01_Subfolder)
    await window.keyboard.press('k');
    const focusedFolder = window.locator('[data-vim-focused="true"]').first();
    await expect(focusedFolder).toContainText('01_Subfolder');
    await expect(focusedFolder).toHaveClass(/ring-2/);

    // Press l to enter 01_Subfolder and verify nested_readme.md is displayed
    await window.keyboard.press('l');
    await expect(window.getByText('nested_readme.md').first()).toBeVisible();

    // Press h to return to parent directory
    await window.keyboard.press('h');
    await expect(window.getByText('alpha_notes.txt').first()).toBeVisible();

    // Toggle VIM: OFF and verify j/k no longer intercepts navigation
    await window.locator('button', { hasText: 'VIM: ON' }).click();
    await expect(window.locator('button', { hasText: 'VIM: OFF' })).toBeVisible();
    await expect(window.locator('[data-vim-focused="true"]')).toHaveCount(0);
  });

  test('3. Symlink Creation Modal & Badge creates a real symlink on disk and shows ⇢ badge + target path', async () => {
    // Select alpha_notes.txt and click "+ SYMLINK" in the Metadata Inspector
    await window.getByText('alpha_notes.txt').first().click();

    const createSymlinkBtn = window.locator(
      'button[title="Create Symbolic Link (fs.symlink)"]'
    );
    await expect(createSymlinkBtn).toBeVisible();
    await createSymlinkBtn.click();

    // Verify Create Symbolic Link modal opens
    await expect(window.getByText('CREATE SYMBOLIC LINK')).toBeVisible();
    const symlinkNameInput = window.locator(
      'input[placeholder="Enter symlink name..."]'
    );
    await expect(symlinkNameInput).toBeVisible();
    await symlinkNameInput.fill('alpha_shortcut_link.txt');

    await window.locator('button[type="submit"]', { hasText: 'CREATE SYMLINK' }).click();

    // Verify the new symlink item appears with the ⇢ badge and resolved target path in Inspector
    await expect(window.getByText('alpha_shortcut_link.txt').first()).toBeVisible();
    await window.getByText('alpha_shortcut_link.txt').first().click();

    await expect(window.getByText('⇢ SYMLINK').first()).toBeVisible();
    await expect(window.getByText('⇢ SYMBOLIC LINK TARGET')).toBeVisible();
    await expect(
      window.locator('aside').getByText('alpha_notes.txt')
    ).toBeVisible();

    // Verify real symbolic link exists on disk via fs.lstat
    const symlinkDiskPath = path.join(tempDir, 'alpha_shortcut_link.txt');
    const lstat = await fs.lstat(symlinkDiskPath);
    expect(lstat.isSymbolicLink()).toBe(true);
  });

  test('4. Theme Switcher & Custom Preset Saving updates root CSS variables for Atom One Dark & Tokyo Night', async () => {
    // Open Theme Studio modal
    await window.locator('button', { hasText: 'THEME STUDIO' }).click();
    await expect(
      window.getByText('ROOMBOX THEME STUDIO // PRESETS, PALETTE & WALLPAPER')
    ).toBeVisible();

    // Select Atom One Dark and verify root CSS variables (--bg-primary, --accent)
    await window.locator('button', { hasText: 'Atom One Dark' }).click();
    const atomVars = await window.evaluate(() => {
      const style = document.documentElement.style;
      return {
        bgPrimary: style.getPropertyValue('--bg-primary').trim(),
        accent: style.getPropertyValue('--accent').trim(),
      };
    });
    expect(atomVars.bgPrimary.toUpperCase()).toBe('#282C34');
    expect(atomVars.accent.toUpperCase()).toBe('#61AFEF');

    // Select Tokyo Night and verify root CSS variables (--bg-primary, --accent)
    await window.locator('button', { hasText: 'Tokyo Night' }).click();
    const tokyoVars = await window.evaluate(() => {
      const style = document.documentElement.style;
      return {
        bgPrimary: style.getPropertyValue('--bg-primary').trim(),
        accent: style.getPropertyValue('--accent').trim(),
      };
    });
    expect(tokyoVars.bgPrimary.toUpperCase()).toBe('#1A1B26');
    expect(tokyoVars.accent.toUpperCase()).toBe('#7AA2F7');

    // Save a custom theme preset and verify it appears in the Saved User Theme Presets list
    const presetInput = window.locator(
      'input[placeholder="Name your custom theme + wallpaper preset..."]'
    );
    await presetInput.fill('Neon Cyber Loft');
    await window.locator('button', { hasText: 'SAVE THEME PRESET' }).click();

    await expect(window.getByText('Neon Cyber Loft').first()).toBeVisible();
  });

  test('5. Error Logging in History Drawer records timestamp, error code, and message under ERRORS filter', async () => {
    // Select alpha_notes.txt and attempt to rename it to beta_collision.txt (which already exists)
    await window.getByText('alpha_notes.txt').first().click();
    await window.locator('div[title="Click to rename file or folder"]').click();

    const renameInput = window.locator('aside input[type="text"]').first();
    await renameInput.fill('beta_collision.txt');
    await renameInput.press('Enter');

    // Open the bottom History Drawer and click the ERRORS filter tab
    const errorsTabButton = window.locator('button', {
      hasText: /ERRORS\s*\(\d+\)/i,
    });
    await expect(errorsTabButton).toBeVisible();
    await errorsTabButton.click();

    // Assert the error entry is visible with timestamp [HH:MM:SS], error code EEXIST, and descriptive summary
    await expect(window.getByText('EEXIST').first()).toBeVisible();
    await expect(
      window.getByText(/Target already exists:\s*beta_collision\.txt/i).first()
    ).toBeVisible();
  });
});
