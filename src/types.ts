export type FileType = 'folder' | 'image' | 'audio' | 'note' | 'code' | 'archive';
export type GitStatusBadge = 'M' | 'U' | 'A' | 'D';

export interface RoomFileItem {
  id: string; // Full path on disk in Electron, or virtual ID in Browser fallback
  path?: string;
  name: string;
  type: FileType;
  parentId: string | null;
  size: string;
  sizeBytes?: number;
  modifiedAt: string;
  ino?: number;
  // Permissions, Ownership, Symlinks & Git status
  permissions?: string;
  ownerUid?: number;
  ownerGid?: number;
  nlink?: number;
  isSymlink?: boolean;
  symlinkTarget?: string;
  symlinkTargetId?: string;
  gitStatus?: GitStatusBadge;
  // Custom Folder PFP cover (data URL or preset sticker)
  folderPfp?: string;
  folderStickerLabel?: string;
  // File contents or preview URL
  content?: string;
  imageUrl?: string;
  audioFreqs?: number[];
  // User metadata
  comment: string;
  hashtags: string[];
  pinned?: boolean;
  nativeHandle?: any;
}

export interface DiskMoveOp {
  fromPath: string;
  toPath: string;
}

export interface ActionLogItem {
  id: string;
  timestamp: string;
  actionType:
    | 'move'
    | 'rename'
    | 'create'
    | 'delete'
    | 'tag'
    | 'pfp'
    | 'mount'
    | 'sort'
    | 'terminal'
    | 'link'
    | 'theme'
    | 'error';
  summary: string;
  fromPath?: string;
  toPath?: string;
  errorCode?: string;
  errorDetails?: string;
  operation?: string;
  undoSnapshot?: RoomFileItem[];
  diskOps?: DiskMoveOp[];
  undone?: boolean;
}

export interface PathHistoryEntry {
  id: string;
  folderId: string | null;
  pathString: string;
  timestamp: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export type BuiltinThemePresetId =
  | 'hazy-slate'
  | 'late-night-lamp'
  | 'atom-one-dark'
  | 'tokyo-night';

export type ThemePresetId = BuiltinThemePresetId | 'custom' | string;
export type PatternType = 'none' | 'solid' | 'gingham' | 'scanlines' | 'grid';

export interface ThemeSettings {
  preset: ThemePresetId;
  name?: string;
  bgPrimary: string;
  bgSecondary: string;
  bgCard?: string;
  accentPrimary: string;
  accentSecondary: string;
  textPrimary: string;
  textMuted?: string;
  borderColor?: string;
  pattern: PatternType;
  bgImage?: string;
  bgOverlayOpacity?: number;
  backdropBlur?: number;
}

export interface CustomThemePreset {
  id: string;
  name: string;
  createdAt: string;
  settings: ThemeSettings;
}

export interface SpecialOsDir {
  key: 'home' | 'desktop' | 'documents' | 'downloads' | 'pictures';
  name: string;
  path: string;
}

export interface DiskSpaceInfo {
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedPercent: number;
  freeFormatted: string;
  totalFormatted: string;
}

export interface BatchRenameOptions {
  mode: 'sequential' | 'affix' | 'replace';
  prefix?: string;
  suffix?: string;
  findText?: string;
  replaceText?: string;
}

export interface RoomBoxElectronBridge {
  isElectron: boolean;
  windowControl: (action: 'minimize' | 'maximize' | 'close') => Promise<void>;
  getSystemInit: () => Promise<{
    platform: string;
    userDataPath: string;
    specialDirs: SpecialOsDir[];
    disk: DiskSpaceInfo;
    store: any;
  }>;
  readDirectory: (dirPath: string) => Promise<{
    currentPath: string;
    parentPath: string | null;
    gitBranch: string | null;
    items: RoomFileItem[];
    disk: DiskSpaceInfo;
  }>;
  createFolder: (
    parentDir: string,
    folderName: string,
    pfp?: string,
    stickerLabel?: string
  ) => Promise<RoomFileItem>;
  createNote: (
    parentDir: string,
    fileName: string,
    content: string
  ) => Promise<RoomFileItem>;
  createSymlink: (
    targetPath: string,
    linkPath: string
  ) => Promise<RoomFileItem>;
  createHardlink: (
    sourcePath: string,
    targetDir?: string
  ) => Promise<RoomFileItem>;
  renameItem: (
    oldPath: string,
    newName: string
  ) => Promise<{
    success: boolean;
    fromPath: string;
    toPath: string;
    newPath: string;
    newName: string;
  }>;
  moveItems: (sourcePaths: string[], targetDir: string) => Promise<DiskMoveOp[]>;
  autoSortDirectory: (dirPath: string) => Promise<{
    sortedCount: number;
    operations: DiskMoveOp[];
  }>;
  batchRename: (
    targetPaths: string[],
    options: BatchRenameOptions
  ) => Promise<DiskMoveOp[]>;
  undoOperations: (operations: DiskMoveOp[]) => Promise<number>;
  trashItems: (pathsToDelete: string[]) => Promise<{ trashed: string[] }>;
  permanentDelete: (pathsToDelete: string[]) => Promise<{ deleted: string[] }>;
  openTerminal: (
    dirPath: string
  ) => Promise<{ ok: boolean; terminal: string; error?: string }>;
  openExternalFile: (
    filePath: string
  ) => Promise<{ ok: boolean; error?: string; openedIn?: string }>;
  selectDirectory: () => Promise<string | null>;
  pickDirectory: () => Promise<string | null>;
  uploadBackgroundImage: () => Promise<{
    dataUrl: string;
    savedPath: string;
    fileName: string;
  } | null>;
  updateItemMetadata: (
    targetPath: string,
    ino: number | undefined,
    patch: any
  ) => Promise<any>;
  saveUiState: (partial: any) => Promise<{ ok: boolean }>;
  startNativeDrag: (filePath: string) => void;
  onDirectoryChanged: (callback: (dirPath: string) => void) => () => void;
}

declare global {
  interface Window {
    roomboxElectron?: RoomBoxElectronBridge;
  }
}
