import { contextBridge, ipcRenderer } from 'electron';

export const electronApi = {
  isElectron: true,
  windowControl: (action: 'minimize' | 'maximize' | 'close') =>
    ipcRenderer.invoke('roombox:window-control', action),
  getSystemInit: () => ipcRenderer.invoke('roombox:get-system-init'),
  readDirectory: (dirPath: string) =>
    ipcRenderer.invoke('roombox:read-dir', dirPath),
  createFolder: (
    parentDir: string,
    folderName: string,
    pfp?: string,
    stickerLabel?: string
  ) =>
    ipcRenderer.invoke(
      'roombox:create-folder',
      parentDir,
      folderName,
      pfp,
      stickerLabel
    ),
  createNote: (parentDir: string, fileName: string, content: string) =>
    ipcRenderer.invoke('roombox:create-note', parentDir, fileName, content),
  createSymlink: async (targetPath: string, linkPath: string) => {
    try {
      return await ipcRenderer.invoke('create-symlink', targetPath, linkPath);
    } catch (err: any) {
      if (String(err?.message || '').includes('No handler registered')) {
        return await ipcRenderer.invoke(
          'roombox:create-symlink',
          targetPath,
          linkPath
        );
      }
      throw err;
    }
  },
  createHardlink: (sourcePath: string, targetDir?: string) =>
    ipcRenderer.invoke('roombox:create-hardlink', sourcePath, targetDir),
  renameItem: async (oldPath: string, newName: string) => {
    try {
      return await ipcRenderer.invoke('rename-item', oldPath, newName);
    } catch (err: any) {
      if (String(err?.message || '').includes('No handler registered')) {
        return await ipcRenderer.invoke('roombox:rename-item', oldPath, newName);
      }
      throw err;
    }
  },
  moveItems: (sourcePaths: string[], targetDir: string) =>
    ipcRenderer.invoke('roombox:move-items', sourcePaths, targetDir),
  autoSortDirectory: (dirPath: string) =>
    ipcRenderer.invoke('roombox:auto-sort', dirPath),
  batchRename: (targetPaths: string[], options: any) =>
    ipcRenderer.invoke('roombox:batch-rename', targetPaths, options),
  undoOperations: (operations: Array<{ fromPath: string; toPath: string }>) =>
    ipcRenderer.invoke('roombox:undo-ops', operations),
  trashItems: (pathsToDelete: string[]) =>
    ipcRenderer.invoke('roombox:trash-items', pathsToDelete),
  permanentDelete: (pathsToDelete: string[]) =>
    ipcRenderer.invoke('roombox:permanent-delete', pathsToDelete),
  openTerminal: (dirPath: string) =>
    ipcRenderer.invoke('roombox:open-terminal', dirPath),
  openExternalFile: (filePath: string) =>
    ipcRenderer.invoke('roombox:open-external-file', filePath),
  selectDirectory: async () => {
    try {
      return await ipcRenderer.invoke('select-directory');
    } catch (err: any) {
      if (String(err?.message || '').includes('No handler registered')) {
        return await ipcRenderer.invoke('roombox:pick-directory');
      }
      throw err;
    }
  },
  pickDirectory: async () => {
    try {
      return await ipcRenderer.invoke('select-directory');
    } catch (err: any) {
      if (String(err?.message || '').includes('No handler registered')) {
        return await ipcRenderer.invoke('roombox:pick-directory');
      }
      throw err;
    }
  },
  uploadBackgroundImage: () => ipcRenderer.invoke('roombox:upload-bg-image'),
  updateItemMetadata: (targetPath: string, ino: number | undefined, patch: any) =>
    ipcRenderer.invoke('roombox:update-item-meta', targetPath, ino, patch),
  saveUiState: (partial: any) =>
    ipcRenderer.invoke('roombox:save-ui-state', partial),
  startNativeDrag: (filePath: string) =>
    ipcRenderer.send('roombox:ondragstart', filePath),
  onDirectoryChanged: (callback: (dirPath: string) => void) => {
    const handler = (_event: any, dirPath: string) => callback(dirPath);
    ipcRenderer.on('roombox:dir-changed', handler);
    return () => ipcRenderer.removeListener('roombox:dir-changed', handler);
  },
};

contextBridge.exposeInMainWorld('roomboxElectron', electronApi);
