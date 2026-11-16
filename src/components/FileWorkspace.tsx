import React, { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Folder,
  FolderPlus,
  FilePlus2,
  Search,
  LayoutGrid,
  List as ListIcon,
  HardDrive,
  Pin,
  Edit3,
  Trash2,
  Image as ImageIcon,
  FileText,
  Music,
  Code2,
  Archive,
  Hash,
  Sparkles,
  CheckSquare,
  Columns2,
  Terminal,
  Copy,
  Command,
  UploadCloud,
  Home,
  Monitor,
  Download,
  FolderOpen,
  Link2,
  GitBranch,
  AlertTriangle,
} from 'lucide-react';
import {
  DiskSpaceInfo,
  GitStatusBadge,
  RoomFileItem,
  SpecialOsDir,
  TodoItem,
} from '../types';
import { TodoDrawer } from './TodoDrawer';

interface FileWorkspaceProps {
  isElectron: boolean;
  vimMode: boolean;
  gitBranch: string | null;
  files: RoomFileItem[];
  secondaryFiles?: RoomFileItem[];
  currentFolderId: string | null;
  secondaryFolderId: string | null;
  isSplitPane: boolean;
  activePane: 'primary' | 'secondary';
  selectedIds: string[];
  searchQuery: string;
  viewMode: 'grid' | 'list';
  canGoBack: boolean;
  canGoForward: boolean;
  todos: TodoItem[];
  specialDirs: SpecialOsDir[];
  diskInfo: DiskSpaceInfo;
  toastMessage: string | null;
  onSetActivePane: (pane: 'primary' | 'secondary') => void;
  onNavigateFolder: (folderId: string | null, pane?: 'primary' | 'secondary') => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: (pane?: 'primary' | 'secondary') => void;
  onSelectFile: (fileId: string, multi: boolean) => void;
  onClearSelection: () => void;
  onSearchChange: (q: string) => void;
  onToggleViewMode: () => void;
  onToggleSplitPane: () => void;
  onOpenFolderInSplitPane: (folderId: string | null) => void;
  onOpenCommandPalette: () => void;
  onPickLocalDirectory: () => void;
  onCreateFolder: (targetFolderId: string | null) => void;
  onCreateNote: (targetFolderId: string | null) => void;
  onCreateSymlink: (item: RoomFileItem) => void;
  onCreateHardlink: (item: RoomFileItem) => void;
  onAutoSortFolder: (targetFolderId: string | null) => void;
  onRenameItem: (id: string, newName: string) => void;
  onTrashItems: (ids: string[]) => void;
  onPermanentDeleteItems: (ids: string[]) => void;
  onMoveItem: (itemId: string, targetFolderId: string | null) => void;
  onExternalFilesDrop: (fileList: FileList, targetFolderId: string | null) => void;
  onOpenFolderPfpModal: (folder: RoomFileItem) => void;
  onOpenInTerminal: (folderId: string | null) => void;
  onOpenExternalFile?: (item: RoomFileItem) => void;
  onCopyCdPath: (folderId: string | null) => void;
  onTogglePinFolder: (folder: RoomFileItem) => void;
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onPlayBlip: (pitch?: number) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: RoomFileItem;
}

function renderGitBadge(status?: GitStatusBadge) {
  if (!status) return null;
  const styles: Record<GitStatusBadge, { bg: string; label: string }> = {
    M: { bg: '#E0B85A', label: 'M' },
    U: { bg: '#D8A7B1', label: 'U' },
    A: { bg: '#9CC5A1', label: 'A' },
    D: { bg: '#D96B6B', label: 'D' },
  };
  const cfg = styles[status];
  return (
    <span
      className="px-1 py-0.2 font-pixel text-[8px] text-[#17181c] border border-[#17181c] shrink-0 font-bold"
      style={{ backgroundColor: cfg.bg }}
      title={`Git Status: ${
        status === 'M'
          ? 'Modified'
          : status === 'U'
          ? 'Untracked'
          : status === 'A'
          ? 'Added'
          : 'Deleted'
      }`}
    >
      {cfg.label}
    </span>
  );
}

