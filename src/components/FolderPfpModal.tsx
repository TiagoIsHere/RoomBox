import React, { useRef } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { FOLDER_STICKER_PRESETS } from '../demoFileSystem';
import { RoomFileItem } from '../types';

interface FolderPfpModalProps {
  folder: RoomFileItem | null;
  onClose: () => void;
  onSelectFolderPfp: (
    folderId: string,
    dataUrl: string,
    label: string
  ) => void;
}

export const FolderPfpModal: React.FC<FolderPfpModalProps> = ({
  folder,
  onClose,
  onSelectFolderPfp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!folder) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onSelectFolderPfp(
        folder.id,
        dataUrl,
        file.name.replace(/\.[^/.]+$/, '').slice(0, 12) || 'CUSTOM_PFP'
      );
      onClose();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-md ps1-panel p-4 relative masking-tape-top-left masking-tape-top-right">
        <div className="flex items-center justify-between border-b-2 border-[#17181c] pb-2 mb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="font-pixel text-xs uppercase">
              CUSTOMIZE FOLDER PFP // {folder.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 ps1-button bg-black/30 hover:bg-black/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Custom Square Image */}
        <div className="mb-4 p-3 bg-black/25 border-2 border-dashed border-white/25 flex items-center justify-between">
          <div>
            <div className="font-pixel text-[11px] text-[var(--accent-primary)]">
              UPLOAD SQUARE PFP IMAGE
            </div>
            <p className="text-[11px] opacity-75">
              PNG, JPG, GIF or WebP — saved to local browser storage
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1 shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>UPLOAD IMAGE</span>
          </button>
        </div>

        {/* Preset PS1 / Anime Stickers */}
        <div className="mb-3">
          <div className="font-pixel text-[10px] uppercase opacity-80 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--accent-secondary)]" />
            <span>OR PICK AN ANIME / PS1 MEMORY STICKER:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {FOLDER_STICKER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  onSelectFolderPfp(folder.id, preset.dataUrl, preset.label);
                  onClose();
                }}
                className="p-2 ps1-button bg-black/30 hover:bg-[var(--accent-secondary)] hover:text-[#17181c] flex flex-col items-center gap-1.5 group transition-colors"
              >
                <img
                  src={preset.dataUrl}
                  alt={preset.label}
                  className="w-14 h-14 border-2 border-[#17181c]"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="font-mono text-[10px] font-bold truncate w-full text-center">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
