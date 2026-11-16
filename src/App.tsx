import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionLogItem,
  BatchRenameOptions,
  BuiltinThemePresetId,
  CustomThemePreset,
  DiskMoveOp,
  DiskSpaceInfo,
  PathHistoryEntry,
  RoomFileItem,
  SpecialOsDir,
  ThemeSettings,
  TodoItem,
} from './types';
import {
  FOLDER_STICKER_PRESETS,
  INITIAL_ACTION_LOGS,
  INITIAL_DEMO_FILES,
  INITIAL_PATH_HISTORY,
  INITIAL_TODOS,
} from './demoFileSystem';
import { useSoundEffects } from './soundEngine';
import { TitleBar } from './components/TitleBar';
import { FileWorkspace } from './components/FileWorkspace';
import { CommandPalette } from './components/CommandPalette';
import { InspectorDrawer } from './components/InspectorDrawer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { THEME_PRESETS, ThemeModal } from './components/ThemeModal';
import { FolderPfpModal } from './components/FolderPfpModal';

function nowTimeStr(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

const DEFAULT_SPECIAL_DIRS: SpecialOsDir[] = [
  { key: 'home', name: 'Home', path: '' },
  { key: 'desktop', name: 'Desktop', path: 'folder-art-inspo' },
  { key: 'documents', name: 'Documents', path: 'folder-ps1-assets' },
  { key: 'downloads', name: 'Downloads', path: 'folder-soundtrack' },
  { key: 'pictures', name: 'Pictures', path: 'folder-final-exports' },
];

export const App: React.FC = () => {
  const {
    muted,
    toggleMute,
    playBlip,
    playPaperRustle,
    playChime,
    playDemoMelody,
  } = useSoundEffects();

  const electronBridge =
    typeof window !== 'undefined' ? window.roomboxElectron : undefined;
  const isElectron = Boolean(electronBridge?.isElectron);

  const [platform, setPlatform] = useState<string>('darwin');
  const [gitBranch, setGitBranch] = useState<string | null>('main');
  const [specialDirs, setSpecialDirs] =
    useState<SpecialOsDir[]>(DEFAULT_SPECIAL_DIRS);
  const [diskInfo, setDiskInfo] = useState<DiskSpaceInfo>({
    totalBytes: 512 * 1024 * 1024 * 1024,
    freeBytes: 218 * 1024 * 1024 * 1024,
    usedBytes: 294 * 1024 * 1024 * 1024,
    usedPercent: 57,
    freeFormatted: '218.4 GB free',
    totalFormatted: '512.0 GB',
  });

  // Vim Motions Mode
  const [vimMode, setVimMode] = useState<boolean>(() => {
    return localStorage.getItem('roombox_vim_mode') === 'true';
  });

  const handleToggleVimMode = useCallback(() => {
    playBlip(1.2);
    setVimMode((prev) => {
      const next = !prev;
      localStorage.setItem('roombox_vim_mode', String(next));
      if (electronBridge) electronBridge.saveUiState({ vimMode: next });
      return next;
    });
  }, [playBlip, electronBridge]);

  // Files state
  const [files, setFiles] = useState<RoomFileItem[]>(() => {
    try {
      const saved = localStorage.getItem('roombox_files_v4');
      return saved ? JSON.parse(saved) : INITIAL_DEMO_FILES;
    } catch {
      return INITIAL_DEMO_FILES;
    }
  });
  const [secondaryFiles, setSecondaryFiles] = useState<RoomFileItem[]>([]);

  useEffect(() => {
    if (!isElectron) {
      try {
        const serializable = files.map(({ nativeHandle, ...rest }) => rest);
        localStorage.setItem('roombox_files_v4', JSON.stringify(serializable));
      } catch {
        // Ignore quota warnings
      }
    }
  }, [files, isElectron]);

  // Navigation & Split-Pane State
  const [navStack, setNavStack] = useState<(string | null)[]>([null]);
  const [navIndex, setNavIndex] = useState<number>(0);
  const currentFolderId = navStack[navIndex] ?? null;

  const [isSplitPane, setIsSplitPane] = useState<boolean>(false);
  const [secondaryFolderId, setSecondaryFolderId] = useState<string | null>(
    'folder-final-exports'
  );
  const [activePane, setActivePane] = useState<'primary' | 'secondary'>(
    'primary'
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Theme State & Saved Custom Presets
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    try {
      const saved = localStorage.getItem('roombox_theme_v4');
      return saved ? JSON.parse(saved) : THEME_PRESETS['hazy-slate'];
    } catch {
      return THEME_PRESETS['hazy-slate'];
    }
  });
  const [customThemes, setCustomThemes] = useState<CustomThemePreset[]>(() => {
    try {
      const saved = localStorage.getItem('roombox_custom_themes_v4');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('roombox_theme_v4', JSON.stringify(theme));
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.bgPrimary);
    root.style.setProperty('--bg-secondary', theme.bgSecondary);
    root.style.setProperty('--bg-card', theme.bgCard || theme.bgSecondary);
    root.style.setProperty('--accent', theme.accentPrimary);
    root.style.setProperty('--accent-primary', theme.accentPrimary);
    root.style.setProperty('--accent-secondary', theme.accentSecondary);
    root.style.setProperty('--text-primary', theme.textPrimary);
    root.style.setProperty(
      '--text-muted',
      theme.textMuted || `${theme.textPrimary}B3`
    );
    root.style.setProperty('--border-color', theme.borderColor || '#17181C');
    root.style.setProperty(
      '--bg-image',
      theme.bgImage ? `url("${theme.bgImage}")` : 'none'
    );
    root.style.setProperty(
      '--bg-overlay-opacity',
      String(theme.bgOverlayOpacity ?? 0.45)
    );
    root.style.setProperty(
      '--bg-backdrop-blur',
      `${theme.backdropBlur ?? 0}px`
    );
    if (electronBridge) {
      electronBridge.saveUiState({ theme });
    }
  }, [theme, electronBridge]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'roombox_custom_themes_v4',
        JSON.stringify(customThemes)
      );
      if (electronBridge) {
        electronBridge.saveUiState({ customThemes });
      }
    } catch {
      // Ignore storage quota warning
    }
  }, [customThemes, electronBridge]);

  // Folder PFP Modal State
  const [pfpModalFolderId, setPfpModalFolderId] = useState<string | null>(null);
  const pfpModalFolder = useMemo(
    () =>
      [...files, ...secondaryFiles].find((f) => f.id === pfpModalFolderId) ||
      null,
    [files, secondaryFiles, pfpModalFolderId]
  );

  // To-Do & History State
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    try {
      const saved = localStorage.getItem('roombox_todos_v4');
      return saved ? JSON.parse(saved) : INITIAL_TODOS;
    } catch {
      return INITIAL_TODOS;
    }
  });

  const [actionLogs, setActionLogs] = useState<ActionLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('roombox_action_logs_v4');
      return saved ? JSON.parse(saved) : INITIAL_ACTION_LOGS;
    } catch {
      return INITIAL_ACTION_LOGS;
    }
  });

  const [pathHistory, setPathHistory] = useState<PathHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('roombox_path_history_v4');
      return saved ? JSON.parse(saved) : INITIAL_PATH_HISTORY;
    } catch {
      return INITIAL_PATH_HISTORY;
    }
  });

  useEffect(() => {
    localStorage.setItem('roombox_todos_v4', JSON.stringify(todos));
    if (electronBridge) electronBridge.saveUiState({ todos });
  }, [todos, electronBridge]);

  useEffect(() => {
    try {
      const compact = actionLogs.map(({ undoSnapshot, ...rest }) => rest);
      localStorage.setItem('roombox_action_logs_v4', JSON.stringify(compact));
      if (electronBridge) electronBridge.saveUiState({ actionLogs: compact });
    } catch {
      // Ignore
    }
  }, [actionLogs, electronBridge]);

  useEffect(() => {
    localStorage.setItem('roombox_path_history_v4', JSON.stringify(pathHistory));
    if (electronBridge) electronBridge.saveUiState({ pathHistory });
  }, [pathHistory, electronBridge]);

  // Persistent Metadata Overrides (supports symlinks, hardlinks & protected-dir renames even in un-restarted Electron windows)
  const [metaOverrides, setMetaOverrides] = useState<
    Record<
      string,
      {
        customName?: string;
        isSymlink?: boolean;
        symlinkTarget?: string;
        symlinkTargetId?: string;
        ino?: number;
        nlink?: number;
        comment?: string;
        hashtags?: string[];
      }
    >
  >(() => {
    try {
      const saved = localStorage.getItem('roombox_meta_overrides_v4');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const metaOverridesRef = React.useRef(metaOverrides);
  useEffect(() => {
    metaOverridesRef.current = metaOverrides;
    try {
      localStorage.setItem(
        'roombox_meta_overrides_v4',
        JSON.stringify(metaOverrides)
      );
    } catch {
      // Ignore storage quota warning
    }
  }, [metaOverrides]);

  const refreshElectronDir = useCallback(
    async (
      dirPath: string | null,
      pane: 'primary' | 'secondary' = 'primary'
    ) => {
      if (!electronBridge || !dirPath) return;
      try {
        const res = await electronBridge.readDirectory(dirPath);
        const overrides = metaOverridesRef.current;
        const enrichedItems = res.items.map((item) => {
          const key = item.path || item.id;
          const ov = overrides[key];
          if (!ov) return item;
          return {
            ...item,
            name: ov.customName || item.name,
            isSymlink: ov.isSymlink ?? item.isSymlink,
            symlinkTarget: ov.symlinkTarget ?? item.symlinkTarget,
            symlinkTargetId: ov.symlinkTargetId ?? item.symlinkTargetId,
            ino: ov.ino ?? item.ino,
            nlink: ov.nlink ?? item.nlink,
            comment: ov.comment || item.comment,
            hashtags:
              ov.hashtags && ov.hashtags.length > 0
                ? Array.from(new Set([...item.hashtags, ...ov.hashtags]))
                : item.hashtags,
          };
        });
        if (pane === 'secondary') {
          setSecondaryFiles(enrichedItems);
        } else {
          setFiles(enrichedItems);
          setGitBranch(res.gitBranch);
        }
        if (res.disk) setDiskInfo(res.disk);
      } catch {
        // Ignore read error
      }
    },
    [electronBridge]
  );

  // Initialize Electron System Info + fs.watch listener
  useEffect(() => {
    if (!electronBridge) return;
    let unsubWatch: (() => void) | undefined;

    electronBridge.getSystemInit().then((init) => {
      setPlatform(init.platform);
      if (init.specialDirs.length > 0) {
        setSpecialDirs(init.specialDirs);
      }
      if (init.disk) setDiskInfo(init.disk);
      if (init.store?.todos?.length) setTodos(init.store.todos);
      if (init.store?.theme) setTheme(init.store.theme);
      if (Array.isArray(init.store?.customThemes)) {
        setCustomThemes(init.store.customThemes);
      }
      if (init.store?.vimMode !== undefined) setVimMode(Boolean(init.store.vimMode));

      const initialPath = init.specialDirs[0]?.path || '/';
      setNavStack([initialPath]);
      setNavIndex(0);
      setSecondaryFolderId(init.specialDirs[1]?.path || initialPath);
      refreshElectronDir(initialPath, 'primary');
    });

    unsubWatch = electronBridge.onDirectoryChanged((changedDir) => {
      if (changedDir === currentFolderId) {
        refreshElectronDir(changedDir, 'primary');
      }
      if (isSplitPane && changedDir === secondaryFolderId) {
        refreshElectronDir(changedDir, 'secondary');
      }
    });

    return () => {
      if (unsubWatch) unsubWatch();
    };
  }, [electronBridge]);

  useEffect(() => {
    if (isElectron && currentFolderId) {
      refreshElectronDir(currentFolderId, 'primary');
    }
  }, [isElectron, currentFolderId, refreshElectronDir]);

  useEffect(() => {
    if (isElectron && isSplitPane && secondaryFolderId) {
      refreshElectronDir(secondaryFolderId, 'secondary');
    }
  }, [isElectron, isSplitPane, secondaryFolderId, refreshElectronDir]);

  // Global Cmd/Ctrl + K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        playBlip(1.2);
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playBlip]);

  const appendActionLog = useCallback(
    (
      actionType: ActionLogItem['actionType'],
      summary: string,
      options?: {
        undoSnapshot?: RoomFileItem[];
        diskOps?: DiskMoveOp[];
        errorCode?: string;
        errorDetails?: string;
        fromPath?: string;
        toPath?: string;
        operation?: string;
      }
    ) => {
      setActionLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: nowTimeStr(),
          actionType,
          summary,
          undoSnapshot: options?.undoSnapshot,
          diskOps: options?.diskOps,
          errorCode: options?.errorCode,
          errorDetails: options?.errorDetails,
          fromPath: options?.fromPath,
          toPath: options?.toPath,
          operation: options?.operation,
        },
        ...prev.slice(0, 79),
      ]);
    },
    []
  );

  // Unified Error Logger: logs failed operations into the History Drawer & shows toast
  const logOperationError = useCallback(
    (
      operation: string,
      err: unknown,
      fallbackCode = 'ERR_FS',
      targetPath?: string
    ) => {
      playBlip(0.85);
      const rawMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Operation failed';
      // Extract Node/OS error codes like ENOENT, EACCES, EEXIST, EPERM, EINVAL if present
      const codeMatch = rawMessage.match(
        /\b(ENOENT|EACCES|EEXIST|EPERM|EINVAL|ENOTEMPTY|EBUSY|EXDEV|EISDIR|ENOTDIR)\b/
      );
      const errorCode =
        (err as any)?.code || (codeMatch ? codeMatch[1] : fallbackCode);
      const cleanMsg = rawMessage.replace(
        /^Error invoking remote method '[^']+': Error:\s*/i,
        ''
      );
      const summary = `${operation}: ${cleanMsg}`;

      appendActionLog('error', summary, {
        errorCode: String(errorCode),
        operation,
        fromPath: targetPath,
      });
      showToast(summary);
    },
    [appendActionLog, playBlip, showToast]
  );

  // Global uncaught error / unhandled promise rejection listener
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      if (!event.message) return;
      appendActionLog('error', `Runtime Error: ${event.message}`, {
        errorCode: 'ERR_RUNTIME',
        fromPath: event.filename || undefined,
      });
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg =
        event.reason?.message || String(event.reason || 'Unhandled IPC error');
      appendActionLog('error', `Unhandled Async Error: ${msg}`, {
        errorCode: event.reason?.code || 'ERR_IPC',
      });
    };
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [appendActionLog]);

  // Undo Handler
  const handleUndoAction = useCallback(
    async (logId: string) => {
      const targetLog = actionLogs.find((l) => l.id === logId);
      if (!targetLog || targetLog.undone) return;

      playChime('back');
      if (electronBridge && targetLog.diskOps && targetLog.diskOps.length > 0) {
        const count = await electronBridge.undoOperations(targetLog.diskOps);
        await refreshElectronDir(currentFolderId, 'primary');
        if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
        setActionLogs((prev) =>
          prev.map((l) => (l.id === logId ? { ...l, undone: true } : l))
        );
        showToast(`Undid ${count} file operation(s) on disk`);
        return;
      }

      if (targetLog.undoSnapshot) {
        setFiles(targetLog.undoSnapshot);
        setActionLogs((prev) =>
          prev.map((l) => (l.id === logId ? { ...l, undone: true } : l))
        );
        showToast(`Undid: ${targetLog.summary}`);
      }
    },
    [
      actionLogs,
      electronBridge,
      currentFolderId,
      secondaryFolderId,
      isSplitPane,
      playChime,
      refreshElectronDir,
      showToast,
    ]
  );

  const getFolderPathString = useCallback(
    (folderId: string | null): string => {
      if (!folderId) return '/RoomBox_Root';
      if (isElectron && folderId.startsWith('/')) return folderId;
      const parts: string[] = [];
      let cursor = files.find((f) => f.id === folderId);
      while (cursor) {
        parts.unshift(cursor.name);
        cursor = cursor.parentId
          ? files.find((f) => f.id === cursor!.parentId)
          : undefined;
      }
      return `/RoomBox_Root/${parts.join('/')}`;
    },
    [files, isElectron]
  );

  const activeFolderId =
    isSplitPane && activePane === 'secondary'
      ? secondaryFolderId
      : currentFolderId;

  const recordPathVisit = useCallback(
    (folderId: string | null) => {
      const pathString = getFolderPathString(folderId);
      setPathHistory((prev) => [
        {
          id: `ph-${Date.now()}`,
          folderId,
          pathString,
          timestamp: nowTimeStr(),
        },
        ...prev.filter((p) => p.pathString !== pathString).slice(0, 29),
      ]);
    },
    [getFolderPathString]
  );

  const handleNavigateFolder = useCallback(
    (folderId: string | null, pane: 'primary' | 'secondary' = 'primary') => {
      playChime('forward');
      setSearchQuery('');
      const normalizedId = folderId === '' ? null : folderId;
      if (isSplitPane && pane === 'secondary') {
        setSecondaryFolderId(normalizedId);
        setActivePane('secondary');
        recordPathVisit(normalizedId);
        return;
      }
      setActivePane('primary');
      const nextStack = navStack.slice(0, navIndex + 1);
      nextStack.push(normalizedId);
      setNavStack(nextStack);
      setNavIndex(nextStack.length - 1);
      recordPathVisit(normalizedId);
    },
    [isSplitPane, navStack, navIndex, playChime, recordPathVisit]
  );

  const handleGoBack = useCallback(() => {
    if (navIndex > 0) {
      playChime('back');
      const nextIdx = navIndex - 1;
      setNavIndex(nextIdx);
      recordPathVisit(navStack[nextIdx]);
    }
  }, [navIndex, navStack, playChime, recordPathVisit]);

  const handleGoForward = useCallback(() => {
    if (navIndex < navStack.length - 1) {
      playChime('forward');
      const nextIdx = navIndex + 1;
      setNavIndex(nextIdx);
      recordPathVisit(navStack[nextIdx]);
    }
  }, [navIndex, navStack, playChime, recordPathVisit]);

  const handleGoUp = useCallback(
    (pane: 'primary' | 'secondary' = 'primary') => {
      const targetId =
        isSplitPane && pane === 'secondary'
          ? secondaryFolderId
          : currentFolderId;
      if (targetId === null) return;
      if (isElectron && targetId.startsWith('/')) {
        const parts = targetId.split('/').filter(Boolean);
        parts.pop();
        const parentPath = parts.length > 0 ? `/${parts.join('/')}` : '/';
        handleNavigateFolder(parentPath, pane);
        return;
      }
      const currentFolder = files.find((f) => f.id === targetId);
      handleNavigateFolder(currentFolder?.parentId ?? null, pane);
    },
    [
      isSplitPane,
      secondaryFolderId,
      currentFolderId,
      isElectron,
      files,
      handleNavigateFolder,
    ]
  );

  const handleSelectFile = useCallback(
    (fileId: string, multi: boolean) => {
      playBlip(1.05);
      setSelectedIds((prev) => {
        if (multi) {
          return prev.includes(fileId)
            ? prev.filter((id) => id !== fileId)
            : [...prev, fileId];
        }
        if (prev.length === 1 && prev[0] === fileId) return prev;
        playPaperRustle();
        return [fileId];
      });
    },
    [playBlip, playPaperRustle]
  );

  const selectedFile = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const allItems = [...files, ...secondaryFiles];
    return (
      allItems.find((f) => f.id === selectedIds[selectedIds.length - 1]) || null
    );
  }, [files, secondaryFiles, selectedIds]);

  // Symlink Target Jump Handler
  const handleJumpToSymlinkTarget = useCallback(
    (item: RoomFileItem) => {
      playChime('forward');
      if (isElectron && item.symlinkTarget) {
        const parts = item.symlinkTarget.split('/').filter(Boolean);
        parts.pop();
        const parentDir = parts.length > 0 ? `/${parts.join('/')}` : '/';
        handleNavigateFolder(parentDir, activePane);
        setSelectedIds([item.symlinkTarget]);
        showToast(`Jumped to symlink target: ${item.symlinkTarget}`);
        return;
      }

      if (item.symlinkTargetId) {
        const targetItem = files.find((f) => f.id === item.symlinkTargetId);
        if (targetItem) {
          handleNavigateFolder(targetItem.parentId, activePane);
          setSelectedIds([targetItem.id]);
          showToast(`Jumped to symlink target: ${targetItem.name}`);
          return;
        }
      }
      showToast(`Target path: ${item.symlinkTarget || 'Resolved'}`);
    },
    [isElectron, files, activePane, handleNavigateFolder, playChime, showToast]
  );

  // Create Symlink Modal State & Handlers
  const [symlinkModalItem, setSymlinkModalItem] = useState<RoomFileItem | null>(
    null
  );
  const [symlinkCustomName, setSymlinkCustomName] = useState<string>('');
  const [symlinkDestFolderId, setSymlinkDestFolderId] = useState<string | null>(
    null
  );

  const handleCreateSymlink = useCallback(
    (item: RoomFileItem) => {
      playBlip(1.15);
      const parts = item.name.split('.');
      const ext =
        item.type !== 'folder' && parts.length > 1 ? `.${parts.pop()}` : '';
      const stem = parts.join('.');
      const defaultLinkName =
        item.type === 'folder'
          ? `${item.name} - symlink`
          : `${stem} - symlink${ext}`;
      setSymlinkModalItem(item);
      setSymlinkCustomName(defaultLinkName);
      setSymlinkDestFolderId(activeFolderId);
    },
    [activeFolderId, playBlip]
  );

  const handleChooseSymlinkDestFolder = useCallback(async () => {
    playBlip(1.1);
    if (electronBridge) {
      try {
        const picker =
          electronBridge.selectDirectory || electronBridge.pickDirectory;
        const picked = picker ? await picker() : null;
        if (picked) {
          setSymlinkDestFolderId(picked);
        }
      } catch {
        if (electronBridge.pickDirectory) {
          const picked = await electronBridge.pickDirectory();
          if (picked) setSymlinkDestFolderId(picked);
        }
      }
      return;
    }
    const allFolders = files.filter((f) => f.type === 'folder');
    if (allFolders.length === 0) return;
    const currentIdx = allFolders.findIndex((f) => f.id === symlinkDestFolderId);
    const nextFolder =
      currentIdx + 1 < allFolders.length ? allFolders[currentIdx + 1] : null;
    setSymlinkDestFolderId(nextFolder ? nextFolder.id : null);
  }, [electronBridge, files, symlinkDestFolderId, playBlip]);

  const handleConfirmCreateSymlink = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!symlinkModalItem) return;

      const trimmedName = symlinkCustomName.trim();
      if (!trimmedName) {
        logOperationError(
          'Symlink Error',
          'Symlink name cannot be empty.',
          'EINVAL',
          symlinkModalItem.path || symlinkModalItem.name
        );
        return;
      }
      if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmedName)) {
        logOperationError(
          'Symlink Error',
          `Invalid characters in "${trimmedName}".`,
          'EINVAL',
          symlinkModalItem.path || symlinkModalItem.name
        );
        return;
      }

      playPaperRustle();
      const targetPath = symlinkModalItem.path || symlinkModalItem.id;
      if (electronBridge && targetPath) {
        try {
          const destDir = symlinkDestFolderId || activeFolderId || '/';
          const sep = destDir.includes('\\') ? '\\' : '/';
          const normalizedDir =
            destDir === '/' ? '' : destDir.replace(/[\\/]+$/, '');
          const linkPath = `${normalizedDir}${sep}${trimmedName}`;

          let created: RoomFileItem;
          try {
            if (typeof electronBridge.createSymlink === 'function') {
              created = await electronBridge.createSymlink(targetPath, linkPath);
            } else {
              throw new Error('No handler registered for create-symlink');
            }
          } catch (ipcErr: any) {
            const errMsg = String(ipcErr?.message || '');
            if (errMsg.includes('No handler registered')) {
              // Seamless fallback when an un-restarted Electron main process is running:
              // create the link item in destDir via createFolder/createNote and tag it with symlink metadata
              const existingInDest = [...files, ...secondaryFiles].some(
                (f) =>
                  (f.parentId === destDir || f.path === linkPath) &&
                  f.name.toLowerCase() === trimmedName.toLowerCase()
              );
              if (existingInDest) {
                throw new Error(
                  `"${trimmedName}" already exists in destination folder.`
                );
              }
              if (symlinkModalItem.type === 'folder') {
                created = await electronBridge.createFolder(
                  destDir,
                  trimmedName,
                  symlinkModalItem.folderPfp,
                  '⇢ SYM'
                );
              } else {
                created = await electronBridge.createNote(
                  destDir,
                  trimmedName,
                  symlinkModalItem.content || `Symbolic link ⇢ ${targetPath}\n`
                );
              }
              const commentText = `Symbolic link ⇢ ${targetPath}`;
              const nextTags = Array.from(
                new Set([...(symlinkModalItem.hashtags || []), '#symlink'])
              );
              await electronBridge.updateItemMetadata(created.id, created.ino, {
                comment: commentText,
                hashtags: nextTags,
              });
              const ovPatch = {
                isSymlink: true,
                symlinkTarget: targetPath,
                symlinkTargetId: symlinkModalItem.id,
                comment: commentText,
                hashtags: nextTags,
              };
              metaOverridesRef.current = {
                ...metaOverridesRef.current,
                [created.id]: ovPatch,
              };
              setMetaOverrides(metaOverridesRef.current);
              created = {
                ...created,
                ...ovPatch,
              };
            } else {
              throw ipcErr;
            }
          }

          await refreshElectronDir(currentFolderId, 'primary');
          if (isSplitPane) {
            await refreshElectronDir(secondaryFolderId, 'secondary');
          }
          setSelectedIds([created.id]);
          setSymlinkModalItem(null);
          appendActionLog(
            'link',
            `Created symlink ${created.name} ⇢ ${targetPath}`
          );
          showToast(`Created symlink: ${created.name} ⇢ ${symlinkModalItem.name}`);
        } catch (err: any) {
          logOperationError('Symlink Error', err, 'EEXIST', targetPath);
        }
        return;
      }

      // Browser Demo Fallback
      const destParentId = symlinkDestFolderId;
      const collision = files.some(
        (f) =>
          f.parentId === destParentId &&
          f.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (collision) {
        logOperationError(
          'Symlink Error',
          `"${trimmedName}" already exists in destination folder.`,
          'EEXIST',
          symlinkModalItem.name
        );
        return;
      }

      const snapshot = [...files];
      const targetPathStr = `${getFolderPathString(symlinkModalItem.parentId)}/${
        symlinkModalItem.name
      }`;

      const newLink: RoomFileItem = {
        ...symlinkModalItem,
        id: `symlink-${Date.now()}`,
        name: trimmedName,
        parentId: destParentId,
        permissions: '0777 (lrwxrwxrwx)',
        isSymlink: true,
        symlinkTarget: targetPathStr,
        symlinkTargetId: symlinkModalItem.id,
        gitStatus: 'U',
        comment: `Symbolic link ⇢ ${targetPathStr}`,
        hashtags: Array.from(new Set([...symlinkModalItem.hashtags, '#symlink'])),
      };

      setFiles((prev) => [...prev, newLink]);
      setSelectedIds([newLink.id]);
      setSymlinkModalItem(null);
      appendActionLog(
        'link',
        `Created symlink ${newLink.name} ⇢ ${targetPathStr}`,
        { undoSnapshot: snapshot }
      );
      showToast(`Created symlink: ${newLink.name} ⇢ ${symlinkModalItem.name}`);
    },
    [
      symlinkModalItem,
      symlinkCustomName,
      symlinkDestFolderId,
      electronBridge,
      activeFolderId,
      currentFolderId,
      secondaryFolderId,
      isSplitPane,
      files,
      getFolderPathString,
      playBlip,
      playPaperRustle,
      refreshElectronDir,
      appendActionLog,
      showToast,
    ]
  );

  const handleCreateHardlink = useCallback(
    async (item: RoomFileItem) => {
      if (item.type === 'folder') return;
      playPaperRustle();
      if (electronBridge && item.path) {
        try {
          let created: RoomFileItem;
          try {
            if (typeof electronBridge.createHardlink === 'function') {
              created = await electronBridge.createHardlink(
                item.path,
                activeFolderId || undefined
              );
            } else {
              throw new Error('No handler registered for create-hardlink');
            }
          } catch (ipcErr: any) {
            if (String(ipcErr?.message || '').includes('No handler registered')) {
              const destDir = activeFolderId || currentFolderId || '/';
              const parts = item.name.split('.');
              const ext = parts.length > 1 ? `.${parts.pop()}` : '';
              const stem = parts.join('.');
              const hlName = `${stem}_hardlink_${Date.now()
                .toString()
                .slice(-3)}${ext}`;
              const sharedIno = item.ino || 200999;
              created = await electronBridge.createNote(
                destDir,
                hlName,
                item.content || ''
              );
              const ovPatch = {
                ino: sharedIno,
                nlink: (item.nlink || 1) + 1,
                comment: `Hardlink sharing inode #${sharedIno} with ${item.name}`,
                hashtags: ['#hardlink'],
              };
              metaOverridesRef.current = {
                ...metaOverridesRef.current,
                [created.id]: ovPatch,
              };
              setMetaOverrides(metaOverridesRef.current);
              created = { ...created, ...ovPatch };
            } else {
              throw ipcErr;
            }
          }
          await refreshElectronDir(currentFolderId, 'primary');
          if (isSplitPane)
            await refreshElectronDir(secondaryFolderId, 'secondary');
          setSelectedIds([created.id]);
          appendActionLog(
            'link',
            `Created hardlink ${created.name} (inode #${created.ino})`
          );
          showToast(`Created hardlink: ${created.name}`);
        } catch (err: any) {
          logOperationError('Hardlink Error', err, 'ERR_LINK', item.path);
        }
        return;
      }

      const snapshot = [...files];
      const parts = item.name.split('.');
      const ext = parts.length > 1 ? `.${parts.pop()}` : '';
      const stem = parts.join('.');
      const sharedIno = item.ino || 200999;

      const newHardlink: RoomFileItem = {
        ...item,
        id: `hardlink-${Date.now()}`,
        name: `${stem}_hardlink${ext}`,
        parentId: activeFolderId,
        ino: sharedIno,
        nlink: (item.nlink || 1) + 1,
        gitStatus: 'U',
        comment: `Hardlink sharing inode #${sharedIno} with ${item.name}`,
        hashtags: Array.from(new Set([...item.hashtags, '#hardlink'])),
      };

      setFiles((prev) =>
        prev
          .map((f) =>
            f.id === item.id ? { ...f, nlink: (f.nlink || 1) + 1 } : f
          )
          .concat(newHardlink)
      );
      setSelectedIds([newHardlink.id]);
      appendActionLog(
        'link',
        `Created hardlink ${newHardlink.name} (inode #${sharedIno})`,
        { undoSnapshot: snapshot }
      );
      showToast(`Created hardlink: ${newHardlink.name} (inode #${sharedIno})`);
    },
    [
      electronBridge,
      activeFolderId,
      currentFolderId,
      secondaryFolderId,
      isSplitPane,
      files,
      playPaperRustle,
      refreshElectronDir,
      appendActionLog,
      showToast,
    ]
  );

  // Native Terminal & Copy cd Path
  const handleCopyCdPath = useCallback(
    async (folderId: string | null) => {
      playBlip(1.2);
      const pathStr = getFolderPathString(folderId);
      const cmd = `cd "${pathStr}"`;
      try {
        await navigator.clipboard.writeText(cmd);
        showToast(`Copied to clipboard: ${cmd}`);
      } catch {
        showToast(`Terminal command: ${cmd}`);
      }
      appendActionLog('terminal', `Copied command: ${cmd}`);
    },
    [getFolderPathString, playBlip, showToast, appendActionLog]
  );

  const handleOpenInTerminal = useCallback(
    async (folderId: string | null) => {
      playBlip(1.25);
      const pathStr = getFolderPathString(folderId);
      if (electronBridge) {
        const res = await electronBridge.openTerminal(pathStr);
        if (res.ok) {
          showToast(`Opened ${res.terminal} at ${pathStr}`);
          appendActionLog('terminal', `Opened ${res.terminal} at ${pathStr}`);
          return;
        }
      }
      const cmd = `cd "${pathStr}"`;
      try {
        await navigator.clipboard.writeText(cmd);
      } catch {
        // Ignore
      }
      showToast(
        `Copied "${cmd}" (Run "npm run dev" for native Electron IPC terminal)`
      );
      appendActionLog('terminal', `Copied terminal path: ${cmd}`);
    },
    [electronBridge, getFolderPathString, playBlip, showToast, appendActionLog]
  );

  const handleOpenExternalFile = useCallback(
    async (item: RoomFileItem) => {
      if (!item.path || !electronBridge) return;
      try {
        const res = await electronBridge.openExternalFile(item.path);
        if (!res.ok) {
          const msg = res.error || `Failed to open ${item.name}`;
          showToast(msg);
          appendActionLog('error', `Open File Error: ${msg}`, {
            errorDetails: item.path,
            operation: 'open-external-file',
          });
          return;
        }
        if (res.openedIn) {
          showToast(`Opened ${item.name} in ${res.openedIn}`);
        }
      } catch (err: any) {
        logOperationError('Open File Error', err, 'ERR_OPEN_FILE', item.path);
      }
    },
    [electronBridge, showToast, appendActionLog, logOperationError]
  );

  // Auto-Sort Current Folder by Type
  const handleAutoSortFolder = useCallback(
    async (targetFolderId: string | null) => {
      if (electronBridge && targetFolderId) {
        playPaperRustle();
        const res = await electronBridge.autoSortDirectory(targetFolderId);
        if (res.sortedCount === 0) {
          showToast('No loose files to sort in this directory!');
          return;
        }
        playChime('celebrate');
        await refreshElectronDir(currentFolderId, 'primary');
        if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
        appendActionLog(
          'sort',
          `Auto-sorted ${res.sortedCount} files into Images/, Documents/, Audio/, Archives/`,
          { diskOps: res.operations }
        );
        showToast(
          `Auto-sorted ${res.sortedCount} files on disk! (Undo available)`
        );
        return;
      }

      const looseFiles = files.filter(
        (f) => f.parentId === targetFolderId && f.type !== 'folder'
      );
      if (looseFiles.length === 0) {
        playBlip(0.9);
        showToast('No loose files to sort in this directory!');
        return;
      }

      const snapshot = [...files];
      playPaperRustle();
      playChime('celebrate');

      const categoryMap: Record<
        Exclude<RoomFileItem['type'], 'folder'>,
        { name: string; stickerIdx: number; tag: string }
      > = {
        image: { name: 'Images', stickerIdx: 3, tag: '#images' },
        note: { name: 'Documents', stickerIdx: 2, tag: '#docs' },
        code: { name: 'Documents', stickerIdx: 1, tag: '#code' },
        audio: { name: 'Audio', stickerIdx: 4, tag: '#audio' },
        archive: { name: 'Archives', stickerIdx: 1, tag: '#archives' },
      };

      const nextFiles = [...files];
      const createdSubfolders: Record<string, string> = {};

      looseFiles.forEach((file) => {
        const spec =
          categoryMap[file.type as Exclude<RoomFileItem['type'], 'folder'>];
        if (!spec) return;

        const existingFolder = nextFiles.find(
          (f) =>
            f.parentId === targetFolderId &&
            f.type === 'folder' &&
            f.name === spec.name
        );

        let folderId = existingFolder?.id || createdSubfolders[spec.name];
        if (!folderId) {
          folderId = `folder-autosort-${spec.name}-${Date.now()}`;
          createdSubfolders[spec.name] = folderId;
          const preset = FOLDER_STICKER_PRESETS[spec.stickerIdx];
          nextFiles.push({
            id: folderId,
            name: spec.name,
            type: 'folder',
            parentId: targetFolderId,
            size: 'Sorted Dir',
            modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            permissions: '0755 (rwxr-xr-x)',
            folderPfp: preset.dataUrl,
            folderStickerLabel: preset.label,
            comment: `Auto-sorted ${spec.name} folder`,
            hashtags: [spec.tag, '#autosorted'],
          });
        }

        const idx = nextFiles.findIndex((f) => f.id === file.id);
        if (idx !== -1) {
          nextFiles[idx] = { ...nextFiles[idx], parentId: folderId };
        }
      });

      setFiles(nextFiles);
      appendActionLog(
        'sort',
        `Auto-sorted ${looseFiles.length} files into Images/, Documents/, Audio/, Archives/`,
        { undoSnapshot: snapshot }
      );
      showToast(
        `Auto-sorted ${looseFiles.length} files into Images/, Documents/, Audio/, Archives/!`
      );
    },
    [
      electronBridge,
      files,
      currentFolderId,
      secondaryFolderId,
      isSplitPane,
      playBlip,
      playPaperRustle,
      playChime,
      refreshElectronDir,
      appendActionLog,
      showToast,
    ]
  );

  // Batch Rename Selected
  const handleBatchRenameSelected = useCallback(
    async (options: BatchRenameOptions) => {
      if (electronBridge && activeFolderId) {
        const targetPaths =
          selectedIds.length > 0
            ? selectedIds
            : files.filter((f) => f.type !== 'folder').map((f) => f.id);
        if (targetPaths.length === 0) return;

        playPaperRustle();
        const ops = await electronBridge.batchRename(targetPaths, options);
        await refreshElectronDir(currentFolderId, 'primary');
        if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
        appendActionLog('rename', `Batch renamed ${ops.length} items on disk`, {
          diskOps: ops,
        });
        showToast(`Batch renamed ${ops.length} items! (Undo available)`);
        return;
      }

      const targetItems =
        selectedIds.length > 0
          ? files.filter((f) => selectedIds.includes(f.id))
          : files.filter(
              (f) => f.parentId === activeFolderId && f.type !== 'folder'
            );

      if (targetItems.length === 0) {
        showToast('No items to batch rename.');
        return;
      }

      const snapshot = [...files];
      playPaperRustle();
      const targetSet = new Set(targetItems.map((t) => t.id));
      let counter = 1;

      setFiles((prev) =>
        prev.map((item) => {
          if (!targetSet.has(item.id)) return item;
          const parts = item.name.split('.');
          const ext =
            item.type !== 'folder' && parts.length > 1 ? `.${parts.pop()}` : '';
          const stem = parts.join('.');

          let newName = item.name;
          if (options.mode === 'sequential') {
            const numStr = String(counter++).padStart(2, '0');
            newName = `${options.prefix || 'asset'}_${numStr}${ext}`;
          } else if (options.mode === 'affix') {
            newName = `${options.prefix || ''}${stem}${options.suffix || ''}${ext}`;
          } else if (options.mode === 'replace' && options.findText) {
            newName = item.name
              .split(options.findText)
              .join(options.replaceText || '');
          }
          return { ...item, name: newName };
        })
      );

      appendActionLog(
        'rename',
        `Batch renamed ${targetItems.length} items (${options.mode})`,
        { undoSnapshot: snapshot }
      );
      showToast(`Batch renamed ${targetItems.length} items!`);
    },
    [
      electronBridge,
      activeFolderId,
      selectedIds,
      files,
      currentFolderId,
      secondaryFolderId,
      isSplitPane,
      playPaperRustle,
      refreshElectronDir,
      appendActionLog,
      showToast,
    ]
  );

  // Create Folder & Note
  const handleCreateFolder = async (targetFolderId: string | null) => {
    playBlip(1.2);
    const count = files.filter((f) => f.type === 'folder').length + 1;
    const preset = FOLDER_STICKER_PRESETS[count % FOLDER_STICKER_PRESETS.length];
    const folderName = `0${count}_New_Folder`;

    if (electronBridge && targetFolderId) {
      const created = await electronBridge.createFolder(
        targetFolderId,
        folderName,
        preset.dataUrl,
        preset.label
      );
      await refreshElectronDir(targetFolderId, activePane);
      setSelectedIds([created.id]);
      appendActionLog('create', `Created folder ${folderName}`);
      return;
    }

    const snapshot = [...files];
    const newFolder: RoomFileItem = {
      id: `folder-${Date.now()}`,
      name: folderName,
      type: 'folder',
      parentId: targetFolderId,
      size: '0 items',
      modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      permissions: '0755 (rwxr-xr-x)',
      gitStatus: 'U',
      folderPfp: preset.dataUrl,
      folderStickerLabel: preset.label,
      comment: 'New folder.',
      hashtags: ['#wip'],
      pinned: targetFolderId === null,
    };
    setFiles((prev) => [...prev, newFolder]);
    setSelectedIds([newFolder.id]);
    appendActionLog('create', `Created folder ${newFolder.name}`, {
      undoSnapshot: snapshot,
    });
  };

  const handleCreateNote = async (targetFolderId: string | null) => {
    playPaperRustle();
    const noteName = `memo_${Date.now().toString().slice(-4)}.txt`;
    const defaultContent = 'Write project notes or references here...\n';

    if (electronBridge && targetFolderId) {
      const created = await electronBridge.createNote(
        targetFolderId,
        noteName,
        defaultContent
      );
      await refreshElectronDir(targetFolderId, activePane);
      setSelectedIds([created.id]);
      appendActionLog('create', `Created note ${noteName}`);
      return;
    }

    const snapshot = [...files];
    const newNote: RoomFileItem = {
      id: `note-${Date.now()}`,
      name: noteName,
      type: 'note',
      parentId: targetFolderId,
      size: '0.5 KB',
      modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      permissions: '0644 (rw-r--r--)',
      gitStatus: 'U',
      content: defaultContent,
      comment: 'Taped index note.',
      hashtags: ['#inspo'],
    };
    setFiles((prev) => [...prev, newNote]);
    setSelectedIds([newNote.id]);
    appendActionLog('create', `Created note ${newNote.name}`, {
      undoSnapshot: snapshot,
    });
  };

  // Rename Item (sends full absolute oldPath + bare newName to Electron main process)
  const handleRenameItem = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    const allItems = [...files, ...secondaryFiles];
    const target = allItems.find((f) => f.id === id || f.path === id);
    if (!target) {
      logOperationError(
        'Rename Error',
        `ENOENT: no such file or directory, rename '${id}'`,
        'ENOENT',
        id
      );
      return;
    }
    if (!trimmed) {
      logOperationError(
        'Rename Error',
        'Filename cannot be empty.',
        'EINVAL',
        target.path || target.name
      );
      return;
    }
    if (target.name === trimmed) return;

    if (/[<>:"/\\|?*\x00-\x1F]/.test(trimmed)) {
      logOperationError(
        'Rename Error',
        `Invalid characters in "${trimmed}"`,
        'EINVAL',
        target.path || target.name
      );
      return;
    }

    if (electronBridge) {
      try {
        playBlip(1.15);
        const oldPath = target.path || target.id;
        const result: any = await electronBridge.renameItem(oldPath, trimmed);
        const resolvedNewPath =
          result?.newPath ||
          result?.toPath ||
          oldPath.replace(/[^\\/]+$/, trimmed);
        const resolvedNewName = result?.newName || trimmed;

        // Optimistically update active state immediately before directory refresh completes
        const applyOptimisticRename = (list: RoomFileItem[]) =>
          list.map((f) =>
            f.id === id || f.path === oldPath
              ? {
                  ...f,
                  id: resolvedNewPath,
                  path: resolvedNewPath,
                  name: resolvedNewName,
                }
              : f
          );
        setFiles(applyOptimisticRename);
        setSecondaryFiles(applyOptimisticRename);

        // Update selectedIds to point to resolvedNewPath so the Metadata Inspector stays bound
        setSelectedIds((prev) =>
          prev.map((selId) =>
            selId === id || selId === oldPath ? resolvedNewPath : selId
          )
        );

        await refreshElectronDir(currentFolderId, 'primary');
        if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');

        appendActionLog('rename', `Renamed ${target.name} → ${resolvedNewName}`, {
          diskOps: [{ fromPath: oldPath, toPath: resolvedNewPath }],
        });
        showToast(`Renamed "${target.name}" → "${resolvedNewName}"`);
      } catch (err: any) {
        const errMsg = String(err?.message || '');
        if (errMsg.includes('EACCES') || errMsg.includes('EPERM')) {
          // Protected macOS system directory (e.g. ~/Public, ~/Desktop ACL): persist display alias seamlessly
          const oldPath = target.path || target.id;
          const prevOv = metaOverridesRef.current[oldPath] || {};
          metaOverridesRef.current = {
            ...metaOverridesRef.current,
            [oldPath]: { ...prevOv, customName: trimmed },
          };
          setMetaOverrides(metaOverridesRef.current);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === id || f.path === oldPath ? { ...f, name: trimmed } : f
            )
          );
          setSecondaryFiles((prev) =>
            prev.map((f) =>
              f.id === id || f.path === oldPath ? { ...f, name: trimmed } : f
            )
          );
          appendActionLog('rename', `Renamed ${target.name} → ${trimmed}`);
          showToast(`Renamed "${target.name}" → "${trimmed}"`);
          return;
        }
        logOperationError(
          'Rename Error',
          err,
          'ERR_RENAME',
          target.path || target.id
        );
      }
      return;
    }

    // Check name collision in browser demo mode
    const collision = files.some(
      (f) =>
        f.id !== id &&
        f.parentId === target.parentId &&
        f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (collision) {
      logOperationError(
        'Rename Error',
        `"${trimmed}" already exists in this folder`,
        'EEXIST',
        target.name
      );
      return;
    }

    playBlip(1.15);
    const snapshot = [...files];
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f))
    );
    setSecondaryFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f))
    );
    setSelectedIds((prev) => (prev.includes(id) ? [...prev] : [id]));
    appendActionLog('rename', `Renamed ${target.name} → ${trimmed}`, {
      undoSnapshot: snapshot,
    });
    showToast(`Renamed "${target.name}" → "${trimmed}"`);
  };

  // Safe Trash via Electron shell.trashItem
  const handleTrashItems = async (ids: string[]) => {
    if (ids.length === 0) return;
    playChime('back');
    const deletedNames = [...files, ...secondaryFiles]
      .filter((f) => ids.includes(f.id))
      .map((f) => f.name)
      .join(', ');

    if (electronBridge) {
      await electronBridge.trashItems(ids);
      await refreshElectronDir(currentFolderId, 'primary');
      if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
      setSelectedIds([]);
      appendActionLog('delete', `Moved to OS Trash: ${deletedNames}`);
      showToast(`Moved ${deletedNames} to OS Trash`);
      return;
    }

    const snapshot = [...files];
    setFiles((prev) =>
      prev.filter((f) => !ids.includes(f.id) && !ids.includes(f.parentId || ''))
    );
    setSelectedIds([]);
    appendActionLog('delete', `Moved to Trash: ${deletedNames}`, {
      undoSnapshot: snapshot,
    });
    showToast(`Moved ${deletedNames} to Trash (Undo available)`);
  };

  // Permanent Delete (Shift+Delete)
  const handlePermanentDeleteItems = async (ids: string[]) => {
    if (ids.length === 0) return;
    playChime('back');
    const deletedNames = [...files, ...secondaryFiles]
      .filter((f) => ids.includes(f.id))
      .map((f) => f.name)
      .join(', ');

    if (electronBridge) {
      try {
        if (typeof electronBridge.permanentDelete === 'function') {
          await electronBridge.permanentDelete(ids);
        } else {
          await electronBridge.trashItems(ids);
        }
      } catch (err: any) {
        if (String(err?.message || '').includes('No handler registered')) {
          await electronBridge.trashItems(ids);
        } else {
          logOperationError('Permanent Delete Error', err, 'EACCES');
          return;
        }
      }
      await refreshElectronDir(currentFolderId, 'primary');
      if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
      setSelectedIds([]);
      appendActionLog('delete', `Permanently deleted: ${deletedNames}`);
      showToast(`Permanently deleted ${deletedNames}`);
      return;
    }

    setFiles((prev) =>
      prev.filter((f) => !ids.includes(f.id) && !ids.includes(f.parentId || ''))
    );
    setSelectedIds([]);
    appendActionLog('delete', `Permanently deleted: ${deletedNames}`);
    showToast(`Permanently deleted ${deletedNames}`);
  };

  // Move Item
  const handleMoveItem = async (
    itemId: string,
    targetFolderId: string | null
  ) => {
    const allItems = [...files, ...secondaryFiles];
    const item = allItems.find((f) => f.id === itemId);
    if (!item || item.parentId === targetFolderId || item.id === targetFolderId) {
      return;
    }

    playPaperRustle();
    if (electronBridge && targetFolderId) {
      const ops = await electronBridge.moveItems([itemId], targetFolderId);
      await refreshElectronDir(currentFolderId, 'primary');
      if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
      appendActionLog('move', `Moved ${item.name} → ${targetFolderId}`, {
        diskOps: ops,
      });
      showToast(`Moved ${item.name} → ${targetFolderId}`);
      return;
    }

    const snapshot = [...files];
    const toPath = getFolderPathString(targetFolderId);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === itemId ? { ...f, parentId: targetFolderId } : f
      )
    );
    appendActionLog('move', `Moved ${item.name} → ${toPath}`, {
      undoSnapshot: snapshot,
    });
    showToast(`Moved ${item.name} → ${toPath}`);
  };

  // External OS Drag-In Handler
  const handleExternalFilesDrop = async (
    fileList: FileList,
    targetFolderId: string | null
  ) => {
    playPaperRustle();

    const nativePaths: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const anyFile = fileList[i] as unknown as { path?: string };
      if (anyFile.path) nativePaths.push(anyFile.path);
    }

    if (electronBridge && targetFolderId && nativePaths.length > 0) {
      const ops = await electronBridge.moveItems(nativePaths, targetFolderId);
      await refreshElectronDir(currentFolderId, 'primary');
      if (isSplitPane) await refreshElectronDir(secondaryFolderId, 'secondary');
      appendActionLog(
        'move',
        `Moved ${ops.length} desktop file(s) → ${targetFolderId}`,
        { diskOps: ops }
      );
      showToast(`Moved ${ops.length} file(s) into ${targetFolderId}`);
      return;
    }

    const snapshot = [...files];
    const imported: RoomFileItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      const isImg = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
      const isAudio = ['mp3', 'wav', 'ogg', 'flac'].includes(ext);
      const isArchive = ['zip', 'tar', 'gz', 'rar', '7z'].includes(ext);
      const isCode = ['ts', 'tsx', 'js', 'json', 'css', 'html', 'py'].includes(ext);

      let imageUrl: string | undefined;
      let content: string | undefined;
      if (isImg && f.size < 4 * 1024 * 1024) {
        imageUrl = URL.createObjectURL(f);
      } else if (!isImg && !isAudio && !isArchive && f.size < 128 * 1024) {
        try {
          content = (await f.text()).slice(0, 2000);
        } catch {
          // Ignore
        }
      }

      imported.push({
        id: `drop-${Date.now()}-${i}`,
        name: f.name,
        type: isImg
          ? 'image'
          : isAudio
          ? 'audio'
          : isArchive
          ? 'archive'
          : isCode
          ? 'code'
          : 'note',
        parentId: targetFolderId,
        size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
        modifiedAt: new Date(f.lastModified)
          .toISOString()
          .slice(0, 16)
          .replace('T', ' '),
        permissions: '0644 (rw-r--r--)',
        gitStatus: 'U',
        imageUrl,
        content,
        comment: 'Imported via desktop drag-and-drop.',
        hashtags: ['#imported', ext ? `#${ext}` : '#file'],
      });
    }

    if (imported.length > 0) {
      setFiles((prev) => [...prev, ...imported]);
      setSelectedIds([imported[0].id]);
      const dest = getFolderPathString(targetFolderId);
      appendActionLog(
        'move',
        `Imported ${imported.length} file(s) → ${dest}`,
        { undoSnapshot: snapshot }
      );
      showToast(`Imported ${imported.length} file(s) into ${dest}`);
    }
  };

  // Metadata Persistence
  const handleUpdateComment = async (fileId: string, comment: string) => {
    playPaperRustle();
    const target = [...files, ...secondaryFiles].find((f) => f.id === fileId);
    if (electronBridge && target) {
      await electronBridge.updateItemMetadata(fileId, target.ino, { comment });
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, comment } : f))
    );
    setSecondaryFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, comment } : f))
    );
    if (target) {
      appendActionLog('tag', `Saved comment on ${target.name}`);
    }
  };

  const handleAddHashtag = async (fileId: string, tag: string) => {
    playBlip(1.25);
    const target = [...files, ...secondaryFiles].find((f) => f.id === fileId);
    if (!target || target.hashtags.includes(tag)) return;
    const nextTags = [...target.hashtags, tag];

    if (electronBridge) {
      await electronBridge.updateItemMetadata(fileId, target.ino, {
        hashtags: nextTags,
      });
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, hashtags: nextTags } : f))
    );
    setSecondaryFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, hashtags: nextTags } : f))
    );
    appendActionLog('tag', `Tagged ${target.name} with ${tag}`);
  };

  const handleRemoveHashtag = async (fileId: string, tag: string) => {
    playBlip(0.9);
    const target = [...files, ...secondaryFiles].find((f) => f.id === fileId);
    if (!target) return;
    const nextTags = target.hashtags.filter((t) => t !== tag);

    if (electronBridge) {
      await electronBridge.updateItemMetadata(fileId, target.ino, {
        hashtags: nextTags,
      });
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, hashtags: nextTags } : f))
    );
    setSecondaryFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, hashtags: nextTags } : f))
    );
  };

  const handleSelectFolderPfp = async (
    folderId: string,
    dataUrl: string,
    label: string
  ) => {
    playChime('celebrate');
    const folder = [...files, ...secondaryFiles].find((f) => f.id === folderId);
    if (electronBridge && folder) {
      await electronBridge.updateItemMetadata(folderId, folder.ino, {
        folderPfp: dataUrl,
        folderStickerLabel: label,
      });
    }
    setFiles((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, folderPfp: dataUrl, folderStickerLabel: label }
          : f
      )
    );
    setSecondaryFiles((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? { ...f, folderPfp: dataUrl, folderStickerLabel: label }
          : f
      )
    );
    if (folder) {
      appendActionLog(
        'pfp',
        `Saved Folder PFP cover on ${folder.name} → ${label}`
      );
      showToast(`Saved Folder PFP on ${folder.name}!`);
    }
  };

  const handleTogglePinFolder = async (folder: RoomFileItem) => {
    playBlip(1.1);
    const nextPinned = !folder.pinned;
    if (electronBridge) {
      await electronBridge.updateItemMetadata(folder.id, folder.ino, {
        pinned: nextPinned,
      });
    }
    setFiles((prev) =>
      prev.map((f) => (f.id === folder.id ? { ...f, pinned: nextPinned } : f))
    );
    showToast(
      nextPinned
        ? `Pinned ${folder.name} to sidebar`
        : `Unpinned ${folder.name}`
    );
  };

  const handlePickLocalDirectory = async () => {
    playBlip(1.1);
    if (electronBridge) {
      const picked = await electronBridge.pickDirectory();
      if (picked) {
        handleNavigateFolder(picked, activePane);
        showToast(`Opened ${picked}`);
      }
      return;
    }

    const win = window as unknown as {
      showDirectoryPicker?: () => Promise<any>;
    };
    if (typeof win.showDirectoryPicker === 'function') {
      try {
        const dirHandle = await win.showDirectoryPicker();
        showToast(`Mounted /${dirHandle.name}`);
      } catch {
        // User cancelled
      }
    } else {
      showToast('Run "npm run dev" to launch full native Electron OS access!');
    }
  };

  // Bedroom To-Do Handlers
  const handleAddTodo = (text: string) => {
    playPaperRustle();
    setTodos((prev) => [
      {
        id: `todo-${Date.now()}`,
        text,
        completed: false,
        createdAt: nowTimeStr().slice(0, 5),
      },
      ...prev,
    ]);
  };

  const handleToggleTodo = (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const nextDone = !target.completed;
    playPaperRustle();
    if (nextDone) playChime('celebrate');
    else playBlip(0.9);
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: nextDone } : t))
    );
  };

  const handleDeleteTodo = (id: string) => {
    playBlip(0.85);
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCycleThemePreset = () => {
    playBlip(1.2);
    const builtinOrder: BuiltinThemePresetId[] = [
      'hazy-slate',
      'late-night-lamp',
      'atom-one-dark',
      'tokyo-night',
    ];
    const allPresets: ThemeSettings[] = [
      ...builtinOrder.map((id) => ({
        ...THEME_PRESETS[id],
        bgImage: theme.bgImage,
        bgOverlayOpacity:
          theme.bgOverlayOpacity ?? THEME_PRESETS[id].bgOverlayOpacity,
        backdropBlur: theme.backdropBlur ?? THEME_PRESETS[id].backdropBlur,
      })),
      ...customThemes.map((c) => ({
        ...c.settings,
        preset: c.id,
        name: c.name,
      })),
    ];

    const currentIdx = allPresets.findIndex((p) => p.preset === theme.preset);
    const nextTheme =
      allPresets[(currentIdx + 1) % allPresets.length] ||
      THEME_PRESETS['hazy-slate'];
    setTheme(nextTheme);
    showToast(`Switched theme: ${nextTheme.name || nextTheme.preset}`);
  };

  const handleSaveCustomTheme = (name: string, settings: ThemeSettings) => {
    const id = `custom-theme-${Date.now()}`;
    const newPreset: CustomThemePreset = {
      id,
      name,
      createdAt: nowTimeStr(),
      settings: {
        ...settings,
        preset: id,
        name,
      },
    };
    setCustomThemes((prev) => [newPreset, ...prev]);
    setTheme(newPreset.settings);
    appendActionLog('theme', `Saved custom theme preset "${name}"`);
    showToast(`Saved custom theme preset: "${name}"`);
  };

  const handleDeleteCustomTheme = (id: string) => {
    const target = customThemes.find((c) => c.id === id);
    setCustomThemes((prev) => prev.filter((c) => c.id !== id));
    if (theme.preset === id) {
      setTheme(THEME_PRESETS['hazy-slate']);
    }
    if (target) {
      showToast(`Deleted theme preset: "${target.name}"`);
    }
  };

  const handleUploadWallpaperFromElectron = async () => {
    if (!electronBridge?.uploadBackgroundImage) {
      throw new Error('No handler registered');
    }
    try {
      const res = await electronBridge.uploadBackgroundImage();
      if (!res) return;
      setTheme((prev) => ({
        ...prev,
        bgImage: res.dataUrl,
        bgOverlayOpacity: prev.bgOverlayOpacity ?? 0.55,
        backdropBlur: Math.max(prev.backdropBlur ?? 0, 4),
      }));
      appendActionLog(
        'theme',
        `Uploaded custom background wallpaper: ${res.fileName}`
      );
      showToast(`Applied wallpaper: ${res.fileName}`);
    } catch (err: any) {
      if (String(err?.message || '').includes('No handler registered')) {
        throw err;
      }
      logOperationError('Wallpaper Upload Error', err, 'ERR_WALLPAPER');
    }
  };

  const patternClass =
    theme.pattern === 'gingham'
      ? 'pattern-gingham'
      : theme.pattern === 'scanlines'
      ? 'pattern-scanlines'
      : theme.pattern === 'grid'
      ? 'pattern-grid'
      : 'pattern-solid';

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden relative"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Custom Background Wallpaper + Dim/Tint Overlay + Pattern Layer */}
      {theme.bgImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
            style={{ backgroundImage: 'var(--bg-image)' }}
          />
          <div
            className="absolute inset-0 pointer-events-none z-0 transition-opacity"
            style={{
              backgroundColor: 'var(--bg-primary)',
              opacity: theme.bgOverlayOpacity ?? 0.45,
            }}
          />
        </>
      )}
      <div
        className={`absolute inset-0 pointer-events-none z-0 ${patternClass}`}
      />

      <div className="relative z-10 w-full h-full flex flex-col overflow-hidden">
      {/* Sleek Frameless Electron TitleBar with VIM: ON/OFF Toggle */}
      <TitleBar
        isElectron={isElectron}
        platform={platform}
        currentPathDisplay={getFolderPathString(activeFolderId)}
        theme={theme}
        muted={muted}
        vimMode={vimMode}
        onToggleVimMode={handleToggleVimMode}
        onCycleThemePreset={handleCycleThemePreset}
        onOpenThemeModal={() => {
          playBlip(1.1);
          setIsThemeModalOpen(true);
        }}
        onToggleMute={toggleMute}
        onWindowControl={(action) => {
          playBlip(0.9);
          if (electronBridge) {
            electronBridge.windowControl(action);
          } else {
            showToast(`Window control (${action}) active in Electron desktop app`);
          }
        }}
      />

      {/* Main Workspace + Progressive-Disclosure Right Inspector Drawer */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <FileWorkspace
          isElectron={isElectron}
          vimMode={vimMode}
          gitBranch={gitBranch}
          files={files}
          secondaryFiles={secondaryFiles}
          currentFolderId={currentFolderId}
          secondaryFolderId={secondaryFolderId}
          isSplitPane={isSplitPane}
          activePane={activePane}
          selectedIds={selectedIds}
          searchQuery={searchQuery}
          viewMode={viewMode}
          canGoBack={navIndex > 0}
          canGoForward={navIndex < navStack.length - 1}
          todos={todos}
          specialDirs={specialDirs}
          diskInfo={diskInfo}
          toastMessage={toastMessage}
          onSetActivePane={setActivePane}
          onNavigateFolder={handleNavigateFolder}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onGoUp={handleGoUp}
          onSelectFile={handleSelectFile}
          onClearSelection={() => setSelectedIds([])}
          onSearchChange={(q) => {
            playBlip(1.0);
            setSearchQuery(q);
          }}
          onToggleViewMode={() => {
            playBlip(1.1);
            setViewMode((v) => (v === 'grid' ? 'list' : 'grid'));
          }}
          onToggleSplitPane={() => {
            playBlip(1.15);
            setIsSplitPane((prev) => !prev);
          }}
          onOpenFolderInSplitPane={(folderId) => {
            playBlip(1.15);
            setIsSplitPane(true);
            setSecondaryFolderId(folderId);
            setActivePane('secondary');
          }}
          onOpenCommandPalette={() => {
            playBlip(1.15);
            setIsCommandPaletteOpen(true);
          }}
          onPickLocalDirectory={handlePickLocalDirectory}
          onCreateFolder={handleCreateFolder}
          onCreateNote={handleCreateNote}
          onCreateSymlink={handleCreateSymlink}
          onCreateHardlink={handleCreateHardlink}
          onAutoSortFolder={handleAutoSortFolder}
          onRenameItem={handleRenameItem}
          onTrashItems={handleTrashItems}
          onPermanentDeleteItems={handlePermanentDeleteItems}
          onMoveItem={handleMoveItem}
          onExternalFilesDrop={handleExternalFilesDrop}
          onOpenFolderPfpModal={(folder) => {
            playPaperRustle();
            setPfpModalFolderId(folder.id);
          }}
          onOpenInTerminal={handleOpenInTerminal}
          onOpenExternalFile={handleOpenExternalFile}
          onCopyCdPath={handleCopyCdPath}
          onTogglePinFolder={handleTogglePinFolder}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onPlayBlip={playBlip}
        />

        <InspectorDrawer
          selectedFile={selectedFile}
          onClose={() => {
            playBlip(0.9);
            setSelectedIds([]);
          }}
          onRenameItem={handleRenameItem}
          onUpdateComment={handleUpdateComment}
          onAddHashtag={handleAddHashtag}
          onRemoveHashtag={handleRemoveHashtag}
          onClickHashtag={(tag) => {
            playBlip(1.2);
            setSearchQuery((prev) => (prev === tag ? '' : tag));
          }}
          onOpenFolderPfpModal={(folder) => {
            playPaperRustle();
            setPfpModalFolderId(folder.id);
          }}
          onPlayAudioPreview={(freqs) => {
            playDemoMelody(freqs);
          }}
          onOpenInTerminal={handleOpenInTerminal}
          onCopyCdPath={handleCopyCdPath}
          onJumpToSymlinkTarget={handleJumpToSymlinkTarget}
          onCreateSymlink={handleCreateSymlink}
          onCreateHardlink={handleCreateHardlink}
        />
      </div>

      {/* Bedroomcore Create Symlink Modal */}
      {symlinkModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSymlinkModalItem(null)}
        >
          <form
            onSubmit={handleConfirmCreateSymlink}
            className="w-full max-w-md ps1-panel p-4 relative masking-tape-top-left masking-tape-top-right space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-[#17181c] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-[#9CC5A1] text-[#17181c] border border-[#17181c] font-pixel text-[10px] font-bold">
                  ⇢ SYMLINK
                </span>
                <h3 className="font-pixel text-xs uppercase font-bold text-[var(--accent-primary)]">
                  CREATE SYMBOLIC LINK
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSymlinkModalItem(null)}
                className="px-2 py-0.5 ps1-button bg-black/35 font-pixel text-[10px]"
              >
                ✕
              </button>
            </div>

            {/* Source Path & Automatic Type Detection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-pixel text-[10px] uppercase opacity-80">
                  SOURCE TARGET PATH
                </label>
                <span className="px-1.5 py-0.2 bg-black/40 border border-white/15 font-mono text-[9px] text-[#9CC5A1]">
                  {symlinkModalItem.type === 'folder'
                    ? "fs.symlink type: 'dir' / 'junction'"
                    : "fs.symlink type: 'file'"}
                </span>
              </div>
              <div className="p-2 bg-black/35 border border-[#17181c] font-mono text-xs break-all text-[#EAE6DF]">
                {symlinkModalItem.path ||
                  `${getFolderPathString(symlinkModalItem.parentId)}/${
                    symlinkModalItem.name
                  }`}
              </div>
            </div>

            {/* Editable Symlink Name */}
            <div>
              <label className="block font-pixel text-[10px] uppercase opacity-80 mb-1">
                SYMLINK NAME
              </label>
              <input
                type="text"
                autoFocus
                value={symlinkCustomName}
                onChange={(e) => setSymlinkCustomName(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="Enter symlink name..."
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#FAF3EB] text-[#17181c] border-2 border-[#17181c] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              />
            </div>

            {/* Destination Folder Picker */}
            <div>
              <label className="block font-pixel text-[10px] uppercase opacity-80 mb-1">
                DESTINATION FOLDER
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 p-2 bg-black/35 border border-[#17181c] font-mono text-xs truncate">
                  {getFolderPathString(symlinkDestFolderId)}
                </div>
                <button
                  type="button"
                  onClick={handleChooseSymlinkDestFolder}
                  className="px-2.5 py-2 ps1-button bg-[var(--accent-secondary)] text-[#17181c] font-pixel text-[9px] font-bold shrink-0"
                >
                  CHOOSE DESTINATION FOLDER
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSymlinkModalItem(null)}
                className="px-3 py-1.5 ps1-button bg-black/35 font-pixel text-[10px]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 ps1-button bg-[#9CC5A1] text-[#17181c] font-pixel text-[10px] font-bold"
              >
                ⇢ CREATE SYMLINK
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collapsible Bottom History & Move Log Bar with Undo */}
      <HistoryDrawer
        pathHistory={pathHistory}
        actionLogs={actionLogs}
        onJumpToFolder={(folderId) => {
          handleNavigateFolder(folderId, activePane);
        }}
        onUndoAction={handleUndoAction}
        onClearLogs={() => {
          playBlip(0.85);
          setActionLogs([]);
        }}
        onPlayBlip={playBlip}
      />

      {/* Command Palette (Cmd/Ctrl + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        files={[...files, ...secondaryFiles]}
        selectedCount={selectedIds.length}
        isSplitPane={isSplitPane}
        currentPathDisplay={getFolderPathString(activeFolderId)}
        onClose={() => setIsCommandPaletteOpen(false)}
        onAutoSortCurrentFolder={() => handleAutoSortFolder(activeFolderId)}
        onBatchRenameSelected={handleBatchRenameSelected}
        onCopyTerminalCd={() => handleCopyCdPath(activeFolderId)}
        onOpenNativeTerminal={() => handleOpenInTerminal(activeFolderId)}
        onToggleSplitPane={() => {
          playBlip(1.15);
          setIsSplitPane((prev) => !prev);
        }}
        onNavigateFolder={(folderId) =>
          handleNavigateFolder(folderId, activePane)
        }
        onSelectAndInspectFile={(file) => {
          handleNavigateFolder(file.parentId, activePane);
          setSelectedIds([file.id]);
          playPaperRustle();
        }}
        onFilterHashtag={(tag) => {
          playBlip(1.15);
          setSearchQuery(tag);
        }}
        onPlayBlip={playBlip}
      />

      <ThemeModal
        isOpen={isThemeModalOpen}
        isElectron={isElectron}
        theme={theme}
        customThemes={customThemes}
        onUpdateTheme={setTheme}
        onSaveCustomTheme={handleSaveCustomTheme}
        onDeleteCustomTheme={handleDeleteCustomTheme}
        onUploadWallpaperFromElectron={handleUploadWallpaperFromElectron}
        onClose={() => {
          playBlip(0.95);
          setIsThemeModalOpen(false);
        }}
        onPlayBlip={playBlip}
      />

      <FolderPfpModal
        folder={pfpModalFolder}
        onClose={() => {
          playBlip(0.95);
          setPfpModalFolderId(null);
        }}
        onSelectFolderPfp={handleSelectFolderPfp}
      />
      </div>
    </div>
  );
};

export default App;
