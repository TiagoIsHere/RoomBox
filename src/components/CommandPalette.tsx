import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Sparkles,
  Columns2,
  Terminal,
  Copy,
  Edit3,
  Folder,
  FileText,
  Hash,
  ArrowRight,
  X,
} from 'lucide-react';
import { BatchRenameOptions, RoomFileItem } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  files: RoomFileItem[];
  selectedCount: number;
  isSplitPane: boolean;
  currentPathDisplay: string;
  onClose: () => void;
  onAutoSortCurrentFolder: () => void;
  onBatchRenameSelected: (options: BatchRenameOptions) => void;
  onCopyTerminalCd: () => void;
  onOpenNativeTerminal: () => void;
  onToggleSplitPane: () => void;
  onNavigateFolder: (folderId: string | null) => void;
  onSelectAndInspectFile: (file: RoomFileItem) => void;
  onFilterHashtag: (tag: string) => void;
  onPlayBlip: (pitch?: number) => void;
}

interface PaletteCommandItem {
  id: string;
  category: 'ACTION' | 'FOLDER' | 'FILE' | 'HASHTAG';
  title: string;
  subtitle: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  files,
  selectedCount,
  isSplitPane,
  currentPathDisplay,
  onClose,
  onAutoSortCurrentFolder,
  onBatchRenameSelected,
  onCopyTerminalCd,
  onOpenNativeTerminal,
  onToggleSplitPane,
  onNavigateFolder,
  onSelectAndInspectFile,
  onFilterHashtag,
  onPlayBlip,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [batchRenameOpen, setBatchRenameOpen] = useState(false);
  const [renameMode, setRenameMode] = useState<'sequential' | 'affix' | 'replace'>('sequential');
  const [batchPrefix, setBatchPrefix] = useState('asset');
  const [batchSuffix, setBatchSuffix] = useState('_v2');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setBatchRenameOpen(false);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const allHashtags = useMemo(
    () => Array.from(new Set(files.flatMap((f) => f.hashtags))),
    [files]
  );

