import React, { useRef, useState } from 'react';
import {
  X,
  Palette,
  Sparkles,
  Square,
  Tv,
  Grid,
  Check,
  Upload,
  Trash2,
  BookmarkPlus,
  Image as ImageIcon,
  Sliders,
} from 'lucide-react';
import {
  BuiltinThemePresetId,
  CustomThemePreset,
  PatternType,
  ThemeSettings,
} from '../types';

export const THEME_PRESETS: Record<BuiltinThemePresetId, ThemeSettings> = {
  'hazy-slate': {
    preset: 'hazy-slate',
    name: 'Hazy Slate',
    bgPrimary: '#2E323B',
    bgSecondary: '#3A3F4B',
    bgCard: '#3A3F4B',
    accentPrimary: '#D8A7B1',
    accentSecondary: '#B6A6CA',
    textPrimary: '#EAE6DF',
    textMuted: '#A6A29A',
    borderColor: '#17181C',
    pattern: 'gingham',
    bgOverlayOpacity: 0.45,
    backdropBlur: 0,
  },
  'late-night-lamp': {
    preset: 'late-night-lamp',
    name: 'Late Night Lamp',
    bgPrimary: '#2B1E22',
    bgSecondary: '#3A282D',
    bgCard: '#3A282D',
    accentPrimary: '#D96B6B',
    accentSecondary: '#E0B85A',
    textPrimary: '#F4E8D8',
    textMuted: '#B8A496',
    borderColor: '#1A1114',
    pattern: 'solid',
    bgOverlayOpacity: 0.5,
    backdropBlur: 0,
  },
  'atom-one-dark': {
    preset: 'atom-one-dark',
    name: 'Atom One Dark',
    bgPrimary: '#282C34',
    bgSecondary: '#21252B',
    bgCard: '#2C313A',
    accentPrimary: '#61AFEF',
    accentSecondary: '#C678DD',
    textPrimary: '#ABB2BF',
    textMuted: '#5C6370',
    borderColor: '#181A1F',
    pattern: 'none',
    bgOverlayOpacity: 0.55,
    backdropBlur: 0,
  },
  'tokyo-night': {
    preset: 'tokyo-night',
    name: 'Tokyo Night',
    bgPrimary: '#1A1B26',
    bgSecondary: '#16161E',
    bgCard: '#24283B',
    accentPrimary: '#7AA2F7',
    accentSecondary: '#BB9AF7',
    textPrimary: '#C0CAF5',
    textMuted: '#565F89',
    borderColor: '#101016',
    pattern: 'grid',
    bgOverlayOpacity: 0.55,
    backdropBlur: 0,
  },
};

export const BUILTIN_THEME_LIST: Array<{
  id: BuiltinThemePresetId;
  name: string;
  subtitle: string;
  swatches: string[];
}> = [
  {
    id: 'hazy-slate',
    name: 'Hazy Slate',
    subtitle: 'Muted slate-gray, dusty rose & warm off-white',
    swatches: ['#2E323B', '#3A3F4B', '#D8A7B1', '#B6A6CA', '#EAE6DF'],
  },
  {
    id: 'late-night-lamp',
    name: 'Late Night Lamp',
    subtitle: 'Dim warm red-brown, gingham coral & cream',
    swatches: ['#2B1E22', '#3A282D', '#D96B6B', '#E0B85A', '#F4E8D8'],
  },
  {
    id: 'atom-one-dark',
    name: 'Atom One Dark',
    subtitle: 'One Dark #282C34 editor, #21252B panel & #61AFEF/#C678DD',
    swatches: ['#282C34', '#21252B', '#61AFEF', '#C678DD', '#E06C75'],
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    subtitle: 'Deep indigo #1A1B26, #24283B surface & #7AA2F7/#BB9AF7/#F7768E',
    swatches: ['#1A1B26', '#16161E', '#7AA2F7', '#BB9AF7', '#F7768E'],
  },
];

