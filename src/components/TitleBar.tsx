import React from 'react';
import {
  Minus,
  Square,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Palette,
  Cpu,
  Keyboard,
} from 'lucide-react';
import { ThemeSettings } from '../types';

interface TitleBarProps {
  isElectron: boolean;
  platform: string;
  currentPathDisplay: string;
  theme: ThemeSettings;
  muted: boolean;
  vimMode: boolean;
  onToggleVimMode: () => void;
  onCycleThemePreset: () => void;
  onOpenThemeModal: () => void;
  onToggleMute: () => void;
  onWindowControl: (action: 'minimize' | 'maximize' | 'close') => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  isElectron,
  platform,
  currentPathDisplay,
  theme,
  muted,
  vimMode,
  onToggleVimMode,
  onCycleThemePreset,
  onOpenThemeModal,
  onToggleMute,
  onWindowControl,
}) => {
  const isMac = platform === 'darwin';

  return (
    <div className="h-9 bg-[#17181c] text-[#EAE6DF] border-b-2 border-[#0e0f12] px-3 flex items-center justify-between select-none app-drag-region z-30">
      {/* Left: macOS traffic light spacing + App Brand */}
      <div className="flex items-center gap-2.5">
        {isElectron && isMac && <div className="w-14 shrink-0" />}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-secondary)] border border-white/15">
          <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
          <span className="font-pixel text-[11px] tracking-wider text-[var(--accent-primary)] font-bold">
            ROOMBOX // DESKTOP OS
          </span>
        </div>

        <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 text-[#EAE6DF]/75 truncate max-w-md">
          <Cpu className="w-3 h-3 text-[#9CC5A1]" />
          <span>{isElectron ? 'ELECTRON NATIVE FS' : 'VIRTUAL FS PREVIEW'}</span>
          <span className="opacity-40">•</span>
          <span className="truncate">{currentPathDisplay}</span>
        </span>
      </div>

      {/* Right: Vim Motions Toggle, Mood Theme Toggle, Sound Mute, and Window Controls */}
      <div className="flex items-center gap-1.5 app-no-drag">
        <button
          onClick={onToggleVimMode}
          className={`px-2 py-0.5 border font-pixel text-[9px] flex items-center gap-1 transition-colors ${
            vimMode
              ? 'bg-[#9CC5A1] text-[#17181c] border-[#17181c] font-bold'
              : 'bg-white/10 hover:bg-white/20 border-white/15 text-[#EAE6DF]/85'
          }`}
          title="Toggle Vim Motions (j/k/h/l navigation, gg/G jump, Enter open, Backspace up, yy copy path, dd trash, Shift+D permanent delete)"
        >
          <Keyboard className="w-3 h-3" />
          <span>VIM: {vimMode ? 'ON' : 'OFF'}</span>
        </button>

        <button
          onClick={onCycleThemePreset}
          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/15 font-pixel text-[9px] flex items-center gap-1 transition-colors"
          title="Cycle through Hazy Slate, Late Night Lamp, Atom One Dark, Tokyo Night & saved user presets"
        >
          <Palette className="w-3 h-3 text-[var(--accent-primary)]" />
          <span className="uppercase">
            {theme.preset === 'hazy-slate'
              ? 'HAZY SLATE'
              : theme.preset === 'late-night-lamp'
              ? 'LATE NIGHT LAMP'
              : theme.preset === 'atom-one-dark'
              ? 'ATOM ONE DARK'
              : theme.preset === 'tokyo-night'
              ? 'TOKYO NIGHT'
              : theme.name || 'CUSTOM THEME'}
          </span>
        </button>

        <button
          onClick={onOpenThemeModal}
          className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/15 font-pixel text-[9px] text-[var(--accent-primary)] font-bold"
          title="Open Theme Studio (Presets, Custom Wallpaper Upload, Blur/Dim Sliders & Saved Presets)"
        >
          THEME STUDIO
        </button>

        <button
          onClick={onToggleMute}
          className={`p-1 border border-white/15 ${
            muted
              ? 'bg-[#D96B6B] text-[#17181c]'
              : 'bg-white/10 hover:bg-white/20'
          }`}
          title={muted ? 'Unmute PS1 Audio Engine' : 'Mute PS1 Audio Engine'}
        >
          {muted ? (
            <VolumeX className="w-3 h-3" />
          ) : (
            <Volume2 className="w-3 h-3 text-[var(--accent-primary)]" />
          )}
        </button>

        {/* Frameless Window Controls */}
        <div className="flex items-center ml-1 pl-2 border-l border-white/15 gap-1">
          <button
            onClick={() => onWindowControl('minimize')}
            className="p-1 hover:bg-white/15 transition-colors"
            title="Minimize Window"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => onWindowControl('maximize')}
            className="p-1 hover:bg-white/15 transition-colors"
            title="Maximize / Restore Window"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => onWindowControl('close')}
            className="p-1 hover:bg-[#D96B6B] hover:text-[#17181c] transition-colors"
            title="Close Window"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
