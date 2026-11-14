import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  nativeImage,
} from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { FileSystemService, FileMoveOp, StoredItemMeta } from './fsService';

let mainWindow: BrowserWindow | null = null;
let fsService: FileSystemService;
const activeWatchers = new Map<string, fs.FSWatcher>();

function openNativeOsTerminal(targetDir: string): Promise<{ ok: boolean; terminal: string }> {
  return new Promise((resolve) => {
    const safeDir = fs.existsSync(targetDir) ? targetDir : os.homedir();
    const platform = os.platform();

    if (platform === 'darwin') {
      execFile('open', ['-a', 'Terminal', safeDir], (err) => {
        resolve({ ok: !err, terminal: 'Terminal.app' });
      });
    } else if (platform === 'win32') {
      const child = spawn(
        'cmd.exe',
        ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location -LiteralPath '${safeDir}'`],
        { detached: true, stdio: 'ignore' }
      );
      child.unref();
      resolve({ ok: true, terminal: 'PowerShell' });
    } else {
      const child = spawn('x-terminal-emulator', ['--working-directory', safeDir], {
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', () => {
        resolve({ ok: false, terminal: 'Linux Terminal' });
      });
      child.unref();
      resolve({ ok: true, terminal: 'Linux Terminal' });
    }
  });
}

function watchDirectory(dirPath: string) {
  if (!dirPath || activeWatchers.has(dirPath) || !fs.existsSync(dirPath)) return;

  if (activeWatchers.size >= 2) {
    const oldestKey = activeWatchers.keys().next().value;
    if (oldestKey) {
      activeWatchers.get(oldestKey)?.close();
      activeWatchers.delete(oldestKey);
    }
  }

  let debounceTimer: NodeJS.Timeout | null = null;
  try {
    const watcher = fs.watch(dirPath, () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('roombox:dir-changed', dirPath);
        }
      }, 280);
    });
    activeWatchers.set(dirPath, watcher);
  } catch {
    // Ignore permission errors on protected OS folders
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 850,
    minWidth: 960,
    minHeight: 620,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 14, y: 12 },
    backgroundColor: '#2E323B',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (!app.isPackaged) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  const testSandboxDir = process.env.ROOMBOX_TEST_DIR
    ? path.resolve(process.env.ROOMBOX_TEST_DIR)
    : null;
  const effectiveUserDataDir = testSandboxDir
    ? path.join(testSandboxDir, '.roombox-userdata')
    : app.getPath('userData');

  fsService = new FileSystemService(effectiveUserDataDir);

  ipcMain.handle('roombox:window-control', (_event, action: 'minimize' | 'maximize' | 'close') => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    else if (action === 'maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    } else if (action === 'close') {
      mainWindow.close();
    }
  });

  ipcMain.handle('roombox:get-system-init', async () => {
    const specialDirs = testSandboxDir
      ? [{ key: 'home', name: 'Test Sandbox', path: testSandboxDir }]
      : [
          { key: 'home', name: 'Home', path: app.getPath('home') },
          { key: 'desktop', name: 'Desktop', path: app.getPath('desktop') },
          { key: 'documents', name: 'Documents', path: app.getPath('documents') },
          { key: 'downloads', name: 'Downloads', path: app.getPath('downloads') },
          { key: 'pictures', name: 'Pictures', path: app.getPath('pictures') },
        ].filter((d) => fs.existsSync(d.path));

    const rootTarget = testSandboxDir || app.getPath('home');
    const disk = await fsService.getDiskUsage(rootTarget);
    const store = fsService.getStoreState();

    return {
      platform: os.platform(),
      userDataPath: effectiveUserDataDir,
      specialDirs,
      disk,
      store,
    };
  });

  ipcMain.handle('roombox:read-dir', async (_event, dirPath: string) => {
    const target = dirPath || testSandboxDir || app.getPath('home');
    watchDirectory(target);
    const result = await fsService.readDirectory(target);
    const disk = await fsService.getDiskUsage(target);
    return { ...result, disk };
  });

  ipcMain.handle(
    'roombox:create-folder',
    async (_event, parentDir: string, folderName: string, pfp?: string, stickerLabel?: string) => {
      return fsService.createFolder(parentDir, folderName, pfp, stickerLabel);
    }
  );

  ipcMain.handle(
    'roombox:create-note',
    async (_event, parentDir: string, fileName: string, content: string) => {
      return fsService.createNote(parentDir, fileName, content);
    }
  );

  const handleCreateSymlink = async (
    _event: Electron.IpcMainInvokeEvent,
    targetPath: string,
    linkPath: string,
    customName?: string
  ) => {
    return fsService.createSymlink(targetPath, linkPath, customName);
  };
  ipcMain.handle('create-symlink', handleCreateSymlink);
  ipcMain.handle('roombox:create-symlink', handleCreateSymlink);

  ipcMain.handle('roombox:create-hardlink', async (_event, sourcePath: string, targetDir?: string) => {
    return fsService.createHardlink(sourcePath, targetDir);
  });

  const handleRenameItem = async (
    _event: Electron.IpcMainInvokeEvent,
    oldPath: string,
    newName: string
  ) => {
    try {
      return await fsService.renameItem(oldPath, newName);
    } catch (err: any) {
      throw new Error(err?.message || 'Failed to rename item');
    }
  };
  ipcMain.handle('rename-item', handleRenameItem);
  ipcMain.handle('roombox:rename-item', handleRenameItem);

  ipcMain.handle('roombox:move-items', async (_event, sourcePaths: string[], targetDir: string) => {
    return fsService.moveItems(sourcePaths, targetDir);
  });

  ipcMain.handle('roombox:auto-sort', async (_event, dirPath: string) => {
    return fsService.autoSortDirectory(dirPath);
  });

  ipcMain.handle('roombox:batch-rename', async (_event, targetPaths: string[], options: any) => {
    return fsService.batchRename(targetPaths, options);
  });

  ipcMain.handle('roombox:undo-ops', async (_event, operations: FileMoveOp[]) => {
    return fsService.undoOperations(operations);
  });

  ipcMain.handle('roombox:trash-items', async (_event, pathsToDelete: string[]) => {
    const trashed: string[] = [];
    for (const p of pathsToDelete) {
      try {
        await shell.trashItem(p);
        trashed.push(p);
      } catch {
        // Ignore
      }
    }
    return { trashed };
  });

  ipcMain.handle('roombox:permanent-delete', async (_event, pathsToDelete: string[]) => {
    const deleted = await fsService.permanentDeleteItems(pathsToDelete);
    return { deleted };
  });

  ipcMain.handle('roombox:open-terminal', async (_event, dirPath: string) => {
    return openNativeOsTerminal(dirPath);
  });

  ipcMain.handle('roombox:open-external-file', async (_event, filePath: string) => {
    await shell.openPath(filePath);
    return { ok: true };
  });

  const handleSelectDirectory = async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return res.filePaths[0];
  };
  ipcMain.handle('select-directory', handleSelectDirectory);
  ipcMain.handle('roombox:pick-directory', handleSelectDirectory);

  const handleUploadBgImage = async () => {
    if (!mainWindow) return null;
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select RoomBox Wallpaper Image',
      properties: ['openFile'],
      filters: [
        {
          name: 'Images (PNG, JPG, WebP, GIF)',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
        },
      ],
    });
    if (res.canceled || res.filePaths.length === 0) return null;
    return fsService.saveWallpaperImage(res.filePaths[0]);
  };
  ipcMain.handle('roombox:upload-bg-image', handleUploadBgImage);
  ipcMain.handle('upload-background-image', handleUploadBgImage);

  ipcMain.handle(
    'roombox:update-item-meta',
    async (_event, targetPath: string, ino: number | undefined, patch: Partial<StoredItemMeta>) => {
      return fsService.updateItemMetadata(targetPath, ino, patch);
    }
  );

  ipcMain.handle('roombox:save-ui-state', async (_event, partial: any) => {
    return fsService.saveUiState(partial);
  });

  ipcMain.on('roombox:ondragstart', (event, filePath: string) => {
    if (!fs.existsSync(filePath)) return;
    const emptyIcon = nativeImage.createEmpty();
    event.sender.startDrag({
      file: filePath,
      icon: emptyIcon,
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  for (const w of activeWatchers.values()) {
    w.close();
  }
  activeWatchers.clear();
  if (process.platform !== 'darwin') app.quit();
});
