import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Hash,
  Plus,
  Volume2,
  Image as ImageIcon,
  FileText,
  Folder,
  Save,
  Sparkles,
  Terminal,
  Copy,
  Link2,
  ExternalLink,
  Shield,
  GitBranch,
  Edit3,
} from 'lucide-react';
import { RoomFileItem } from '../types';

interface InspectorDrawerProps {
  selectedFile: RoomFileItem | null;
  onClose: () => void;
  onRenameItem: (fileId: string, newName: string) => void;
  onUpdateComment: (fileId: string, comment: string) => void;
  onAddHashtag: (fileId: string, tag: string) => void;
  onRemoveHashtag: (fileId: string, tag: string) => void;
  onClickHashtag: (tag: string) => void;
  onOpenFolderPfpModal: (folder: RoomFileItem) => void;
  onPlayAudioPreview: (freqs: number[]) => void;
  onOpenInTerminal: (folderId: string | null) => void;
  onCopyCdPath: (folderId: string | null) => void;
  onJumpToSymlinkTarget: (item: RoomFileItem) => void;
  onCreateSymlink: (item: RoomFileItem) => void;
  onCreateHardlink: (item: RoomFileItem) => void;
}

const SUGGESTED_TAGS = ['#assets', '#wip', '#inspo', '#bedroomcore', '#ps1', '#ost', '#final'];

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  selectedFile,
  onClose,
  onRenameItem,
  onUpdateComment,
  onAddHashtag,
  onRemoveHashtag,
  onClickHashtag,
  onOpenFolderPfpModal,
  onPlayAudioPreview,
  onOpenInTerminal,
  onCopyCdPath,
  onJumpToSymlinkTarget,
  onCreateSymlink,
  onCreateHardlink,
}) => {
  const [commentText, setCommentText] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  // Click-to-rename state inside the Metadata Inspector header
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const renameOpenedAtRef = useRef<number>(0);

  useEffect(() => {
    if (selectedFile) {
      setCommentText(selectedFile.comment || '');
      setTitleValue(selectedFile.name);
      setIsRenamingTitle(false);
      setTagInput('');
      setSavedNotice(false);
    }
  }, [selectedFile?.id]);

  useEffect(() => {
    if (selectedFile && !isRenamingTitle) {
      setTitleValue(selectedFile.name);
    }
  }, [selectedFile?.name, isRenamingTitle]);

  if (!selectedFile) return null;

  const startTitleRename = () => {
    renameOpenedAtRef.current = Date.now();
    setTitleValue(selectedFile.name);
    setIsRenamingTitle(true);
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  };

  const commitTitleRename = (rawVal?: string) => {
    const valToUse = rawVal !== undefined ? rawVal : titleValue;
    const trimmed = valToUse.trim();
    setIsRenamingTitle(false);
    if (trimmed !== selectedFile.name) {
      onRenameItem(selectedFile.id, trimmed);
      setTitleValue(selectedFile.name);
    } else {
      setTitleValue(selectedFile.name);
    }
  };

  const cancelTitleRename = () => {
    setTitleValue(selectedFile.name);
    setIsRenamingTitle(false);
  };

  const handleSaveComment = () => {
    onUpdateComment(selectedFile.id, commentText);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1400);
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    const normalized = tagInput.trim().startsWith('#')
      ? tagInput.trim().toLowerCase()
      : `#${tagInput.trim().toLowerCase()}`;
    onAddHashtag(selectedFile.id, normalized);
    setTagInput('');
  };

  const targetDirId =
    selectedFile.type === 'folder' ? selectedFile.id : selectedFile.parentId;

  return (
    <aside className="w-[320px] shrink-0 h-full ps1-panel p-3.5 flex flex-col overflow-y-auto border-t-0 z-20">
      <div
        className="relative ps1-card masking-tape-top-left masking-tape-top-right p-3.5"
        style={{ backgroundColor: '#FAF3EB', color: '#1F1B24' }}
      >
        {/* Header with Click-to-Rename */}
        <div className="flex items-start justify-between gap-2 border-b-2 border-[#1F1B24] pb-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-pixel text-[10px] uppercase tracking-wider text-[#D96B6B]">
                TAPED CARD // INSPECTOR
              </span>
              {selectedFile.isSymlink && (
                <span className="px-1.5 py-0.2 bg-[#9CC5A1] text-[#17181c] border border-[#17181c] font-pixel text-[9px] font-bold">
                  ⇢ SYMLINK
                </span>
              )}
              {selectedFile.gitStatus && (
                <span className="px-1.5 py-0.2 bg-[#1F1B24] text-[#E0B85A] font-pixel text-[9px] flex items-center gap-0.5">
                  <GitBranch className="w-2.5 h-2.5" />
                  GIT:{selectedFile.gitStatus}
                </span>
              )}
            </div>

            {isRenamingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  commitTitleRename(titleValue);
                }}
                className="mt-1"
              >
                <div className="flex items-center gap-1">
                  <input
                    ref={titleInputRef}
                    type="text"
                    autoFocus
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={() => {
                      if (Date.now() - renameOpenedAtRef.current < 200) {
                        titleInputRef.current?.focus();
                        return;
                      }
                      commitTitleRename(titleValue);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        commitTitleRename(e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelTitleRename();
                      }
                    }}
                    className="flex-1 min-w-0 px-2 py-1 text-xs font-mono font-bold bg-white text-[#17181c] border-2 border-[#17181c] focus:outline-none focus:ring-2 focus:ring-[#D96B6B]"
                  />
                  <button
                    type="submit"
                    onMouseDown={(e) => e.preventDefault()}
                    className="px-2 py-1 ps1-button bg-[#9CC5A1] text-[#17181c] font-pixel text-[9px] font-bold shrink-0"
                    title="Save new filename (Enter)"
                  >
                    SAVE
                  </button>
                </div>
                <span className="block font-pixel text-[8px] text-[#1F1B24]/60 mt-0.5">
                  Press Enter to rename • Esc to cancel
                </span>
              </form>
            ) : (
              <div
                onClick={startTitleRename}
                title="Click to rename file or folder"
                className="group/title flex items-center gap-1.5 mt-0.5 cursor-pointer hover:bg-black/5 px-1 -mx-1 py-0.5 rounded transition-colors"
              >
                <h3 className="font-bold text-sm break-all leading-snug">
                  {selectedFile.name}
                </h3>
                <Edit3 className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover/title:opacity-100 text-[#D96B6B]" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 ps1-button bg-[#2E323B] text-[#EAE6DF] hover:brightness-110 shrink-0"
            title="Close Inspector Drawer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Symlink Resolved Target Card (with 1-Click Jump to Target) */}
        {selectedFile.isSymlink && (
          <div className="mb-3 p-2.5 bg-[#2E323B] text-[#EAE6DF] border-2 border-[#17181c] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[10px] text-[#9CC5A1] flex items-center gap-1">
                <span>⇢ SYMBOLIC LINK TARGET</span>
              </span>
              <span className="font-mono text-[9px] px-1 bg-black/40 border border-white/15">
                readlink()
              </span>
            </div>
            <div className="font-mono text-[10px] bg-black/35 p-1.5 border border-white/10 break-all">
              {selectedFile.symlinkTarget || 'Resolved Target'}
            </div>
            <button
              onClick={() => onJumpToSymlinkTarget(selectedFile)}
              className="w-full py-1 px-2 ps1-button bg-[#9CC5A1] text-[#17181c] font-pixel text-[10px] font-bold flex items-center justify-center gap-1 hover:brightness-105"
            >
              <ExternalLink className="w-3 h-3" />
              <span>JUMP TO TARGET</span>
            </button>
          </div>
        )}

        {/* File Stats, Permissions & Ownership Table */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono mb-3 bg-black/5 p-2 border border-[#1F1B24]/30">
          <div>
            <span className="opacity-60 block text-[9px]">TYPE</span>
            <span className="uppercase font-bold">
              {selectedFile.isSymlink ? `${selectedFile.type} (symlink)` : selectedFile.type}
            </span>
          </div>
          <div>
            <span className="opacity-60 block text-[9px]">SIZE</span>
            <span className="font-bold">{selectedFile.size}</span>
          </div>
          <div className="col-span-2">
            <span className="opacity-60 block text-[9px]">PERMISSIONS (STAT MODE)</span>
            <span className="font-bold flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#2E323B]" />
              {selectedFile.permissions || '0644 (rw-r--r--)'}
            </span>
          </div>
          <div>
            <span className="opacity-60 block text-[9px]">UID / GID</span>
            <span>
              {selectedFile.ownerUid ?? 501}:{selectedFile.ownerGid ?? 20}
            </span>
          </div>
          <div>
            <span className="opacity-60 block text-[9px]">INODE / LINKS</span>
            <span>
              #{selectedFile.ino ?? '—'} ({selectedFile.nlink ?? 1}x)
            </span>
          </div>
          <div className="col-span-2 mt-0.5">
            <span className="opacity-60 block text-[9px]">MODIFIED</span>
            <span>{selectedFile.modifiedAt}</span>
          </div>
        </div>

        {/* Quick Terminal & Link Creation Actions */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <button
            onClick={() => onOpenInTerminal(targetDirId)}
            className="px-2 py-1.5 ps1-button bg-[#2E323B] text-[#EAE6DF] font-pixel text-[9px] flex items-center justify-center gap-1 hover:bg-[#3A3F4B]"
          >
            <Terminal className="w-3 h-3 text-[#E0B85A]" />
            <span>OPEN TERMINAL</span>
          </button>
          <button
            onClick={() => onCopyCdPath(targetDirId)}
            className="px-2 py-1.5 ps1-button bg-[#2E323B] text-[#EAE6DF] font-pixel text-[9px] flex items-center justify-center gap-1 hover:bg-[#3A3F4B]"
          >
            <Copy className="w-3 h-3 text-[#9CC5A1]" />
            <span>COPY `cd` PATH</span>
          </button>
          <button
            onClick={() => onCreateSymlink(selectedFile)}
            className="px-2 py-1 ps1-button bg-black/10 hover:bg-black/20 text-[#1F1B24] font-pixel text-[9px] flex items-center justify-center gap-1"
            title="Create Symbolic Link (fs.symlink)"
          >
            <Link2 className="w-3 h-3" />
            <span>+ SYMLINK</span>
          </button>
          {selectedFile.type !== 'folder' && (
            <button
              onClick={() => onCreateHardlink(selectedFile)}
              className="px-2 py-1 ps1-button bg-black/10 hover:bg-black/20 text-[#1F1B24] font-pixel text-[9px] flex items-center justify-center gap-1"
              title="Create Hardlink sharing inode (fs.link)"
            >
              <Link2 className="w-3 h-3" />
              <span>+ HARDLINK</span>
            </button>
          )}
        </div>

        {/* Folder PFP Preview & Customizer */}
        {selectedFile.type === 'folder' && (
          <div className="mb-3 flex items-center gap-3 p-2.5 bg-[#2E323B] text-[#EAE6DF] border-2 border-[#17181c]">
            {selectedFile.folderPfp ? (
              <img
                src={selectedFile.folderPfp}
                alt={selectedFile.name}
                className="w-14 h-14 object-cover border-2 border-[#17181c] shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-14 h-14 flex items-center justify-center bg-black/30 border-2 border-[#17181c]">
                <Folder className="w-7 h-7 text-[var(--accent-primary)]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-pixel text-[10px] text-[var(--accent-primary)]">
                FOLDER PFP COVER
              </div>
              <p className="text-[11px] opacity-80 truncate">
                {selectedFile.folderStickerLabel || 'Custom Square PFP'}
              </p>
              <button
                onClick={() => onOpenFolderPfpModal(selectedFile)}
                className="mt-1.5 px-2 py-0.5 text-[10px] font-pixel ps1-button bg-[var(--accent-primary)] text-[#17181c] font-bold"
              >
                Customize Cover
              </button>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {selectedFile.type === 'image' && selectedFile.imageUrl && (
          <div className="mb-3 p-2 bg-[#1F1B24] border-2 border-[#17181c] flex flex-col items-center">
            <img
              src={selectedFile.imageUrl}
              alt={selectedFile.name}
              className="w-36 h-36 object-contain border border-white/20"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="font-mono text-[10px] text-[#EAE6DF]/70 mt-1 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> PIXEL PREVIEW
            </span>
          </div>
        )}

        {/* Audio Preview */}
        {selectedFile.type === 'audio' && (
          <div className="mb-3 p-2.5 bg-[#26222E] text-[#EAE6DF] border-2 border-[#17181c] flex items-center justify-between">
            <div>
              <span className="font-pixel text-[10px] text-[var(--accent-primary)] block">
                SYNTH PREVIEW
              </span>
              <span className="font-mono text-[10px] opacity-75">
                Web Audio Synth
              </span>
            </div>
            <button
              onClick={() =>
                onPlayAudioPreview(
                  selectedFile.audioFreqs || [440, 554.37, 659.25, 880]
                )
              }
              className="px-2.5 py-1.5 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>PLAY</span>
            </button>
          </div>
        )}

        {/* Streamed Text / Code Content Preview */}
        {(selectedFile.type === 'note' ||
          selectedFile.type === 'code' ||
          selectedFile.type === 'archive') &&
          selectedFile.content && (
            <div className="mb-3">
              <div className="font-pixel text-[10px] uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> STREAM PREVIEW (3KB):
              </div>
              <pre className="p-2 text-[10px] font-mono bg-[#1E2028] text-[#EAE6DF] border border-[#17181c] whitespace-pre-wrap max-h-36 overflow-y-auto">
                {selectedFile.content}
              </pre>
            </div>
          )}

        {/* Freeform Notes / Comments */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="font-pixel text-[10px] uppercase tracking-wide">
              COMMENTS / NOTES
            </label>
            {savedNotice && (
              <span className="font-pixel text-[9px] text-[#2D7A4D] flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> SAVED
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add notes or context..."
            className="w-full p-2 text-xs bg-white border border-[#1F1B24] text-[#1F1B24] focus:outline-none resize-none"
          />
          <button
            onClick={handleSaveComment}
            className="mt-1 w-full py-1 ps1-button bg-[#2E323B] text-[#EAE6DF] font-pixel text-[10px] flex items-center justify-center gap-1 hover:bg-[#3A3F4B]"
          >
            <Save className="w-3 h-3" />
            <span>SAVE COMMENT</span>
          </button>
        </div>

        {/* #Hashtags */}
        <div>
          <div className="font-pixel text-[10px] uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Hash className="w-3 h-3 text-[#D96B6B]" />
            <span>#HASHTAGS (CLICK TO FILTER)</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {selectedFile.hashtags.length === 0 ? (
              <span className="text-[11px] italic opacity-60">
                No #hashtags attached.
              </span>
            ) : (
              selectedFile.hashtags.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center bg-[#D8A7B1] text-[#17181c] border border-[#17181c] text-[11px] font-mono"
                >
                  <button
                    onClick={() => onClickHashtag(tag)}
                    className="px-1.5 py-0.5 hover:underline font-bold"
                    title={`Filter files by ${tag}`}
                  >
                    {tag}
                  </button>
                  <button
                    onClick={() => onRemoveHashtag(selectedFile.id, tag)}
                    className="px-1 py-0.5 border-l border-[#17181c]/40 hover:bg-black/15"
                    title={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddTagSubmit} className="flex gap-1 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add #hashtag..."
              className="flex-1 min-w-0 px-2 py-1 text-xs font-mono bg-white border border-[#1F1B24] text-[#1F1B24] focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 ps1-button bg-[#B6A6CA] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              <span>TAG</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-1 pt-1 border-t border-[#1F1B24]/20">
            {SUGGESTED_TAGS.filter((t) => !selectedFile.hashtags.includes(t)).map(
              (sug) => (
                <button
                  key={sug}
                  onClick={() => onAddHashtag(selectedFile.id, sug)}
                  className="px-1.5 py-0.5 text-[10px] font-mono bg-black/10 hover:bg-black/20 border border-[#1F1B24]/30"
                >
                  +{sug}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
