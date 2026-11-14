import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemService } from '../../electron/fsService';
import { THEME_PRESETS } from '../../src/components/ThemeModal';
import type { BuiltinThemePresetId, CustomThemePreset } from '../../src/types';

describe('Theme Presets & Error History Log Persistence (storeAndHistory.test.ts)', () => {
  let tempDir: string;
  let userDataDir: string;
  let fsService: FileSystemService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-test-store-'));
    userDataDir = path.join(tempDir, '.roombox-userdata');
    await fs.mkdir(userDataDir, { recursive: true });
    fsService = new FileSystemService(userDataDir);
  });

  afterEach(async () => {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('validates and persists all 4 built-in themes (Hazy Slate, Late Night Lamp, Atom One Dark, Tokyo Night)', () => {
    const expectedIds: BuiltinThemePresetId[] = [
      'hazy-slate',
      'late-night-lamp',
      'atom-one-dark',
      'tokyo-night',
    ];

    // Verify exact authentic palettes in THEME_PRESETS
    expect(THEME_PRESETS['hazy-slate'].bgPrimary).toBe('#2E323B');
    expect(THEME_PRESETS['hazy-slate'].accentPrimary).toBe('#D8A7B1');

    expect(THEME_PRESETS['late-night-lamp'].bgPrimary).toBe('#2B1E22');
    expect(THEME_PRESETS['late-night-lamp'].accentPrimary).toBe('#D96B6B');

    expect(THEME_PRESETS['atom-one-dark'].bgPrimary).toBe('#282C34');
    expect(THEME_PRESETS['atom-one-dark'].bgSecondary).toBe('#21252B');
    expect(THEME_PRESETS['atom-one-dark'].accentPrimary).toBe('#61AFEF');

    expect(THEME_PRESETS['tokyo-night'].bgPrimary).toBe('#1A1B26');
    expect(THEME_PRESETS['tokyo-night'].bgSecondary).toBe('#16161E');
    expect(THEME_PRESETS['tokyo-night'].accentPrimary).toBe('#7AA2F7');

    // Serialize each built-in preset to disk and reload in a fresh service instance
    for (const presetId of expectedIds) {
      const themeSettings = THEME_PRESETS[presetId];
      const res = fsService.saveUiState({ theme: themeSettings });
      expect(res.ok).toBe(true);

      const reloadedService = new FileSystemService(userDataDir);
      const loadedTheme = reloadedService.getStoreState().theme;
      expect(loadedTheme).toBeDefined();
      expect(loadedTheme.preset).toBe(presetId);
      expect(loadedTheme.bgPrimary).toBe(themeSettings.bgPrimary);
      expect(loadedTheme.accentPrimary).toBe(themeSettings.accentPrimary);
    }
  });

  it('serializes and reloads custom saved theme presets with uploaded background images cleanly', async () => {
    // Create a sample 1x1 PNG inside the temp sandbox and import it as a wallpaper
    const samplePngPath = path.join(tempDir, 'bedroom_wallpaper.png');
    const tinyPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await fs.writeFile(samplePngPath, Buffer.from(tinyPngBase64, 'base64'));

    const uploadedWallpaper = await fsService.saveWallpaperImage(samplePngPath);
    expect(uploadedWallpaper.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(uploadedWallpaper.fileName).toBe('bedroom_wallpaper.png');

    const customPreset: CustomThemePreset = {
      id: 'custom-cyber-bedroom-01',
      name: 'Cyber Bedroom 98',
      createdAt: '01:25',
      settings: {
        preset: 'custom-cyber-bedroom-01',
        name: 'Cyber Bedroom 98',
        bgPrimary: '#1A1B26',
        bgSecondary: '#16161E',
        bgCard: '#24283B',
        accentPrimary: '#BB9AF7',
        accentSecondary: '#7AA2F7',
        textPrimary: '#C0CAF5',
        textMuted: '#565F89',
        borderColor: '#101016',
        pattern: 'scanlines',
        bgImage: uploadedWallpaper.dataUrl,
        bgOverlayOpacity: 0.65,
        backdropBlur: 6,
      },
    };

    fsService.saveUiState({
      theme: customPreset.settings,
      customThemes: [customPreset],
    });

    const freshInstance = new FileSystemService(userDataDir);
    const state = freshInstance.getStoreState();
    expect(state.customThemes).toHaveLength(1);
    expect(state.customThemes![0].name).toBe('Cyber Bedroom 98');
    expect(state.customThemes![0].settings.bgImage).toBe(uploadedWallpaper.dataUrl);
    expect(state.customThemes![0].settings.bgOverlayOpacity).toBe(0.65);
    expect(state.customThemes![0].settings.backdropBlur).toBe(6);
  });

  it('appends formatted [ERROR] entries with timestamps and error codes to the History Log when operations fail', async () => {
    const missingSource = path.join(tempDir, 'ghost_file.txt');
    let caughtError: unknown = null;

    try {
      await fsService.renameItem(missingSource, 'renamed_ghost.txt');
    } catch (err) {
      caughtError = err;
      fsService.recordErrorLog('Rename Error', err, missingSource);
    }

    expect(caughtError).toBeTruthy();

    // Also record a simulated EEXIST collision error
    const collisionPath = path.join(tempDir, 'existing_note.txt');
    fsService.recordErrorLog(
      'Rename Error',
      Object.assign(new Error(`Target already exists: existing_note.txt`), {
        code: 'EEXIST',
      }),
      collisionPath
    );

    const reloaded = new FileSystemService(userDataDir);
    const logs = reloaded.getStoreState().actionLogs;
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const collisionEntry = logs[0];
    expect(collisionEntry.actionType).toBe('error');
    expect(collisionEntry.errorCode).toBe('EEXIST');
    expect(collisionEntry.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(collisionEntry.summary).toContain('[ERROR] Rename Error:');
    expect(collisionEntry.fromPath).toBe(collisionPath);

    const enoentEntry = logs[1];
    expect(enoentEntry.actionType).toBe('error');
    expect(enoentEntry.errorCode).toBe('ENOENT');
    expect(enoentEntry.timestamp).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(enoentEntry.summary).toContain('[ERROR] Rename Error:');
    expect(enoentEntry.fromPath).toBe(missingSource);
  });
});