  const items: PaletteCommandItem[] = useMemo(() => {
    const powerActions: PaletteCommandItem[] = [
      {
        id: 'act-autosort',
        category: 'ACTION',
        title: 'Auto-Sort Current Folder by Type',
        subtitle: `Creates Images/, Documents/, Audio/, Archives/ in ${currentPathDisplay} & moves files`,
        shortcut: '1-Click Sort',
        icon: <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />,
        action: () => {
          onAutoSortCurrentFolder();
          onClose();
        },
      },
      {
        id: 'act-batch-rename',
        category: 'ACTION',
        title: `Batch Rename Selected (${selectedCount || 'All in Folder'})`,
        subtitle: 'Sequential numbering, prefix/suffix, or find-and-replace',
        shortcut: 'Batch Rename',
        icon: <Edit3 className="w-4 h-4 text-[var(--accent-primary)]" />,
        action: () => {
          onPlayBlip(1.1);
          setBatchRenameOpen(true);
        },
      },
      {
        id: 'act-open-term',
        category: 'ACTION',
        title: 'Open Current Folder in Terminal',
        subtitle: `Spawns native OS Terminal directly at ${currentPathDisplay}`,
        shortcut: 'Terminal',
        icon: <Terminal className="w-4 h-4 text-[#E0B85A]" />,
        action: () => {
          onOpenNativeTerminal();
          onClose();
        },
      },
      {
        id: 'act-copy-cd',
        category: 'ACTION',
        title: 'Copy `cd` Command',
        subtitle: `Copies: cd "${currentPathDisplay}" to clipboard`,
        shortcut: 'Copy cd',
        icon: <Copy className="w-4 h-4 text-[#9CC5A1]" />,
        action: () => {
          onCopyTerminalCd();
          onClose();
        },
      },
      {
        id: 'act-split',
        category: 'ACTION',
        title: isSplitPane
          ? 'Close Split-Pane View (Single Pane)'
          : 'Toggle Split-Pane View (Side-by-Side)',
        subtitle: 'Open two directories side-by-side for fast drag-and-drop organizing',
        shortcut: 'Split View',
        icon: <Columns2 className="w-4 h-4 text-[var(--accent-secondary)]" />,
        action: () => {
          onToggleSplitPane();
          onClose();
        },
      },
    ];

    const hashtagItems: PaletteCommandItem[] = allHashtags.map((tag) => ({
      id: `tag-${tag}`,
      category: 'HASHTAG',
      title: `Filter by ${tag}`,
      subtitle: 'Show all files and notes tagged with this hashtag',
      icon: <Hash className="w-4 h-4 text-[var(--accent-primary)]" />,
      action: () => {
        onFilterHashtag(tag);
        onClose();
      },
    }));

    const fileItems: PaletteCommandItem[] = files.map((f) => ({
      id: `file-${f.id}`,
      category: f.type === 'folder' ? 'FOLDER' : 'FILE',
      title: f.name,
      subtitle:
        f.comment || `${f.type.toUpperCase()} • ${f.size} • ${f.hashtags.join(' ')}`,
      icon:
        f.type === 'folder' ? (
          <Folder className="w-4 h-4 text-[var(--accent-primary)]" />
        ) : (
          <FileText className="w-4 h-4 opacity-80" />
        ),
      action: () => {
        if (f.type === 'folder') {
          onNavigateFolder(f.id);
        } else {
          onSelectAndInspectFile(f);
        }
        onClose();
      },
    }));

    const combined = [...powerActions, ...hashtagItems, ...fileItems];
    const q = query.trim().toLowerCase();
    if (!q) return combined.slice(0, 14);

    return combined.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [
    files,
    allHashtags,
    query,
    selectedCount,
    isSplitPane,
    currentPathDisplay,
    onAutoSortCurrentFolder,
    onCopyTerminalCd,
    onOpenNativeTerminal,
    onToggleSplitPane,
    onNavigateFolder,
    onSelectAndInspectFile,
    onFilterHashtag,
    onClose,
    onPlayBlip,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (batchRenameOpen) {
      if (e.key === 'Escape') {
        setBatchRenameOpen(false);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onPlayBlip(1.05);
      setActiveIndex((prev) => (prev + 1) % Math.max(1, items.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onPlayBlip(0.95);
      setActiveIndex((prev) =>
        prev - 1 < 0 ? Math.max(0, items.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault();
      items[activeIndex].action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBatchRenameSelected({
      mode: renameMode,
      prefix: batchPrefix,
      suffix: batchSuffix,
      findText,
      replaceText,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 pt-16 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl ps1-panel overflow-hidden relative masking-tape-top-left masking-tape-top-right"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input */}
        <div className="px-3.5 py-2.5 bg-black/30 border-b-2 border-[#17181c] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, folders, #hashtags, or power actions... (Esc to close)"
            className="flex-1 bg-transparent text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/45 focus:outline-none"
          />
          <span className="px-1.5 py-0.5 text-[10px] font-pixel bg-black/40 border border-white/15">
            ESC
          </span>
          <button
            onClick={onClose}
            className="p-0.5 opacity-70 hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Batch Rename Studio Sub-View */}
        {batchRenameOpen ? (
          <form onSubmit={handleBatchSubmit} className="p-4 space-y-3 bg-black/20">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-[var(--accent-primary)]">
                BATCH RENAME // {selectedCount > 0 ? `${selectedCount} SELECTED` : 'ALL FILES IN FOLDER'}
              </span>
              <div className="flex gap-1">
                {(
                  [
                    { id: 'sequential', label: '1. Sequential (#)' },
                    { id: 'affix', label: '2. Prefix/Suffix' },
                    { id: 'replace', label: '3. Find & Replace' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onPlayBlip(1.05);
                      setRenameMode(tab.id);
                    }}
                    className={`px-2 py-0.5 font-pixel text-[9px] ps1-button ${
                      renameMode === tab.id
                        ? 'bg-[var(--accent-primary)] text-[#17181c] font-bold'
                        : 'bg-black/35'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {renameMode === 'sequential' && (
              <div className="space-y-2">
                <p className="text-xs opacity-80">
                  Renames files sequentially:{' '}
                  <code className="px-1 bg-black/40 font-mono">
                    {batchPrefix || 'asset'}_01.ext
                  </code>
                  ,{' '}
                  <code className="px-1 bg-black/40 font-mono">
                    {batchPrefix || 'asset'}_02.ext
                  </code>
                </p>
                <input
                  type="text"
                  autoFocus
                  value={batchPrefix}
                  onChange={(e) => setBatchPrefix(e.target.value)}
                  placeholder="Base name prefix (e.g. sketch)"
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-[#17181c] text-[var(--text-primary)] focus:outline-none"
                />
              </div>
            )}

            {renameMode === 'affix' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono opacity-75 block mb-1">
                    Prefix (before name)
                  </label>
                  <input
                    type="text"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    placeholder="e.g. wip_"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-[#17181c] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono opacity-75 block mb-1">
                    Suffix (before .ext)
                  </label>
                  <input
                    type="text"
                    value={batchSuffix}
                    onChange={(e) => setBatchSuffix(e.target.value)}
                    placeholder="e.g. _final"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-[#17181c] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {renameMode === 'replace' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono opacity-75 block mb-1">
                    Find Text
                  </label>
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="Text to find..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-[#17181c] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono opacity-75 block mb-1">
                    Replace With
                  </label>
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Replacement..."
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-[#17181c] text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBatchRenameOpen(false)}
                className="px-3 py-1.5 ps1-button bg-black/30 font-pixel text-[10px]"
              >
                BACK
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold"
              >
                EXECUTE BATCH RENAME
              </button>
            </div>
          </form>
        ) : (
          /* Results List */
          <div className="max-h-[340px] overflow-y-auto divide-y divide-white/5">
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono opacity-60">
                No matching commands, files, or #hashtags.
              </div>
            ) : (
              items.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.action}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] text-[#17181c]'
                        : 'hover:bg-black/25'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 border border-[#17181c] shrink-0 ${
                          isSelected ? 'bg-[#17181c] text-[#EAE6DF]' : 'bg-black/30'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-2">
                          <span>{item.title}</span>
                          <span
                            className={`text-[9px] font-pixel px-1 py-0.2 border border-[#17181c] ${
                              isSelected
                                ? 'bg-[#17181c] text-[var(--accent-primary)]'
                                : 'bg-black/30 opacity-75'
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            isSelected ? 'opacity-90' : 'opacity-65'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.shortcut && (
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-mono border border-[#17181c] ${
                            isSelected
                              ? 'bg-[#17181c] text-[#EAE6DF]'
                              : 'bg-black/30 opacity-75'
                          }`}
                        >
                          {item.shortcut}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