// Built-in crisp SVG anime bedroom / cyber night sample wallpapers for instant preview
export const SAMPLE_WALLPAPERS: Array<{ label: string; dataUrl: string }> = [
  {
    label: 'Shibuya Dusk Window (SVG)',
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#19162b"/>
              <stop offset="55%" stop-color="#3a284c"/>
              <stop offset="100%" stop-color="#d88c9a"/>
            </linearGradient>
          </defs>
          <rect width="800" height="500" fill="url(#sky)"/>
          <circle cx="620" cy="120" r="46" fill="#FAF3EB" opacity="0.85"/>
          <g fill="#2b1e38" opacity="0.85">
            <rect x="40" y="230" width="90" height="270"/>
            <rect x="145" y="190" width="110" height="310"/>
            <rect x="270" y="260" width="85" height="240"/>
            <rect x="370" y="160" width="130" height="340"/>
            <rect x="520" y="220" width="95" height="280"/>
            <rect x="630" y="195" width="130" height="305"/>
          </g>
          <g fill="#E0B85A" opacity="0.7">
            <rect x="165" y="220" width="14" height="20"/>
            <rect x="195" y="220" width="14" height="20"/>
            <rect x="165" y="255" width="14" height="20"/>
            <rect x="395" y="195" width="18" height="22"/>
            <rect x="430" y="195" width="18" height="22"/>
            <rect x="465" y="235" width="18" height="22"/>
            <rect x="655" y="225" width="16" height="20"/>
            <rect x="690" y="265" width="16" height="20"/>
          </g>
          <path d="M0 140 Q 400 190 800 120" stroke="#110f1a" stroke-width="3" fill="none"/>
          <path d="M0 155 Q 400 205 800 135" stroke="#110f1a" stroke-width="2" fill="none"/>
        </svg>
      `),
  },
  {
    label: 'Tokyo Night Horizon (SVG)',
    dataUrl:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
          <defs>
            <linearGradient id="tn" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#16161E"/>
              <stop offset="50%" stop-color="#1A1B26"/>
              <stop offset="100%" stop-color="#2e2142"/>
            </linearGradient>
          </defs>
          <rect width="800" height="500" fill="url(#tn)"/>
          <circle cx="180" cy="130" r="65" fill="#F7768E" opacity="0.28"/>
          <circle cx="640" cy="340" r="120" fill="#7AA2F7" opacity="0.18"/>
          <g stroke="#7AA2F7" stroke-opacity="0.22" stroke-width="1">
            <line x1="0" y1="360" x2="800" y2="360"/>
            <line x1="0" y1="395" x2="800" y2="395"/>
            <line x1="0" y1="435" x2="800" y2="435"/>
            <line x1="0" y1="480" x2="800" y2="480"/>
            <line x1="400" y1="330" x2="50" y2="500"/>
            <line x1="400" y1="330" x2="220" y2="500"/>
            <line x1="400" y1="330" x2="400" y2="500"/>
            <line x1="400" y1="330" x2="580" y2="500"/>
            <line x1="400" y1="330" x2="750" y2="500"/>
          </g>
        </svg>
      `),
  },
];

