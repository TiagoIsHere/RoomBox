import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const PRELOAD_PATH = path.join(PROJECT_ROOT, 'electron/preload.ts');
const MAIN_PATH = path.join(PROJECT_ROOT, 'electron/main.ts');

function extractChannels(source: string, pattern: RegExp): string[] {
  const channels = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    if (match[1]) {
      channels.add(match[1]);
    }
  }
  return Array.from(channels);
}

describe('IPC Channel Contract Verification (preload.ts <-> main.ts)', () => {
  let tempSandboxDir: string;

  beforeEach(async () => {
    tempSandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-test-ipc-'));
  });

  afterEach(async () => {
    if (tempSandboxDir) {
      await fs.rm(tempSandboxDir, { recursive: true, force: true });
    }
  });

  it('asserts 100% of ipcRenderer.invoke("<channel>") calls in preload.ts have a matching ipcMain.handle("<channel>") in main.ts', async () => {
    const [preloadSource, mainSource] = await Promise.all([
      fs.readFile(PRELOAD_PATH, 'utf-8'),
      fs.readFile(MAIN_PATH, 'utf-8'),
    ]);

    const invokedChannels = extractChannels(
      preloadSource,
      /ipcRenderer\.invoke\(\s*['"]([^'"]+)['"]/g
    );
    const handledChannels = extractChannels(
      mainSource,
      /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g
    );

    expect(invokedChannels.length).toBeGreaterThan(0);
    expect(handledChannels.length).toBeGreaterThan(0);

    const missingHandlers = invokedChannels.filter(
      (channel) => !handledChannels.includes(channel)
    );

    expect(missingHandlers).toEqual([]);
  });

  it('asserts 100% of ipcRenderer.send("<channel>") calls in preload.ts have a matching ipcMain.on("<channel>") in main.ts', async () => {
    const [preloadSource, mainSource] = await Promise.all([
      fs.readFile(PRELOAD_PATH, 'utf-8'),
      fs.readFile(MAIN_PATH, 'utf-8'),
    ]);

    const sentChannels = extractChannels(
      preloadSource,
      /ipcRenderer\.send\(\s*['"]([^'"]+)['"]/g
    );
    const listenedChannels = extractChannels(
      mainSource,
      /ipcMain\.on\(\s*['"]([^'"]+)['"]/g
    );

    expect(sentChannels.length).toBeGreaterThan(0);
    for (const channel of sentChannels) {
      expect(listenedChannels).toContain(channel);
    }
  });

  it('verifies critical rename, symlink, directory picker, and theme wallpaper IPC channels and parameter signatures', async () => {
    const [preloadSource, mainSource] = await Promise.all([
      fs.readFile(PRELOAD_PATH, 'utf-8'),
      fs.readFile(MAIN_PATH, 'utf-8'),
    ]);

    const handledChannels = extractChannels(
      mainSource,
      /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g
    );

    const requiredChannels = [
      'rename-item',
      'roombox:rename-item',
      'create-symlink',
      'roombox:create-symlink',
      'select-directory',
      'roombox:pick-directory',
      'roombox:upload-bg-image',
      'roombox:read-dir',
      'roombox:get-system-init',
      'roombox:create-folder',
      'roombox:create-note',
      'roombox:create-hardlink',
      'roombox:move-items',
      'roombox:auto-sort',
      'roombox:batch-rename',
      'roombox:undo-ops',
      'roombox:trash-items',
      'roombox:permanent-delete',
      'roombox:update-item-meta',
      'roombox:save-ui-state',
    ];

    for (const ch of requiredChannels) {
      expect(handledChannels).toContain(ch);
    }

    // Verify preload passes (oldPath, newName) in exact order to rename-item
    expect(preloadSource).toMatch(
      /renameItem:\s*async\s*\(\s*oldPath:\s*string,\s*newName:\s*string\s*\)/
    );
    expect(preloadSource).toMatch(
      /ipcRenderer\.invoke\(\s*['"]rename-item['"]\s*,\s*oldPath\s*,\s*newName\s*\)/
    );

    // Verify all handlers are registered before createWindow() is invoked inside app.whenReady()
    const lastHandleIdx = mainSource.lastIndexOf('ipcMain.handle(');
    const createWindowCallIdx = mainSource.lastIndexOf('createWindow()');
    expect(lastHandleIdx).toBeGreaterThan(0);
    expect(createWindowCallIdx).toBeGreaterThan(lastHandleIdx);
  });
});