// Virtualized List Subcomponent using @tanstack/react-virtual for 60fps scrolling
const VirtualizedFileList: React.FC<{
  items: RoomFileItem[];
  paneId: 'primary' | 'secondary';
  isPaneActive: boolean;
  vimMode: boolean;
  focusedIndex: number;
  focusedPath: string | null;
  selectedIds: string[];
  renamingId: string | null;
  renameValue: string;
  dragOverTargetKey: string | null;
  setDragOverTargetKey: (key: string | null) => void;
  startInlineRename: (item: RoomFileItem) => void;
  cancelInlineRename: () => void;
  setRenameValue: (v: string) => void;
  commitInlineRename: (item: RoomFileItem, explicitValue?: string) => void;
  handleInlineRenameBlur: (
    e: React.FocusEvent<HTMLInputElement>,
    item: RoomFileItem
  ) => void;
  onSetActivePane: (p: 'primary' | 'secondary') => void;
  onFocusIndexChange: (idx: number) => void;
  onSelectFile: (id: string, multi: boolean) => void;
  onNavigateFolder: (id: string | null, pane: 'primary' | 'secondary') => void;
  onMoveItem: (id: string, target: string | null) => void;
  onSearchChange: (q: string) => void;
  onOpenInTerminal: (id: string | null) => void;
  onOpenExternalFile: (item: RoomFileItem) => void;
  onOpenFolderPfpModal: (item: RoomFileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: RoomFileItem) => void;
  renderFileTypeIcon: (item: RoomFileItem) => React.ReactNode;
}> = ({
  items,
  paneId,
  isPaneActive,
  vimMode,
  focusedIndex,
  focusedPath,
  selectedIds,
  renamingId,
  renameValue,
  dragOverTargetKey,
  setDragOverTargetKey,
  startInlineRename,
  cancelInlineRename,
  setRenameValue,
  commitInlineRename,
  handleInlineRenameBlur,
  onSetActivePane,
  onFocusIndexChange,
  onSelectFile,
  onNavigateFolder,
  onMoveItem,
  onSearchChange,
  onOpenInTerminal,
  onOpenExternalFile,
  onOpenFolderPfpModal,
  onContextMenu,
  renderFileTypeIcon,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  // Ensure Vim cursor item never scrolls off-screen in Virtualized List View
  useEffect(() => {
    if (!vimMode || !isPaneActive || focusedIndex < 0 || focusedIndex >= items.length) {
      return;
    }
    rowVirtualizer.scrollToIndex(focusedIndex, { align: 'auto' });
    requestAnimationFrame(() => {
      if (!parentRef.current || !focusedPath) return;
      const el = parentRef.current.querySelector(
        `[data-vim-path="${CSS.escape(focusedPath)}"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ block: 'nearest' });
    });
  }, [vimMode, isPaneActive, focusedIndex, focusedPath, items.length, rowVirtualizer]);

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-6 pb-20">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const isSelected = selectedIds.includes(item.id);
          const isVimFocused =
            vimMode && isPaneActive && (focusedPath === item.id || focusedIndex === virtualRow.index);
          const folderDropKey = `folder-list-${paneId}-${item.id}`;
          const isDropTarget =
            item.type === 'folder' && dragOverTargetKey === folderDropKey;

          return (
            <div
              key={item.id}
              data-vim-path={item.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size - 6}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              draggable={renamingId !== item.id}
              onDragStart={(e) => {
                if (renamingId === item.id) {
                  e.preventDefault();
                  return;
                }
                e.stopPropagation();
                e.dataTransfer.setData('text/roombox-file-id', item.id);
              }}
              onDragOver={(e) => {
                if (item.type === 'folder') {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTargetKey(folderDropKey);
                }
              }}
              onDragLeave={() => {
                if (dragOverTargetKey === folderDropKey) {
                  setDragOverTargetKey(null);
                }
              }}
              onDrop={(e) => {
                if (item.type === 'folder') {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTargetKey(null);
                  const draggedId = e.dataTransfer.getData('text/roombox-file-id');
                  if (draggedId && draggedId !== item.id) {
                    onMoveItem(draggedId, item.id);
                  }
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (renamingId === item.id) return;
                onSetActivePane(paneId);
                onFocusIndexChange(virtualRow.index);
                onSelectFile(item.id, e.metaKey || e.ctrlKey || e.shiftKey);
              }}
              onDoubleClick={() => {
                if (renamingId === item.id) return;
                if (item.type === 'folder') {
                  onNavigateFolder(item.id, paneId);
                } else {
                  onOpenExternalFile(item);
                }
              }}
              onContextMenu={(e) => onContextMenu(e, item)}
              className={`ps1-card px-3 py-1.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                isDropTarget
                  ? 'drop-zone-active'
                  : isVimFocused
                  ? 'ring-2 ring-offset-1 ring-[#E0B85A] ring-offset-[#2E323B] outline-dashed outline-2 outline-offset-2 outline-[#D8A7B1] bg-[#E0B85A]/15'
                  : isSelected
                  ? 'ring-2 ring-[var(--accent-primary)] bg-black/35'
                  : 'hover:bg-black/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetActivePane(paneId);
                    onFocusIndexChange(virtualRow.index);
                    onSelectFile(item.id, true);
                  }}
                  className={`p-1 border border-[#17181c] shrink-0 ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-[#17181c]'
                      : 'bg-black/35 hover:bg-black/55'
                  }`}
                  title="Toggle multi-select (Space in Vim Mode)"
                >
                  <CheckSquare className="w-3 h-3" />
                </button>
                {renderFileTypeIcon(item)}
                <div className="min-w-0 flex-1">
                  {renamingId === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        commitInlineRename(item, renameValue);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={(e) => handleInlineRenameBlur(e, item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            commitInlineRename(item, e.currentTarget.value);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            cancelInlineRename();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="px-1.5 py-0.5 text-xs font-mono bg-[#FAF3EB] text-[#17181c] border-2 border-[#17181c] focus:outline-none focus:ring-2 focus:ring-[#D96B6B]"
                      />
                      <button
                        type="submit"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          commitInlineRename(item, renameValue);
                        }}
                        className="px-1.5 py-0.5 ps1-button bg-[#9CC5A1] text-[#17181c] font-pixel text-[8px] font-bold shrink-0"
                        title="Save new name (Enter)"
                      >
                        SAVE
                      </button>
                    </form>
                  ) : (
                    <div className="font-bold text-xs truncate flex items-center gap-1.5">
                      {isVimFocused && (
                        <span className="px-1 py-0.2 bg-[#E0B85A] text-[#17181c] font-pixel text-[8px] border border-[#17181c] shrink-0">
                          VIM ▸
                        </span>
                      )}
                      <span
                        onClick={(e) => {
                          if (isSelected) {
                            e.stopPropagation();
                            startInlineRename(item);
                          }
                        }}
                        onDoubleClick={(e) => {
                          if (isSelected) {
                            e.stopPropagation();
                          }
                        }}
                        title="Click to rename when selected (or press F2)"
                        className="truncate hover:underline"
                      >
                        {item.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetActivePane(paneId);
                          onFocusIndexChange(virtualRow.index);
                          if (!isSelected) {
                            onSelectFile(item.id, false);
                          }
                          startInlineRename(item);
                        }}
                        onDoubleClick={(e) => e.stopPropagation()}
                        className="p-0.5 opacity-60 hover:opacity-100 hover:text-[var(--accent-primary)] shrink-0"
                        title="Rename item (F2)"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {item.isSymlink && (
                        <span
                          className="px-1.5 py-0.2 bg-[#9CC5A1] text-[#17181c] font-pixel text-[8px] border border-[#17181c] shrink-0 font-bold"
                          title={`Symbolic Link ⇢ ${item.symlinkTarget || ''}`}
                        >
                          ⇢ SYM
                        </span>
                      )}
                      {renderGitBadge(item.gitStatus)}
                      {isDropTarget && (
                        <span className="px-2 py-0.5 bg-[#E0B85A] text-[#17181c] font-pixel text-[9px]">
                          Move to [{item.name}]
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] opacity-70 truncate">
                    {item.isSymlink && item.symlinkTarget
                      ? `⇢ Target: ${item.symlinkTarget}`
                      : item.comment || item.permissions || 'Click to inspect'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-1">
                  {item.hashtags.slice(0, 3).map((tag) => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSearchChange(tag);
                      }}
                      className="px-1.5 py-0.5 bg-black/35 hover:bg-[var(--accent-primary)] hover:text-[#17181c] text-[10px] font-mono border border-white/15"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <span className="font-mono text-[11px] opacity-70 w-20 text-right">
                  {item.size}
                </span>
                {item.type === 'folder' && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInTerminal(item.id);
                      }}
                      className="p-1.5 ps1-button bg-black/35 hover:bg-black/55"
                      title="Open in Terminal"
                    >
                      <Terminal className="w-3.5 h-3.5 text-[#E0B85A]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFolderPfpModal(item);
                      }}
                      className="px-2 py-1 ps1-button bg-[var(--accent-secondary)] text-[#17181c] font-pixel text-[9px] font-bold"
                    >
                      PFP
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FileWorkspace: React.FC<FileWorkspaceProps> = ({
  isElectron,
  vimMode,
  gitBranch,
  files,
  secondaryFiles,
  currentFolderId,
  secondaryFolderId,
  isSplitPane,
  activePane,
  selectedIds,
  searchQuery,
  viewMode,
  canGoBack,
  canGoForward,
  todos,
  specialDirs,
  diskInfo,
  toastMessage,
  onSetActivePane,
  onNavigateFolder,
  onGoBack,
  onGoForward,
  onGoUp,
  onSelectFile,
  onClearSelection,
  onSearchChange,
  onToggleViewMode,
  onToggleSplitPane,
  onOpenFolderInSplitPane,
  onOpenCommandPalette,
  onPickLocalDirectory,
  onCreateFolder,
  onCreateNote,
  onCreateSymlink,
  onCreateHardlink,
  onAutoSortFolder,
  onRenameItem,
  onTrashItems,
  onPermanentDeleteItems,
  onMoveItem,
  onExternalFilesDrop,
  onOpenFolderPfpModal,
  onOpenInTerminal,
  onOpenExternalFile,
  onCopyCdPath,
  onTogglePinFolder,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onPlayBlip,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const activeRenamingIdRef = useRef<string | null>(null);
  const renameOpenedAtRef = useRef<number>(0);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [dragOverTargetKey, setDragOverTargetKey] = useState<string | null>(null);
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmPermanentDeleteIds, setConfirmPermanentDeleteIds] = useState<
    string[] | null
  >(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const lastVimKeyRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  const handleOpenExternalFileItem = (item: RoomFileItem) => {
    if (onOpenExternalFile) {
      onOpenExternalFile(item);
    } else if (item.path && window.roomboxElectron) {
      window.roomboxElectron.openExternalFile(item.path);
    }
  };

  const activeFolderId =
    isSplitPane && activePane === 'secondary'
      ? secondaryFolderId
      : currentFolderId;

  // Compute visible items for active pane (used by keyboard & Vim navigation)
  const activePaneVisibleItems = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const sourceList =
      isElectron && activePane === 'secondary' && secondaryFiles
        ? secondaryFiles
        : files;

    return sourceList
      .filter((item) => {
        if (normalizedQuery) {
          const matchesName = item.name.toLowerCase().includes(normalizedQuery);
          const matchesComment = item.comment
            .toLowerCase()
            .includes(normalizedQuery);
          const matchesTag = item.hashtags.some((t) =>
            t.toLowerCase().includes(normalizedQuery)
          );
          return matchesName || matchesComment || matchesTag;
        }
        if (isElectron) return true;
        return item.parentId === activeFolderId;
      })
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [
    files,
    secondaryFiles,
    isElectron,
    activePane,
    activeFolderId,
    searchQuery,
  ]);

  // Keep focusedIndex clamped to activePaneVisibleItems and sync when folder changes
  const clampedFocusedIndex =
    activePaneVisibleItems.length > 0
      ? Math.min(Math.max(0, focusedIndex), activePaneVisibleItems.length - 1)
      : -1;
  const focusedItem =
    clampedFocusedIndex >= 0
      ? activePaneVisibleItems[clampedFocusedIndex]
      : null;
  const focusedPath = vimMode && focusedItem ? focusedItem.id : null;

  useEffect(() => {
    setFocusedIndex(0);
  }, [activeFolderId, activePane]);

  // Ensure focused item in Grid View scrolls into view on every j/k/gg/G step
  useEffect(() => {
    if (!vimMode || viewMode !== 'grid' || !focusedPath || !gridContainerRef.current) {
      return;
    }
    const el = gridContainerRef.current.querySelector(
      `[data-vim-path="${CSS.escape(focusedPath)}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [vimMode, viewMode, clampedFocusedIndex, focusedPath]);

  const startInlineRename = (item: RoomFileItem) => {
    renameOpenedAtRef.current = Date.now();
    activeRenamingIdRef.current = item.id;
    setRenamingId(item.id);
    setRenameValue(item.name);
  };

  const cancelInlineRename = () => {
    activeRenamingIdRef.current = null;
    setRenamingId(null);
  };

  const commitInlineRename = (item: RoomFileItem, explicitValue?: string) => {
    if (activeRenamingIdRef.current !== item.id) return;
    activeRenamingIdRef.current = null;
    const raw = explicitValue !== undefined ? explicitValue : renameValue;
    const trimmed = raw.trim();
    setRenamingId(null);
    if (trimmed !== item.name) {
      onRenameItem(item.id, trimmed);
    }
  };

  const handleInlineRenameBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    item: RoomFileItem
  ) => {
    if (Date.now() - renameOpenedAtRef.current < 220) {
      const inputEl = e.currentTarget;
      requestAnimationFrame(() => {
        if (activeRenamingIdRef.current === item.id) {
          inputEl.focus();
          inputEl.select();
        }
      });
      return;
    }
    commitInlineRename(item, e.currentTarget.value);
  };

  // Global keyboard shortcuts: F2, Shift+Delete (Permanent Delete), and Vim Motions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      // F2 Inline Rename
      if (e.key === 'F2') {
        const targetId =
          selectedIds.length === 1
            ? selectedIds[0]
            : vimMode && focusedItem
            ? focusedItem.id
            : null;
        if (targetId) {
          e.preventDefault();
          const allItems = [...files, ...(secondaryFiles || [])];
          const target = allItems.find((f) => f.id === targetId);
          if (target) {
            startInlineRename(target);
          }
        }
        return;
      }

      // Shift+Delete -> Permanent Delete Confirmation Modal
      if (e.key === 'Delete' && e.shiftKey && selectedIds.length > 0) {
        e.preventDefault();
        onPlayBlip(0.85);
        setConfirmPermanentDeleteIds(selectedIds);
        return;
      }

      // Standard Delete -> Safe Trash
      if (e.key === 'Delete' && !e.shiftKey && selectedIds.length > 0) {
        e.preventDefault();
        onTrashItems(selectedIds);
        return;
      }

      // Vim Motions when VIM: ON
      if (!vimMode) return;

      const now = performance.now();
      const prev = lastVimKeyRef.current;
      const isDoubleKey = (k: string) => prev.key === k && now - prev.time < 420;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (activePaneVisibleItems.length === 0) return;
        const baseIdx = clampedFocusedIndex >= 0 ? clampedFocusedIndex : 0;
        const nextIdx = Math.min(activePaneVisibleItems.length - 1, baseIdx + 1);
        setFocusedIndex(nextIdx);
        onSelectFile(activePaneVisibleItems[nextIdx].id, false);
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (activePaneVisibleItems.length === 0) return;
        const baseIdx = clampedFocusedIndex >= 0 ? clampedFocusedIndex : 0;
        const prevIdx = Math.max(0, baseIdx - 1);
        setFocusedIndex(prevIdx);
        onSelectFile(activePaneVisibleItems[prevIdx].id, false);
        return;
      }

      if (e.key === 'G') {
        e.preventDefault();
        if (activePaneVisibleItems.length > 0) {
          const lastIdx = activePaneVisibleItems.length - 1;
          setFocusedIndex(lastIdx);
          onSelectFile(activePaneVisibleItems[lastIdx].id, false);
        }
        return;
      }

      if (e.key === 'g') {
        if (isDoubleKey('g')) {
          e.preventDefault();
          if (activePaneVisibleItems.length > 0) {
            setFocusedIndex(0);
            onSelectFile(activePaneVisibleItems[0].id, false);
          }
          lastVimKeyRef.current = { key: '', time: 0 };
        } else {
          lastVimKeyRef.current = { key: 'g', time: now };
        }
        return;
      }

      // Space toggles multi-select checkbox on the currently focused item
      if (e.key === ' ') {
        e.preventDefault();
        if (focusedItem) {
          onSelectFile(focusedItem.id, true);
        }
        return;
      }

      // Enter or l opens the currently focused item
      if (e.key === 'Enter' || e.key === 'l') {
        const target =
          focusedItem ||
          (selectedIds.length === 1
            ? activePaneVisibleItems.find((i) => i.id === selectedIds[0])
            : null);
        if (target) {
          e.preventDefault();
          if (target.type === 'folder') {
            onNavigateFolder(target.id, activePane);
          } else {
            onSelectFile(target.id, false);
            handleOpenExternalFileItem(target);
          }
        }
        return;
      }

      // h, Backspace, or - goes up to parent directory
      if (e.key === 'h' || e.key === 'Backspace' || e.key === '-') {
        e.preventDefault();
        onGoUp(activePane);
        return;
      }

      if (e.key === 'd') {
        const targetIds =
          selectedIds.length > 0
            ? selectedIds
            : focusedItem
            ? [focusedItem.id]
            : [];
        if (isDoubleKey('d') && targetIds.length > 0) {
          e.preventDefault();
          onTrashItems(targetIds);
          lastVimKeyRef.current = { key: '', time: 0 };
        } else {
          lastVimKeyRef.current = { key: 'd', time: now };
        }
        return;
      }

      if (e.key === 'D') {
        const targetIds =
          selectedIds.length > 0
            ? selectedIds
            : focusedItem
            ? [focusedItem.id]
            : [];
        if (targetIds.length > 0) {
          e.preventDefault();
          onPlayBlip(0.85);
          setConfirmPermanentDeleteIds(targetIds);
        }
        return;
      }

      if (e.key === 'y') {
        const targetId = selectedIds[0] || focusedItem?.id;
        if (isDoubleKey('y') && targetId) {
          e.preventDefault();
          onCopyCdPath(targetId);
          lastVimKeyRef.current = { key: '', time: 0 };
        } else {
          lastVimKeyRef.current = { key: 'y', time: now };
        }
        return;
      }
    };

    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [
    vimMode,
    viewMode,
    selectedIds,
    clampedFocusedIndex,
    focusedItem,
    files,
    secondaryFiles,
    activePaneVisibleItems,
    activePane,
    onSelectFile,
    onNavigateFolder,
    onGoUp,
    onTrashItems,
    onCopyCdPath,
    onPlayBlip,
  ]);

  const buildBreadcrumbs = (folderId: string | null) => {
    if (isElectron && folderId && folderId.startsWith('/')) {
      const segments = folderId.split('/').filter(Boolean);
      const crumbs: { id: string | null; name: string }[] = [];
      let accum = '';
      for (const seg of segments) {
        accum += `/${seg}`;
        crumbs.push({ id: accum, name: seg });
      }
      return crumbs.slice(-4);
    }

    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: 'RoomBox_Root' },
    ];
    if (folderId) {
      const chain: { id: string | null; name: string }[] = [];
      let cursor = files.find((f) => f.id === folderId);
      while (cursor) {
        chain.unshift({ id: cursor.id, name: cursor.name });
        cursor = cursor.parentId
          ? files.find((f) => f.id === cursor!.parentId)
          : undefined;
      }
      crumbs.push(...chain);
    }
    return crumbs;
  };

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return 'RoomBox_Root';
    if (isElectron && folderId.includes('/')) {
      return folderId.split('/').filter(Boolean).pop() || folderId;
    }
    return files.find((f) => f.id === folderId)?.name || folderId;
  };

  const pinnedFolders = files.filter(
    (f) => f.type === 'folder' && (f.pinned || (!isElectron && f.parentId === null))
  );

  const allHashtags = Array.from(
    new Set(files.flatMap((f) => f.hashtags))
  ).slice(0, 7);

  const renderSpecialDirIcon = (key: SpecialOsDir['key']) => {
    switch (key) {
      case 'home':
        return <Home className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />;
      case 'desktop':
        return <Monitor className="w-3.5 h-3.5 shrink-0 text-[var(--accent-secondary)]" />;
      case 'downloads':
        return <Download className="w-3.5 h-3.5 shrink-0 text-[#9CC5A1]" />;
      case 'pictures':
        return <ImageIcon className="w-3.5 h-3.5 shrink-0 text-[#E0B85A]" />;
      default:
        return <Folder className="w-3.5 h-3.5 shrink-0 text-[var(--accent-primary)]" />;
    }
  };

  const renderFileTypeIcon = (item: RoomFileItem) => {
    if (item.type === 'folder') {
      return item.folderPfp ? (
        <div className="relative w-12 h-12 border-2 border-[#17181c] bg-black/40 overflow-hidden shrink-0">
          <img
            src={item.folderPfp}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="absolute bottom-0 right-0 px-1 bg-[#17181c]/90 text-[#EAE6DF] font-pixel text-[8px]">
            DIR
          </span>
        </div>
      ) : (
        <div className="w-12 h-12 border-2 border-[#17181c] bg-black/25 flex items-center justify-center shrink-0">
          <Folder className="w-6 h-6 text-[var(--accent-primary)]" />
        </div>
      );
    }
    if (item.type === 'image' && item.imageUrl) {
      return (
        <div className="w-12 h-12 border-2 border-[#17181c] bg-black/40 overflow-hidden shrink-0">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      );
    }
    if (item.type === 'audio') {
      return (
        <div className="w-12 h-12 border-2 border-[#17181c] bg-[#26222E] flex items-center justify-center shrink-0">
          <Music className="w-5 h-5 text-[var(--accent-primary)]" />
        </div>
      );
    }
    if (item.type === 'code') {
      return (
        <div className="w-12 h-12 border-2 border-[#17181c] bg-[#1E242B] flex items-center justify-center shrink-0">
          <Code2 className="w-5 h-5 text-[#8BB8D6]" />
        </div>
      );
    }
    if (item.type === 'archive') {
      return (
        <div className="w-12 h-12 border-2 border-[#17181c] bg-[#2D261E] flex items-center justify-center shrink-0">
          <Archive className="w-5 h-5 text-[#E0B85A]" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 border-2 border-[#17181c] bg-[#FAF3EB] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-[#221E26]" />
      </div>
    );
  };

  const renderDirectoryPane = (
    paneId: 'primary' | 'secondary',
    paneFolderId: string | null
  ) => {
    const isPaneActive = !isSplitPane || activePane === paneId;
    const crumbs = buildBreadcrumbs(paneFolderId);
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const sourceList =
      isElectron && paneId === 'secondary' && secondaryFiles
        ? secondaryFiles
        : files;

    const paneItems = sourceList
      .filter((item) => {
        if (normalizedQuery && isPaneActive) {
          const matchesName = item.name.toLowerCase().includes(normalizedQuery);
          const matchesComment = item.comment
            .toLowerCase()
            .includes(normalizedQuery);
          const matchesTag = item.hashtags.some((t) =>
            t.toLowerCase().includes(normalizedQuery)
          );
          return matchesName || matchesComment || matchesTag;
        }
        if (isElectron) return true;
        return item.parentId === paneFolderId;
      })
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });

    const paneDropKey = `pane-bg-${paneId}`;

    return (
      <div
        key={paneId}
        onClick={() => {
          onSetActivePane(paneId);
          onClearSelection();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (
            e.dataTransfer.types.includes('Files') &&
            !e.dataTransfer.types.includes('text/roombox-file-id')
          ) {
            setIsExternalDragOver(true);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsExternalDragOver(false);
          setDragOverTargetKey(null);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onExternalFilesDrop(e.dataTransfer.files, paneFolderId);
            return;
          }
          const draggedId = e.dataTransfer.getData('text/roombox-file-id');
          if (draggedId) {
            onMoveItem(draggedId, paneFolderId);
          }
        }}
        className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-colors ${
          isSplitPane && paneId === 'secondary'
            ? 'border-l-2 border-[#17181c]'
            : ''
        } ${isSplitPane && isPaneActive ? 'bg-black/10' : ''}`}
      >
        {/* Pane Header: Breadcrumbs + Git Repo Branch Pill + Native Terminal & Copy cd */}
        <div
          className="px-4 py-2 bg-black/20 border-b border-[#17181c] flex items-center justify-between gap-2"
          onClick={(e) => {
            e.stopPropagation();
            onSetActivePane(paneId);
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto">
            {isSplitPane && (
              <span
                className={`px-1.5 py-0.5 font-pixel text-[9px] border border-[#17181c] shrink-0 ${
                  isPaneActive
                    ? 'bg-[var(--accent-primary)] text-[#17181c] font-bold'
                    : 'bg-black/30 opacity-60'
                }`}
              >
                {paneId === 'primary' ? 'PANE A' : 'PANE B'}
              </span>
            )}

            <button
              onClick={() => onGoUp(paneId)}
              disabled={paneFolderId === null}
              className="p-1 ps1-button bg-black/30 disabled:opacity-35 hover:bg-black/50 shrink-0"
              title="Up one folder level"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-0.5">
              {crumbs.map((crumb, idx) => {
                const crumbKey = `crumb-${paneId}-${crumb.id ?? 'root'}`;
                const isDropHover = dragOverTargetKey === crumbKey;
                return (
                  <React.Fragment key={crumbKey}>
                    {idx > 0 && <span className="opacity-40">/</span>}
                    <button
                      onClick={() => onNavigateFolder(crumb.id, paneId)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverTargetKey(crumbKey);
                      }}
                      onDragLeave={() => {
                        if (dragOverTargetKey === crumbKey) {
                          setDragOverTargetKey(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverTargetKey(null);
                        const draggedId = e.dataTransfer.getData(
                          'text/roombox-file-id'
                        );
                        if (draggedId && draggedId !== crumb.id) {
                          onMoveItem(draggedId, crumb.id);
                        }
                      }}
                      className={`px-2 py-0.5 rounded transition-all flex items-center gap-1.5 shrink-0 ${
                        isDropHover
                          ? 'drop-zone-active font-bold text-white'
                          : idx === crumbs.length - 1
                          ? 'font-bold text-[var(--accent-primary)] bg-black/25 border border-white/10'
                          : 'opacity-80 hover:bg-black/30'
                      }`}
                    >
                      <span>{crumb.name}</span>
                      {isDropHover && (
                        <span className="px-1.5 py-0.2 bg-[#E0B85A] text-[#17181c] font-pixel text-[9px]">
                          Move to [{crumb.name}]
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Git Branch Status Indicator */}
            {gitBranch && (
              <span
                className="ml-1 px-2 py-0.5 bg-black/40 border border-white/15 font-mono text-[10px] text-[#9CC5A1] flex items-center gap-1 shrink-0"
                title="Git Repository Active"
              >
                <GitBranch className="w-3 h-3" />
                <span>{gitBranch}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onOpenInTerminal(paneFolderId)}
              className="px-2 py-1 ps1-button bg-black/35 hover:bg-black/55 font-pixel text-[9px] flex items-center gap-1"
              title="Open this directory in your native OS Terminal"
            >
              <Terminal className="w-3 h-3 text-[#E0B85A]" />
              <span className="hidden md:inline">OPEN IN TERMINAL</span>
            </button>
            <button
              onClick={() => onCopyCdPath(paneFolderId)}
              className="px-2 py-1 ps1-button bg-black/35 hover:bg-black/55 font-pixel text-[9px] flex items-center gap-1"
              title="Copy terminal cd command"
            >
              <Copy className="w-3 h-3 text-[#9CC5A1]" />
              <span className="hidden md:inline">COPY `cd`</span>
            </button>
          </div>
        </div>

        {/* Main Scrollable File Area */}
        {paneItems.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="h-52 ps1-card p-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto my-8">
              <Folder className="w-9 h-9 text-[var(--accent-primary)] mb-2 opacity-75" />
              <div className="font-pixel text-xs uppercase mb-1">
                CLEAN DIRECTORY
              </div>
              <p className="text-xs opacity-75 mb-3">
                {searchQuery && isPaneActive
                  ? `No files or #hashtags match "${searchQuery}".`
                  : 'Drag files here or create a new folder/note.'}
              </p>
              {searchQuery && isPaneActive && (
                <button
                  onClick={() => onSearchChange('')}
                  className="px-3 py-1 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold"
                >
                  CLEAR FILTER
                </button>
              )}
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* 60FPS Virtualized List View via @tanstack/react-virtual */
          <VirtualizedFileList
            items={paneItems}
            paneId={paneId}
            isPaneActive={isPaneActive}
            vimMode={vimMode}
            focusedIndex={clampedFocusedIndex}
            focusedPath={focusedPath}
            selectedIds={selectedIds}
            renamingId={renamingId}
            renameValue={renameValue}
            dragOverTargetKey={dragOverTargetKey}
            setDragOverTargetKey={setDragOverTargetKey}
            startInlineRename={startInlineRename}
            cancelInlineRename={cancelInlineRename}
            setRenameValue={setRenameValue}
            commitInlineRename={commitInlineRename}
            handleInlineRenameBlur={handleInlineRenameBlur}
            onSetActivePane={onSetActivePane}
            onFocusIndexChange={setFocusedIndex}
            onSelectFile={onSelectFile}
            onNavigateFolder={onNavigateFolder}
            onMoveItem={onMoveItem}
            onSearchChange={onSearchChange}
            onOpenInTerminal={onOpenInTerminal}
            onOpenExternalFile={handleOpenExternalFileItem}
            onOpenFolderPfpModal={onOpenFolderPfpModal}
            onContextMenu={(e, item) => {
              e.preventDefault();
              e.stopPropagation();
              onPlayBlip(1.05);
              setContextMenu({ x: e.clientX, y: e.clientY, item });
            }}
            renderFileTypeIcon={renderFileTypeIcon}
          />
        ) : (
          /* Grid View */
          <div
            ref={isPaneActive ? gridContainerRef : undefined}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverTargetKey === null) {
                setDragOverTargetKey(paneDropKey);
              }
            }}
            onDragLeave={(e) => {
              if (
                e.currentTarget === e.target &&
                dragOverTargetKey === paneDropKey
              ) {
                setDragOverTargetKey(null);
              }
            }}
            className="flex-1 overflow-y-auto p-6 pb-20 relative"
          >
            {dragOverTargetKey === paneDropKey && (
              <div className="mb-4 p-2.5 drop-zone-active flex items-center justify-center gap-2 font-pixel text-xs">
                <span>Move to [{getFolderName(paneFolderId)}]</span>
              </div>
            )}

            <div
              className={`grid gap-4 ${
                isSplitPane
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
              }`}
            >
              {paneItems.map((item, idx) => {
                const isSelected = selectedIds.includes(item.id);
                const isVimFocused =
                  vimMode &&
                  isPaneActive &&
                  (focusedPath === item.id || clampedFocusedIndex === idx);
                const folderDropKey = `folder-${paneId}-${item.id}`;
                const isDropTarget =
                  item.type === 'folder' && dragOverTargetKey === folderDropKey;

                return (
                  <div
                    key={item.id}
                    data-vim-path={item.id}
                    draggable={renamingId !== item.id}
                    onDragStart={(e) => {
                      if (renamingId === item.id) {
                        e.preventDefault();
                        return;
                      }
                      e.stopPropagation();
                      e.dataTransfer.setData('text/roombox-file-id', item.id);
                      if (e.altKey && item.path && window.roomboxElectron) {
                        window.roomboxElectron.startNativeDrag(item.path);
                      }
                    }}
                    onDragOver={(e) => {
                      if (item.type === 'folder') {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverTargetKey(folderDropKey);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (item.type === 'folder') {
                        e.stopPropagation();
                        if (dragOverTargetKey === folderDropKey) {
                          setDragOverTargetKey(null);
                        }
                      }
                    }}
                    onDrop={(e) => {
                      if (item.type === 'folder') {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverTargetKey(null);
                        if (
                          e.dataTransfer.files &&
                          e.dataTransfer.files.length > 0
                        ) {
                          onExternalFilesDrop(e.dataTransfer.files, item.id);
                          return;
                        }
                        const draggedId = e.dataTransfer.getData(
                          'text/roombox-file-id'
                        );
                        if (draggedId && draggedId !== item.id) {
                          onMoveItem(draggedId, item.id);
                        }
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (renamingId === item.id) return;
                      onSetActivePane(paneId);
                      setFocusedIndex(idx);
                      onSelectFile(
                        item.id,
                        e.metaKey || e.ctrlKey || e.shiftKey
                      );
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (renamingId === item.id) return;
                      if (item.type === 'folder') {
                        onNavigateFolder(item.id, paneId);
                      } else {
                        handleOpenExternalFileItem(item);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPlayBlip(1.05);
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        item,
                      });
                    }}
                    className={`group relative ps1-card p-3 flex flex-col justify-between cursor-pointer transition-all ${
                      isDropTarget
                        ? 'drop-zone-active scale-[1.03]'
                        : isVimFocused
                        ? 'ring-2 ring-offset-1 ring-[#E0B85A] ring-offset-[#2E323B] outline-dashed outline-2 outline-offset-2 outline-[#D8A7B1] bg-[#E0B85A]/15'
                        : isSelected
                        ? 'ring-2 ring-[var(--accent-primary)] bg-black/35'
                        : 'hover:bg-black/20 hover:-translate-y-0.5'
                    }`}
                  >
                    {isDropTarget && (
                      <div className="absolute inset-x-1 top-1 z-20 px-2 py-1 bg-[#E0B85A] text-[#17181c] border-2 border-[#17181c] font-pixel text-[10px] font-bold text-center shadow-lg">
                        Move to [{item.name}]
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="relative">
                        {renderFileTypeIcon(item)}
                        {/* Low-Clutter Git Status & Symlink Badges */}
                        <div className="absolute -top-1.5 -right-2 flex items-center gap-0.5">
                          {item.isSymlink && (
                            <span
                              className="px-1 py-0.2 bg-[#9CC5A1] text-[#17181c] font-pixel text-[8px] border border-[#17181c] font-bold"
                              title={`Symbolic Link ⇢ ${item.symlinkTarget || ''}`}
                            >
                              ⇢ SYM
                            </span>
                          )}
                          {renderGitBadge(item.gitStatus)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {isVimFocused && (
                          <span className="px-1 py-0.5 bg-[#E0B85A] text-[#17181c] font-pixel text-[8px] border border-[#17181c] font-bold">
                            VIM ▸
                          </span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.type === 'folder' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenInTerminal(item.id);
                                }}
                                className="p-1 ps1-button bg-black/45 hover:bg-black/75"
                                title="Open Folder in Native Terminal"
                              >
                                <Terminal className="w-3 h-3 text-[#E0B85A]" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenFolderPfpModal(item);
                                }}
                                className="px-1.5 py-0.5 ps1-button bg-[var(--accent-secondary)] text-[#17181c] font-pixel text-[9px] font-bold flex items-center gap-0.5"
                                title="Customize Folder PFP Cover"
                              >
                                <ImageIcon className="w-2.5 h-2.5" />
                                <span>PFP</span>
                              </button>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetActivePane(paneId);
                            setFocusedIndex(idx);
                            onSelectFile(item.id, true);
                          }}
                          className={`p-1 border border-[#17181c] ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] text-[#17181c]'
                              : 'bg-black/40 opacity-60 group-hover:opacity-100'
                          }`}
                          title="Multi-select item (Space in Vim Mode)"
                        >
                          <CheckSquare className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-1.5">
                      {renamingId === item.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            commitInlineRename(item, renameValue);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onFocus={(e) => e.currentTarget.select()}
                            onBlur={(e) => handleInlineRenameBlur(e, item)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                commitInlineRename(item, e.currentTarget.value);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                cancelInlineRename();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => e.stopPropagation()}
                            className="w-full min-w-0 px-1.5 py-0.5 text-xs font-mono bg-[#FAF3EB] text-[#17181c] border-2 border-[#17181c] focus:outline-none focus:ring-2 focus:ring-[#D96B6B]"
                          />
                          <button
                            type="submit"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              commitInlineRename(item, renameValue);
                            }}
                            className="px-1.5 py-0.5 ps1-button bg-[#9CC5A1] text-[#17181c] font-pixel text-[8px] font-bold shrink-0"
                            title="Save new name (Enter)"
                          >
                            ✓
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <div
                            onClick={(e) => {
                              if (isSelected) {
                                e.stopPropagation();
                                startInlineRename(item);
                              }
                            }}
                            onDoubleClick={(e) => {
                              if (isSelected) {
                                e.stopPropagation();
                              }
                            }}
                            className="font-semibold text-xs truncate hover:underline min-w-0 flex-1"
                            title="Click to rename when selected (or press F2)"
                          >
                            {item.name}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetActivePane(paneId);
                              setFocusedIndex(idx);
                              if (!isSelected) {
                                onSelectFile(item.id, false);
                              }
                              startInlineRename(item);
                            }}
                            onDoubleClick={(e) => e.stopPropagation()}
                            className="p-0.5 opacity-60 hover:opacity-100 hover:text-[var(--accent-primary)] shrink-0"
                            title="Rename item (F2)"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-[10px] font-mono opacity-60 flex items-center justify-between mt-0.5">
                        <span className="truncate">
                          {item.isSymlink ? `⇢ ${item.size}` : item.size}
                        </span>
                        {item.folderStickerLabel && (
                          <span className="text-[9px] text-[var(--accent-primary)] shrink-0">
                            [{item.folderStickerLabel}]
                          </span>
                        )}
                      </div>
                    </div>

                    {item.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-white/10">
                        {item.hashtags.slice(0, 3).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSearchChange(tag);
                            }}
                            className="px-1.5 py-0.2 bg-black/35 hover:bg-[var(--accent-primary)] hover:text-[#17181c] text-[9px] font-mono border border-white/15 truncate"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
      {/* Full-Zone External Desktop File Drop Overlay */}
      {isExternalDragOver && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setIsExternalDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsExternalDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              onExternalFilesDrop(e.dataTransfer.files, activeFolderId);
            }
          }}
          className="fixed inset-4 z-50 drop-zone-active bg-black/80 flex flex-col items-center justify-center p-8 text-center pointer-events-auto"
        >
          <UploadCloud className="w-14 h-14 text-[var(--accent-primary)] mb-3 animate-bounce" />
          <div className="font-pixel text-base text-[#EAE6DF] mb-1">
            DROP OS FILES TO MOVE/IMPORT INTO [{getFolderName(activeFolderId)}]
          </div>
          <p className="text-xs font-mono opacity-80">
            Release mouse to place files directly into {getFolderName(activeFolderId)}
          </p>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal (Shift+Delete) */}
      {confirmPermanentDeleteIds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setConfirmPermanentDeleteIds(null)}
        >
          <div
            className="w-full max-w-md ps1-panel p-4 relative masking-tape-top-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b-2 border-[#17181c] pb-2 mb-3 text-[#D96B6B]">
              <AlertTriangle className="w-4 h-4" />
              <h3 className="font-pixel text-xs uppercase font-bold">
                PERMANENT DELETE // BYPASS OS TRASH
              </h3>
            </div>
            <p className="text-xs leading-relaxed mb-4 opacity-90">
              Permanently delete{' '}
              <span className="font-bold text-[var(--accent-primary)]">
                {confirmPermanentDeleteIds.length} item(s)
              </span>{' '}
              from disk? Unlike <code className="px-1 bg-black/35">Move to Trash</code>,
              this action cannot be undone from the Recycle Bin.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmPermanentDeleteIds(null)}
                className="px-3 py-1.5 ps1-button bg-black/35 font-pixel text-[10px]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  onPermanentDeleteItems(confirmPermanentDeleteIds);
                  setConfirmPermanentDeleteIds(null);
                }}
                className="px-3.5 py-1.5 ps1-button bg-[#D96B6B] text-[#17181c] font-pixel text-[10px] font-bold"
              >
                PERMANENTLY DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGATION & SEARCH TOP BAR */}
      <header className="ps1-panel px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 z-20 border-t-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className="p-1.5 ps1-button bg-black/30 disabled:opacity-35 hover:bg-black/50"
              title="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              className="p-1.5 ps1-button bg-black/30 disabled:opacity-35 hover:bg-black/50"
              title="Forward"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onOpenCommandPalette}
            className="px-2.5 py-1 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1.5 hover:brightness-105"
            title="Open Command Palette (Cmd/Ctrl + K)"
          >
            <Command className="w-3.5 h-3.5" />
            <span>COMMAND PALETTE</span>
            <kbd className="px-1 py-0.2 bg-[#17181c] text-[#EAE6DF] font-mono text-[9px]">
              ⌘K
            </kbd>
          </button>

          {vimMode && (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#9CC5A1]/15 border border-[#9CC5A1]/40 text-[#9CC5A1] font-mono text-[10px]">
              <span>VIM: j/k/h/l • gg/G • Enter/l (Open) • Space (Select) • yy • dd • Shift+D</span>
            </span>
          )}
        </div>

        {/* Instant Search Bar */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search filenames, comments, or #hashtags... (Press / in Vim)"
            className="w-full pl-8 pr-6 py-1 text-xs font-mono bg-black/35 border border-[#17181c] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/45 focus:outline-none focus:border-[var(--accent-primary)]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-70 hover:opacity-100"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSplitPane}
            className={`px-2.5 py-1 ps1-button font-pixel text-[10px] flex items-center gap-1.5 ${
              isSplitPane
                ? 'bg-[var(--accent-secondary)] text-[#17181c] font-bold'
                : 'bg-black/30 hover:bg-black/50'
            }`}
            title="Toggle Side-by-Side Split-Pane Mode"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>SPLIT-PANE</span>
          </button>

          <button
            onClick={onToggleViewMode}
            className="px-2.5 py-1 ps1-button bg-black/30 hover:bg-black/50 font-pixel text-[10px] flex items-center gap-1"
            title="Toggle Grid / Virtualized 60fps List View"
          >
            {viewMode === 'grid' ? (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>GRID</span>
              </>
            ) : (
              <>
                <ListIcon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>60FPS LIST</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed bottom-12 right-5 z-40 px-3.5 py-2 ps1-card masking-tape-top-left bg-[#FAF3EB] text-[#17181c] font-mono text-xs shadow-lg flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#D96B6B]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BODY: Left OS Sidebar + Main Workspace */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-[244px] shrink-0 ps1-panel p-3 flex flex-col justify-between overflow-y-auto border-t-0">
          <div className="space-y-3">
            <div className="p-2.5 bg-black/25 border border-[#17181c] space-y-2">
              <button
                onClick={onPickLocalDirectory}
                className="w-full py-1.5 px-2.5 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center justify-center gap-1.5 hover:brightness-105"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>OPEN DIRECTORY...</span>
              </button>

              <div>
                <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-1">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span>DISK FREE</span>
                  </span>
                  <span className="text-[var(--accent-primary)] font-bold">
                    {diskInfo.freeFormatted}
                  </span>
                </div>
                <div className="w-full h-2 bg-black/50 border border-[#17181c] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)] transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(8, diskInfo.usedPercent))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Real OS User Directories */}
            <div>
              <div className="px-1 mb-1.5 font-pixel text-[10px] uppercase tracking-wider opacity-75">
                OS DIRECTORIES
              </div>
              <div className="space-y-1">
                {specialDirs.map((dir) => {
                  const isActive = activeFolderId === dir.path;
                  const dropKey = `osdir-${dir.key}`;
                  const isDropHover = dragOverTargetKey === dropKey;

                  return (
                    <button
                      key={dir.key}
                      onClick={() => onNavigateFolder(dir.path, activePane)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTargetKey(dropKey);
                      }}
                      onDragLeave={() => {
                        if (dragOverTargetKey === dropKey) {
                          setDragOverTargetKey(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTargetKey(null);
                        const draggedId = e.dataTransfer.getData(
                          'text/roombox-file-id'
                        );
                        if (draggedId && draggedId !== dir.path) {
                          onMoveItem(draggedId, dir.path);
                        }
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs font-mono flex items-center justify-between gap-1.5 border border-[#17181c] transition-all ${
                        isDropHover
                          ? 'drop-zone-active font-bold'
                          : isActive
                          ? 'bg-[var(--accent-primary)] text-[#17181c] font-bold'
                          : 'bg-black/20 hover:bg-black/35'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {renderSpecialDirIcon(dir.key)}
                        <span className="truncate">{dir.name}</span>
                      </div>
                      {isDropHover && (
                        <span className="px-1 bg-[#E0B85A] text-[#17181c] font-pixel text-[8px] shrink-0">
                          Move to {dir.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pinned / Favorite Folders */}
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="font-pixel text-[10px] uppercase tracking-wider opacity-75 flex items-center gap-1">
                  <Pin className="w-3 h-3 text-[var(--accent-primary)]" />
                  <span>PINNED FOLDERS</span>
                </span>
              </div>

              <div className="space-y-1">
                {pinnedFolders.map((folder) => {
                  const isActive = activeFolderId === folder.id;
                  const favDropKey = `sidebar-${folder.id}`;
                  const isDropHover = dragOverTargetKey === favDropKey;

                  return (
                    <button
                      key={folder.id}
                      onClick={() => onNavigateFolder(folder.id, activePane)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTargetKey(favDropKey);
                      }}
                      onDragLeave={() => {
                        if (dragOverTargetKey === favDropKey) {
                          setDragOverTargetKey(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverTargetKey(null);
                        const draggedId = e.dataTransfer.getData(
                          'text/roombox-file-id'
                        );
                        if (draggedId && draggedId !== folder.id) {
                          onMoveItem(draggedId, folder.id);
                        }
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs font-mono flex items-center justify-between gap-1.5 border border-[#17181c] transition-all ${
                        isDropHover
                          ? 'drop-zone-active font-bold'
                          : isActive
                          ? 'bg-[var(--accent-primary)] text-[#17181c] font-bold'
                          : 'bg-black/20 hover:bg-black/35'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {folder.folderPfp ? (
                          <img
                            src={folder.folderPfp}
                            alt=""
                            className="w-4 h-4 object-cover border border-[#17181c] shrink-0"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <Folder className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">{folder.name}</span>
                      </div>
                      {isDropHover && (
                        <span className="px-1 bg-[#E0B85A] text-[#17181c] font-pixel text-[8px] shrink-0">
                          Move to {folder.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <TodoDrawer
            todos={todos}
            onAddTodo={onAddTodo}
            onToggleTodo={onToggleTodo}
            onDeleteTodo={onDeleteTodo}
            onPlayBlip={onPlayBlip}
          />
        </aside>

        {/* CENTER WORKSPACE */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div
            className="px-4 py-2 bg-black/25 border-b-2 border-[#17181c] flex flex-wrap items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => onCreateFolder(activeFolderId)}
                className="px-2.5 py-1 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>NEW FOLDER</span>
              </button>
              <button
                onClick={() => onCreateNote(activeFolderId)}
                className="px-2.5 py-1 ps1-button bg-black/35 hover:bg-black/55 font-pixel text-[10px] flex items-center gap-1"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                <span>NEW NOTE</span>
              </button>
              <button
                onClick={() => onAutoSortFolder(activeFolderId)}
                className="px-2.5 py-1 ps1-button bg-black/35 hover:bg-black/55 font-pixel text-[10px] flex items-center gap-1"
                title="Automatically creates Images/, Documents/, Audio/, Archives/ subfolders and moves files into them"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E0B85A]" />
                <span>AUTO-SORT BY TYPE</span>
              </button>

              {selectedIds.length === 1 && (
                <>
                  <button
                    onClick={() => {
                      const target = [...files, ...(secondaryFiles || [])].find(
                        (f) => f.id === selectedIds[0]
                      );
                      if (target) {
                        startInlineRename(target);
                      }
                    }}
                    className="px-2.5 py-1 ps1-button bg-black/35 hover:bg-black/55 font-pixel text-[10px] flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>RENAME (F2)</span>
                  </button>
                  <button
                    onClick={() => {
                      const target = [...files, ...(secondaryFiles || [])].find(
                        (f) => f.id === selectedIds[0]
                      );
                      if (target) onCreateSymlink(target);
                    }}
                    className="px-2.5 py-1 ps1-button bg-black/35 hover:bg-black/55 font-pixel text-[10px] flex items-center gap-1"
                    title="Create Symbolic Link (fs.symlink)"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#9CC5A1]" />
                    <span>+ SYMLINK</span>
                  </button>
                </>
              )}

              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={() => onTrashItems(selectedIds)}
                    className="px-2.5 py-1 ps1-button bg-[#D96B6B] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1"
                    title="Safely moves items to OS Trash (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>TRASH ({selectedIds.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      onPlayBlip(0.85);
                      setConfirmPermanentDeleteIds(selectedIds);
                    }}
                    className="px-2 py-1 ps1-button bg-black/50 text-[#D96B6B] hover:bg-[#D96B6B] hover:text-[#17181c] font-pixel text-[10px] flex items-center gap-1"
                    title="Permanent Delete (Shift+Delete)"
                  >
                    <span>PERM DELETE</span>
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="font-pixel text-[9px] opacity-65 flex items-center gap-0.5 mr-1">
                <Hash className="w-3 h-3" /> TAGS:
              </span>
              {allHashtags.map((tag) => {
                const isSelectedTag =
                  searchQuery.trim().toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    onClick={() => onSearchChange(isSelectedTag ? '' : tag)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono border border-[#17181c] transition-colors ${
                      isSelectedTag
                        ? 'bg-[var(--accent-primary)] text-[#17181c] font-bold'
                        : 'bg-black/30 hover:bg-black/50 opacity-85'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {renderDirectoryPane('primary', currentFolderId)}
            {isSplitPane && renderDirectoryPane('secondary', secondaryFolderId)}
          </div>
        </div>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 280),
            left: Math.min(contextMenu.x, window.innerWidth - 240),
          }}
          className="fixed z-50 w-60 ps1-panel p-1.5 text-xs font-mono space-y-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 font-pixel text-[9px] text-[var(--accent-primary)] border-b border-white/10 truncate flex items-center justify-between">
            <span className="truncate">{contextMenu.item.name}</span>
            {renderGitBadge(contextMenu.item.gitStatus)}
          </div>

          {contextMenu.item.type === 'folder' && (
            <>
              <button
                onClick={() => {
                  onOpenInTerminal(contextMenu.item.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Open in Terminal</span>
              </button>
              <button
                onClick={() => {
                  onCopyCdPath(contextMenu.item.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy `cd` Path</span>
              </button>
              <button
                onClick={() => {
                  onOpenFolderPfpModal(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Customize Folder PFP...</span>
              </button>
              <button
                onClick={() => {
                  onTogglePinFolder(contextMenu.item);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>
                  {contextMenu.item.pinned ? 'Unpin from Sidebar' : 'Pin to Sidebar'}
                </span>
              </button>
              <button
                onClick={() => {
                  onOpenFolderInSplitPane(contextMenu.item.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Open in Split-Pane</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              onCreateSymlink(contextMenu.item);
              setContextMenu(null);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Create Symlink...</span>
          </button>

          {contextMenu.item.type !== 'folder' && (
            <button
              onClick={() => {
                onCreateHardlink(contextMenu.item);
                setContextMenu(null);
              }}
              className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Create Hardlink Here</span>
            </button>
          )}

          <button
            onClick={() => {
              const itemToRename = contextMenu.item;
              setContextMenu(null);
              if (!selectedIds.includes(itemToRename.id)) {
                onSelectFile(itemToRename.id, false);
              }
              startInlineRename(itemToRename);
            }}
            className="w-full text-left px-2 py-1.5 hover:bg-[var(--accent-primary)] hover:text-[#17181c] flex items-center gap-2"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Rename (F2)</span>
          </button>

          <button
            onClick={() => {
              onTrashItems([contextMenu.item.id]);
              setContextMenu(null);
            }}
            className="w-full text-left px-2 py-1.5 text-[#E0B85A] hover:bg-[#E0B85A] hover:text-[#17181c] flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Move to Trash (Del)</span>
          </button>

          <button
            onClick={() => {
              setConfirmPermanentDeleteIds([contextMenu.item.id]);
              setContextMenu(null);
            }}
            className="w-full text-left px-2 py-1.5 text-[#D96B6B] hover:bg-[#D96B6B] hover:text-[#17181c] flex items-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Permanent Delete (⇧Del)</span>
          </button>
        </div>
      )}
    </div>
  );
};