interface ThemeModalProps {
  isOpen: boolean;
  isElectron: boolean;
  theme: ThemeSettings;
  customThemes: CustomThemePreset[];
  onUpdateTheme: (next: ThemeSettings) => void;
  onSaveCustomTheme: (name: string, settings: ThemeSettings) => void;
  onDeleteCustomTheme: (id: string) => void;
  onUploadWallpaperFromElectron: () => Promise<void>;
  onClose: () => void;
  onPlayBlip: (pitch?: number) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  isElectron,
  theme,
  customThemes,
  onUpdateTheme,
  onSaveCustomTheme,
  onDeleteCustomTheme,
  onUploadWallpaperFromElectron,
  onClose,
  onPlayBlip,
}) => {
  const [customPresetName, setCustomPresetName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const overlayPercent = Math.round((theme.bgOverlayOpacity ?? 0.45) * 100);
  const blurPx = theme.backdropBlur ?? 0;

  const applyBuiltinPreset = (presetId: BuiltinThemePresetId) => {
    onPlayBlip(1.15);
    const base = THEME_PRESETS[presetId];
    onUpdateTheme({
      ...base,
      // Preserve user's wallpaper if they want or reset cleanly to preset defaults
      bgImage: theme.bgImage,
      bgOverlayOpacity: theme.bgOverlayOpacity ?? base.bgOverlayOpacity ?? 0.45,
      backdropBlur: theme.backdropBlur ?? base.backdropBlur ?? 0,
    });
  };

  const applySavedCustomPreset = (preset: CustomThemePreset) => {
    onPlayBlip(1.15);
    onUpdateTheme({
      ...preset.settings,
      preset: preset.id,
      name: preset.name,
    });
  };

  const handleColorChange = (
    key:
      | 'bgPrimary'
      | 'bgSecondary'
      | 'bgCard'
      | 'accentPrimary'
      | 'accentSecondary'
      | 'textPrimary'
      | 'textMuted'
      | 'borderColor',
    value: string
  ) => {
    onUpdateTheme({
      ...theme,
      preset: 'custom',
      name: 'Custom Theme',
      [key]: value,
    });
  };

  const handlePatternChange = (pattern: PatternType) => {
    onPlayBlip(1.05);
    onUpdateTheme({
      ...theme,
      pattern,
    });
  };

  const handleBrowserWallpaperFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onPlayBlip(1.2);
        onUpdateTheme({
          ...theme,
          bgImage: reader.result,
          bgOverlayOpacity: theme.bgOverlayOpacity ?? 0.55,
          backdropBlur: Math.max(theme.backdropBlur ?? 0, 4),
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadButtonClick = async () => {
    onPlayBlip(1.1);
    if (isElectron && window.roomboxElectron?.uploadBackgroundImage) {
      try {
        await onUploadWallpaperFromElectron();
        return;
      } catch {
        fileInputRef.current?.click();
        return;
      }
    }
    fileInputRef.current?.click();
  };

  const handleSavePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPresetName.trim();
    if (!trimmed) return;
    onPlayBlip(1.25);
    onSaveCustomTheme(trimmed, theme);
    setCustomPresetName('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto ps1-panel p-4 relative masking-tape-top-left masking-tape-top-right space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[var(--border-color,#17181c)] pb-2">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[var(--accent-primary)]" />
            <h2 className="font-pixel text-xs uppercase tracking-wider font-bold">
              ROOMBOX THEME STUDIO // PRESETS, PALETTE & WALLPAPER
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 ps1-button bg-black/30 hover:bg-black/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Built-in Developer & Bedroomcore Presets */}
        <div>
          <label className="font-pixel text-[10px] uppercase opacity-80 block mb-1.5">
            1. PRELOADED BUILT-IN THEMES (INSTANT SWITCHER)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BUILTIN_THEME_LIST.map((item) => {
              const isSelected = theme.preset === item.id;
              const p = THEME_PRESETS[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyBuiltinPreset(item.id)}
                  style={{
                    backgroundColor: p.bgPrimary,
                    borderColor: p.borderColor || '#17181c',
                  }}
                  className={`p-2.5 text-left ps1-button flex flex-col gap-1 transition-all ${
                    isSelected
                      ? 'ring-2 ring-[var(--accent-primary)] scale-[1.01]'
                      : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-pixel text-[11px] font-bold"
                      style={{ color: p.textPrimary }}
                    >
                      {item.name}
                    </span>
                    {isSelected && (
                      <span
                        className="px-1.5 py-0.2 text-[8px] font-pixel font-bold border border-black/60 flex items-center gap-0.5"
                        style={{
                          backgroundColor: p.accentPrimary,
                          color: '#17181c',
                        }}
                      >
                        <Check className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p
                    className="text-[10px] leading-tight truncate"
                    style={{ color: p.textMuted || p.textPrimary }}
                  >
                    {item.subtitle}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {item.swatches.map((hex) => (
                      <span
                        key={hex}
                        className="w-4 h-3.5 border border-black/70"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Saved User Custom Theme Presets */}
        <div className="p-2.5 bg-black/25 border border-[var(--border-color,#17181c)] space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-pixel text-[10px] uppercase opacity-85 flex items-center gap-1.5">
              <BookmarkPlus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>SAVED USER THEME PRESETS ({customThemes.length})</span>
            </label>
            <span className="font-mono text-[10px] opacity-65">
              Persisted in local userData JSON store
            </span>
          </div>

          {customThemes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {customThemes.map((custom) => {
                const isActive = theme.preset === custom.id;
                return (
                  <div
                    key={custom.id}
                    style={{ backgroundColor: custom.settings.bgPrimary }}
                    className={`p-2 border border-[var(--border-color,#17181c)] flex items-center justify-between gap-2 ${
                      isActive ? 'ring-2 ring-[var(--accent-primary)]' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applySavedCustomPreset(custom)}
                      className="flex-1 text-left min-w-0"
                    >
                      <div
                        className="font-pixel text-[10px] font-bold truncate"
                        style={{ color: custom.settings.textPrimary }}
                      >
                        {custom.name}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {[
                          custom.settings.bgPrimary,
                          custom.settings.bgSecondary,
                          custom.settings.accentPrimary,
                          custom.settings.accentSecondary,
                        ].map((hex, i) => (
                          <span
                            key={i}
                            className="w-3 h-3 border border-black/70"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                        {custom.settings.bgImage && (
                          <span className="text-[9px] font-mono px-1 bg-black/40 text-white/90">
                            +IMG
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onPlayBlip(0.85);
                        onDeleteCustomTheme(custom.id);
                      }}
                      className="p-1.5 ps1-button bg-[#D96B6B] text-[#17181c] hover:opacity-90 shrink-0"
                      title={`Delete preset "${custom.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save Current Theme Form */}
          <form onSubmit={handleSavePresetSubmit} className="flex gap-2 pt-1">
            <input
              type="text"
              value={customPresetName}
              onChange={(e) => setCustomPresetName(e.target.value)}
              placeholder="Name your custom theme + wallpaper preset..."
              className="flex-1 px-2.5 py-1 text-xs font-mono bg-[#FAF3EB] text-[#17181c] border-2 border-[#17181c] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customPresetName.trim()}
              className="px-3 py-1 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-[10px] font-bold disabled:opacity-40 flex items-center gap-1 shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>SAVE THEME PRESET</span>
            </button>
          </form>
        </div>

        {/* 2. Custom Wallpaper Upload & Overlay Controls */}
        <div className="p-2.5 bg-black/25 border border-[var(--border-color,#17181c)] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="font-pixel text-[10px] uppercase opacity-85 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
              <span>2. CUSTOM WALLPAPER UPLOAD & OVERLAY CONTROLS</span>
            </label>
            {theme.bgImage && (
              <button
                type="button"
                onClick={() => {
                  onPlayBlip(0.9);
                  onUpdateTheme({ ...theme, bgImage: undefined });
                }}
                className="px-2 py-0.5 ps1-button bg-[#D96B6B] text-[#17181c] font-pixel text-[9px] font-bold"
              >
                CLEAR WALLPAPER
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleBrowserWallpaperFile}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUploadButtonClick}
              className="px-3 py-1.5 ps1-button bg-[var(--accent-secondary)] text-[#17181c] font-pixel text-[10px] font-bold flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>UPLOAD BACKGROUND IMAGE (PNG/JPG/WEBP/GIF)</span>
            </button>

            {SAMPLE_WALLPAPERS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  onPlayBlip(1.1);
                  onUpdateTheme({
                    ...theme,
                    bgImage: sample.dataUrl,
                    bgOverlayOpacity: theme.bgOverlayOpacity ?? 0.55,
                    backdropBlur: Math.max(theme.backdropBlur ?? 0, 4),
                  });
                }}
                className="px-2 py-1.5 ps1-button bg-black/35 hover:bg-black/55 font-mono text-[10px]"
              >
                + {sample.label}
              </button>
            ))}
          </div>

          {/* Sliders for Dim Overlay Opacity (0% to 95%) & Panel Backdrop Blur (0px to 16px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-black/30 p-2 border border-white/10">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[var(--accent-primary)]" />
                  <span>Dim/Tint Overlay Opacity</span>
                </span>
                <span className="font-pixel text-[10px] text-[var(--accent-primary)]">
                  {overlayPercent}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={95}
                step={1}
                value={overlayPercent}
                onChange={(e) => {
                  const pct = Number(e.target.value);
                  onUpdateTheme({
                    ...theme,
                    bgOverlayOpacity: Math.min(0.95, Math.max(0, pct / 100)),
                  });
                }}
                className="w-full accent-[var(--accent-primary)] cursor-pointer"
              />
            </div>

            <div className="bg-black/30 p-2 border border-white/10">
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[var(--accent-secondary)]" />
                  <span>Panel Backdrop Blur</span>
                </span>
                <span className="font-pixel text-[10px] text-[var(--accent-secondary)]">
                  {blurPx}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={blurPx}
                onChange={(e) => {
                  const px = Number(e.target.value);
                  onUpdateTheme({
                    ...theme,
                    backdropBlur: Math.min(16, Math.max(0, px)),
                  });
                }}
                className="w-full accent-[var(--accent-secondary)] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Pattern Overlay Selector */}
        <div>
          <label className="font-pixel text-[10px] uppercase opacity-80 block mb-1.5">
            3. PATTERN OVERLAY SELECTOR
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { id: 'none', label: 'None', icon: Square },
                { id: 'gingham', label: 'Gingham Check', icon: Sparkles },
                { id: 'scanlines', label: 'PS1 Scanlines', icon: Tv },
                { id: 'grid', label: 'Grid', icon: Grid },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active =
                theme.pattern === item.id ||
                (item.id === 'none' && theme.pattern === 'solid');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePatternChange(item.id)}
                  className={`px-2 py-2 ps1-button font-pixel text-[10px] flex flex-col items-center gap-1 ${
                    active
                      ? 'bg-[var(--accent-primary)] text-[#17181c] font-bold'
                      : 'bg-black/25 hover:bg-black/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Custom Color Mixer */}
        <div className="p-2.5 bg-black/20 border border-[var(--border-color,#17181c)]">
          <label className="font-pixel text-[10px] uppercase opacity-80 block mb-2">
            4. FINE-TUNE CSS VARIABLES PALETTE
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            <label className="flex items-center justify-between bg-black/25 px-2 py-1 border border-white/10">
              <span>--bg-primary</span>
              <input
                type="color"
                value={theme.bgPrimary}
                onChange={(e) => handleColorChange('bgPrimary', e.target.value)}
                className="w-6 h-6 cursor-pointer bg-transparent border-0"
              />
            </label>
            <label className="flex items-center justify-between bg-black/25 px-2 py-1 border border-white/10">
              <span>--bg-secondary</span>
              <input
                type="color"
                value={theme.bgSecondary}
                onChange={(e) => handleColorChange('bgSecondary', e.target.value)}
                className="w-6 h-6 cursor-pointer bg-transparent border-0"
              />
            </label>
            <label className="flex items-center justify-between bg-black/25 px-2 py-1 border border-white/10">
              <span>--bg-card</span>
              <input
                type="color"
                value={theme.bgCard || theme.bgSecondary}
                onChange={(e) => handleColorChange('bgCard', e.target.value)}
                className="w-6 h-6 cursor-pointer bg-transparent border-0"
              />
            </label>
            <label className="flex items-center justify-between bg-black/25 px-2 py-1 border border-white/10">
              <span>--accent</span>
              <input
                type="color"
                value={theme.accentPrimary}
                onChange={(e) =>
                  handleColorChange('accentPrimary', e.target.value)
                }
                className="w-6 h-6 cursor-pointer bg-transparent border-0"
              />
            </label>
            <label className="flex items-center justify-between bg-black/25 px-2 py-1 border border-white/10">
              <span>--text-primary</span>
              <input
                type="color"
                value={theme.textPrimary}
                onChange={(e) => handleColorChange('textPrimary', e.target.value)}
                className="w-6 h-6 cursor-pointer bg-transparent border-0"
              />
            </label>
            <label className="flex items-center justify-between bg-black/25 px-2 py-1 border border-white/10">
              <span>--border-color</span>
              <input
                type="color"
                value={theme.borderColor || '#17181c'}
                onChange={(e) => handleColorChange('borderColor', e.target.value)}
                className="w-6 h-6 cursor-pointer bg-transparent border-0"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 ps1-button bg-[var(--accent-primary)] text-[#17181c] font-pixel text-xs font-bold"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
