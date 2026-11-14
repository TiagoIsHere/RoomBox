import { ActionLogItem, PathHistoryEntry, RoomFileItem, TodoItem } from './types';

function createPixelArtSvg(
  bg: string,
  accent: string,
  secondary: string,
  title: string,
  motif: 'bunny' | 'cd' | 'camera' | 'tv' | 'potion' | 'dango'
): string {
  let shapes = '';
  if (motif === 'bunny') {
    shapes = `
      <rect x="20" y="10" width="8" height="22" fill="${accent}" stroke="#17181c" stroke-width="2"/>
      <rect x="36" y="10" width="8" height="22" fill="${accent}" stroke="#17181c" stroke-width="2"/>
      <rect x="16" y="26" width="32" height="26" fill="#FAF3EB" stroke="#17181c" stroke-width="2"/>
      <rect x="22" y="35" width="4" height="5" fill="#17181c"/>
      <rect x="38" y="35" width="4" height="5" fill="#17181c"/>
      <rect x="22" y="40" width="3" height="4" fill="#7EC8E3"/>
      <rect x="30" y="42" width="4" height="2" fill="${accent}"/>
    `;
  } else if (motif === 'cd') {
    shapes = `
      <circle cx="32" cy="32" r="22" fill="${secondary}" stroke="#17181c" stroke-width="2"/>
      <path d="M32 10 A22 22 0 0 1 54 32 L32 32 Z" fill="${accent}" opacity="0.65"/>
      <circle cx="32" cy="32" r="7" fill="${bg}" stroke="#17181c" stroke-width="2"/>
      <circle cx="32" cy="32" r="2" fill="#FAF3EB"/>
    `;
  } else if (motif === 'camera') {
    shapes = `
      <rect x="12" y="18" width="40" height="30" fill="#EAE6DF" stroke="#17181c" stroke-width="2"/>
      <rect x="18" y="13" width="12" height="5" fill="${accent}" stroke="#17181c" stroke-width="2"/>
      <circle cx="34" cy="33" r="10" fill="${secondary}" stroke="#17181c" stroke-width="2"/>
      <circle cx="31" cy="30" r="3" fill="#FFFFFF"/>
      <rect x="16" y="23" width="6" height="4" fill="${accent}"/>
    `;
  } else if (motif === 'tv') {
    shapes = `
      <rect x="12" y="16" width="40" height="34" fill="${secondary}" stroke="#17181c" stroke-width="2"/>
      <rect x="16" y="20" width="26" height="22" fill="#1E2229" stroke="#17181c" stroke-width="2"/>
      <line x1="22" y1="8" x2="30" y2="16" stroke="#EAE6DF" stroke-width="2"/>
      <line x1="42" y1="8" x2="34" y2="16" stroke="#EAE6DF" stroke-width="2"/>
      <rect x="45" y="24" width="4" height="4" fill="${accent}"/>
      <rect x="45" y="32" width="4" height="4" fill="#EAE6DF"/>
    `;
  } else if (motif === 'dango') {
    shapes = `
      <line x1="16" y1="48" x2="48" y2="16" stroke="#D7B377" stroke-width="3"/>
      <circle cx="40" cy="24" r="8" fill="#D8A7B1" stroke="#17181c" stroke-width="2"/>
      <circle cx="32" cy="32" r="8" fill="#FAF3EB" stroke="#17181c" stroke-width="2"/>
      <circle cx="24" y="40" r="8" fill="#9CC5A1" stroke="#17181c" stroke-width="2"/>
    `;
  } else {
    shapes = `
      <rect x="24" y="12" width="16" height="6" fill="#EAE6DF" stroke="#17181c" stroke-width="2"/>
      <polygon points="18,26 46,26 50,50 14,50" fill="${accent}" stroke="#17181c" stroke-width="2"/>
      <rect x="24" y="34" width="16" height="10" fill="#FAF3EB" stroke="#17181c" stroke-width="1.5"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">
    <rect width="64" height="64" fill="${bg}"/>
    <rect x="2" y="2" width="60" height="60" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2"/>
    ${shapes}
    <rect x="4" y="52" width="56" height="9" fill="#17181c" opacity="0.8"/>
    <text x="32" y="59" font-family="monospace" font-size="7" fill="#EAE6DF" text-anchor="middle">${title}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface FolderStickerPreset {
  id: string;
  label: string;
  dataUrl: string;
}

export const FOLDER_STICKER_PRESETS: FolderStickerPreset[] = [
  {
    id: 'sticker-bunny',
    label: 'USAGI_99',
    dataUrl: createPixelArtSvg('#3A3F4B', '#D8A7B1', '#B6A6CA', 'USAGI_99', 'bunny'),
  },
  {
    id: 'sticker-cd',
    label: 'DISC_01',
    dataUrl: createPixelArtSvg('#262936', '#39C5BB', '#B6A6CA', 'DISC_01', 'cd'),
  },
  {
    id: 'sticker-dango',
    label: 'DANGO',
    dataUrl: createPixelArtSvg('#3B282E', '#D8A7B1', '#9CC5A1', 'DANGO', 'dango'),
  },
  {
    id: 'sticker-camera',
    label: 'CYBERSHOT',
    dataUrl: createPixelArtSvg('#2E323B', '#D96B6B', '#8BB8D6', 'CYBERSHOT', 'camera'),
  },
  {
    id: 'sticker-tv',
    label: 'CH_03',
    dataUrl: createPixelArtSvg('#24222E', '#E0B85A', '#7A6F9B', 'CH_03', 'tv'),
  },
  {
    id: 'sticker-potion',
    label: 'ELIXIR',
    dataUrl: createPixelArtSvg('#2B1E22', '#D8A7B1', '#E0B85A', 'ELIXIR', 'potion'),
  },
];

export const INITIAL_DEMO_FILES: RoomFileItem[] = [
  // Root Folders
  {
    id: 'folder-art-inspo',
    name: '01_Art_Inspo',
    type: 'folder',
    parentId: null,
    size: '4 items',
    modifiedAt: '1999-11-14 22:18',
    ino: 100201,
    permissions: '0755 (rwxr-xr-x)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 6,
    gitStatus: 'M',
    folderPfp: FOLDER_STICKER_PRESETS[0].dataUrl,
    folderStickerLabel: 'USAGI_99',
    comment: 'Scanned magazine clippings, Lain storyboards, and pastel gothic bedroom references.',
    hashtags: ['#inspo', '#assets', '#bedroomcore'],
    pinned: true,
  },
  {
    id: 'folder-ps1-assets',
    name: '02_PS1_Game_Assets',
    type: 'folder',
    parentId: null,
    size: '3 items',
    modifiedAt: '2000-02-03 01:40',
    ino: 100202,
    permissions: '0755 (rwxr-xr-x)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 5,
    gitStatus: 'A',
    folderPfp: FOLDER_STICKER_PRESETS[1].dataUrl,
    folderStickerLabel: 'DISC_01',
    comment: 'Low-poly textures, shader snippets, and memory card icon exports.',
    hashtags: ['#ps1', '#assets', '#wip'],
    pinned: true,
  },
  {
    id: 'folder-soundtrack',
    name: '03_LateNight_Tapes',
    type: 'folder',
    parentId: null,
    size: '3 items',
    modifiedAt: '2000-04-19 03:12',
    ino: 100203,
    permissions: '0755 (rwxr-xr-x)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 5,
    folderPfp: FOLDER_STICKER_PRESETS[4].dataUrl,
    folderStickerLabel: 'CH_03',
    comment: 'Jungle breaks, ambient menu pads, and cassette recordings from 3AM.',
    hashtags: ['#audio', '#ost'],
    pinned: true,
  },
  {
    id: 'folder-final-exports',
    name: '04_Final_Exports',
    type: 'folder',
    parentId: null,
    size: '2 items',
    modifiedAt: '2000-08-29 23:55',
    ino: 100204,
    permissions: '0755 (rwxr-xr-x)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 4,
    folderPfp: FOLDER_STICKER_PRESETS[2].dataUrl,
    folderStickerLabel: 'DANGO',
    comment: 'Ready-to-ship deliverables and archive packages.',
    hashtags: ['#exports', '#final'],
    pinned: true,
  },

  // Root-level files (including Git status badges & Symlink item)
  {
    id: 'file-readme-note',
    name: 'quickstart_shortcuts.txt',
    type: 'note',
    parentId: null,
    size: '2.1 KB',
    modifiedAt: '2000-11-13 21:00',
    ino: 200301,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    gitStatus: 'M',
    content: `=== ROOMBOX v3.5 // ELECTRON POWER-USER FILE OS ===

• Press [Cmd/Ctrl + K] to open the Command Palette (Auto-Sort, Batch Rename, Split-Pane).
• Toggle [VIM: ON] in the TitleBar to use j/k/h/l, gg, G, Enter, Backspace, yy, and dd.
• Right-click any item to Create Symlink, Create Hardlink, Move to Trash, or Permanent Delete (Shift+Delete).
• Git Status Pills (M, U, A, D) appear automatically on tracked repository files.`,
    comment: 'Quick keyboard & workflow cheatsheet taped to the desk.',
    hashtags: ['#manual', '#wip'],
  },
  {
    id: 'file-symlink-cover',
    name: 'latest_cover_symlink.png',
    type: 'image',
    parentId: null,
    size: '48 B → 312 KB',
    modifiedAt: '2001-01-10 11:20',
    ino: 200309,
    permissions: '0777 (rwxrwxrwx)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    isSymlink: true,
    symlinkTarget: '/RoomBox_Root/04_Final_Exports/album_cover_final.png',
    symlinkTargetId: 'file-cover-export',
    gitStatus: 'A',
    imageUrl: createPixelArtSvg('#2B1E22', '#D8A7B1', '#F4E8D8', 'COVER_FINAL', 'potion'),
    comment: 'Symbolic link pointing to /04_Final_Exports/album_cover_final.png.',
    hashtags: ['#symlink', '#exports'],
  },
  {
    id: 'file-polaroid-desk',
    name: 'crt_desk_2001.png',
    type: 'image',
    parentId: null,
    size: '148 KB',
    modifiedAt: '2001-01-09 19:32',
    ino: 200302,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    gitStatus: 'U',
    imageUrl: createPixelArtSvg('#2E323B', '#D8A7B1', '#B6A6CA', 'CRT_DESK_01', 'tv'),
    comment: 'Sony Trinitron monitor photo with taped dango stickers.',
    hashtags: ['#inspo', '#bedroomcore'],
  },
  {
    id: 'file-root-breakbeat',
    name: 'menu_select_loop.wav',
    type: 'audio',
    parentId: null,
    size: '620 KB',
    modifiedAt: '2001-01-11 02:15',
    ino: 200303,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    audioFreqs: [523.25, 659.25, 783.99, 1046.5],
    comment: 'Unfiled menu chime sample sitting on the desktop.',
    hashtags: ['#audio', '#wip'],
  },
  {
    id: 'file-root-archive',
    name: 'ps1_font_bundle.zip',
    type: 'archive',
    parentId: null,
    size: '1.8 MB',
    modifiedAt: '2001-01-12 16:40',
    ino: 200304,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    content: 'Archive containing Silkscreen.ttf, SpaceMono.ttf, and bitmap sprite fonts.',
    comment: 'Bitmap font pack ready to be sorted.',
    hashtags: ['#assets', '#ps1'],
  },

  // Inside 01_Art_Inspo
  {
    id: 'file-sketch-01',
    name: 'sketch_01_usagi.png',
    type: 'image',
    parentId: 'folder-art-inspo',
    size: '96 KB',
    modifiedAt: '1999-11-14 21:10',
    ino: 200401,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    gitStatus: 'M',
    imageUrl: createPixelArtSvg('#3A3F4B', '#D8A7B1', '#EAE6DF', 'SKETCH_01', 'bunny'),
    comment: 'Character turnaround sheet with oversized sleeves and safety pins.',
    hashtags: ['#inspo', '#wip', '#assets'],
  },
  {
    id: 'file-cybershot-dump',
    name: 'shibuya_rain_cam.png',
    type: 'image',
    parentId: 'folder-art-inspo',
    size: '210 KB',
    modifiedAt: '1999-12-02 18:05',
    ino: 200402,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    imageUrl: createPixelArtSvg('#252934', '#8BB8D6', '#D8A7B1', 'DSC_0042', 'camera'),
    comment: 'Low-res 640x480 Mavica floppy camera shot near the station.',
    hashtags: ['#inspo', '#photography'],
  },
  {
    id: 'file-color-palette',
    name: 'moodboard_swatches.txt',
    type: 'note',
    parentId: 'folder-art-inspo',
    size: '1.1 KB',
    modifiedAt: '1999-12-19 00:42',
    ino: 200403,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    content: `PALETTE NOTES:
- Hazy Slate: #2E323B / #3A3F4B
- Dusty Rose: #D8A7B1
- Faded Lavender: #B6A6CA
- Warm Off-White: #EAE6DF
- Late Night Lamp Amber: #E0B85A`,
    comment: 'Desaturated visual novel UI hex values.',
    hashtags: ['#inspo', '#ui'],
  },
  {
    id: 'file-dango-charm',
    name: 'cellphone_strap.png',
    type: 'image',
    parentId: 'folder-art-inspo',
    size: '64 KB',
    modifiedAt: '2000-01-15 14:22',
    ino: 200404,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    imageUrl: createPixelArtSvg('#2B1E22', '#D96B6B', '#F4E8D8', 'STRAP_REF', 'dango'),
    comment: 'Enamel dango charm for flip phone antenna.',
    hashtags: ['#bedroomcore', '#inspo'],
  },

  // Inside 02_PS1_Game_Assets
  {
    id: 'file-disc-iso-cover',
    name: 'poly_memory_card.png',
    type: 'image',
    parentId: 'folder-ps1-assets',
    size: '128 KB',
    modifiedAt: '2000-02-10 16:40',
    ino: 200501,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    gitStatus: 'A',
    imageUrl: createPixelArtSvg('#202430', '#39C5BB', '#E0B85A', 'MEM_BLOCK_1', 'cd'),
    comment: '15-block PS1 memory card icon test.',
    hashtags: ['#ps1', '#assets'],
  },
  {
    id: 'file-shader-notes',
    name: 'affine_texture.glsl',
    type: 'code',
    parentId: 'folder-ps1-assets',
    size: '1.8 KB',
    modifiedAt: '2000-02-14 04:15',
    ino: 200502,
    permissions: '0755 (rwxr-xr-x)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    gitStatus: 'M',
    content: `vec4 snapToPixelGrid(vec4 clipPos, vec2 res) {
  vec2 snapped = floor(clipPos.xy / clipPos.w * res + 0.5) / res;
  clipPos.xy = snapped * clipPos.w;
  return clipPos;
}`,
    comment: 'PlayStation 1 GTE fixed-point vertex snapping formula.',
    hashtags: ['#ps1', '#code'],
  },
  {
    id: 'file-ui-layout-spec',
    name: 'window_border_spec.txt',
    type: 'note',
    parentId: 'folder-ps1-assets',
    size: '1.2 KB',
    modifiedAt: '2000-02-18 19:20',
    ino: 200503,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    content: 'Use crisp 1.5px-2px #17181c borders with subtle inner top-left highlight.',
    comment: 'Retro dialog box border specs.',
    hashtags: ['#ui', '#ps1'],
  },

  // Inside 03_LateNight_Tapes
  {
    id: 'file-audio-menu-theme',
    name: 'memory_card_chime.wav',
    type: 'audio',
    parentId: 'folder-soundtrack',
    size: '840 KB',
    modifiedAt: '2000-04-19 02:10',
    ino: 200601,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    audioFreqs: [523.25, 659.25, 783.99, 987.77, 783.99, 1046.5],
    comment: 'Dreamy 6-note crystal synth pad when booting up the console at midnight.',
    hashtags: ['#audio', '#ost', '#ps1'],
  },
  {
    id: 'file-audio-rain-loop',
    name: 'tokyo_3am_SavePoint.wav',
    type: 'audio',
    parentId: 'folder-soundtrack',
    size: '1.4 MB',
    modifiedAt: '2000-04-21 03:45',
    ino: 200602,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    audioFreqs: [440, 523.25, 659.25, 587.33, 493.88, 440],
    comment: 'Save-room electric piano loop with subtle tape hiss.',
    hashtags: ['#audio', '#ost'],
  },
  {
    id: 'file-audio-dnb',
    name: 'liquid_jungle_168bpm.wav',
    type: 'audio',
    parentId: 'folder-soundtrack',
    size: '2.1 MB',
    modifiedAt: '2000-05-02 01:15',
    ino: 200603,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    audioFreqs: [659.25, 783.99, 659.25, 987.77, 880.0, 783.99],
    comment: 'PS1 racing menu breakbeat chop.',
    hashtags: ['#audio', '#wip'],
  },

  // Inside 04_Final_Exports
  {
    id: 'file-cover-export',
    name: 'album_cover_final.png',
    type: 'image',
    parentId: 'folder-final-exports',
    size: '312 KB',
    modifiedAt: '2000-09-01 12:00',
    ino: 200701,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 2,
    imageUrl: createPixelArtSvg('#2B1E22', '#D8A7B1', '#F4E8D8', 'COVER_FINAL', 'potion'),
    comment: 'Mastered jewel-case front cover print.',
    hashtags: ['#exports', '#final'],
  },
  {
    id: 'file-release-notes',
    name: 'release_manifest.txt',
    type: 'note',
    parentId: 'folder-final-exports',
    size: '0.9 KB',
    modifiedAt: '2000-09-02 15:30',
    ino: 200702,
    permissions: '0644 (rw-r--r--)',
    ownerUid: 501,
    ownerGid: 20,
    nlink: 1,
    content: 'Master disc Gold build verified. Checksum OK.',
    comment: 'Gold master sign-off note.',
    hashtags: ['#final'],
  },
];

export const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo-1',
    text: 'Toggle VIM: ON in TitleBar and test j/k/l/h/gg/G navigation',
    completed: false,
    createdAt: '22:10',
  },
  {
    id: 'todo-2',
    text: 'Inspect latest_cover_symlink.png & jump to target path',
    completed: false,
    createdAt: '22:30',
  },
  {
    id: 'todo-3',
    text: 'Right-click any file to Create Symlink or Hardlink',
    completed: true,
    createdAt: '22:45',
  },
  {
    id: 'todo-4',
    text: 'Press Cmd/Ctrl + K to run 1-click Auto-Sort by Type',
    completed: false,
    createdAt: '23:00',
  },
];

export const INITIAL_ACTION_LOGS: ActionLogItem[] = [
  {
    id: 'log-1',
    timestamp: '22:41:09',
    actionType: 'move',
    summary: 'Moved sketch_01_usagi.png → /01_Art_Inspo',
    fromPath: '/Downloads',
    toPath: '/01_Art_Inspo',
  },
  {
    id: 'log-2',
    timestamp: '22:48:32',
    actionType: 'link',
    summary: 'Created symlink latest_cover_symlink.png → /04_Final_Exports/album_cover_final.png',
  },
  {
    id: 'log-3',
    timestamp: '22:54:15',
    actionType: 'pfp',
    summary: 'Set folder PFP on 01_Art_Inspo → USAGI_99',
  },
];

export const INITIAL_PATH_HISTORY: PathHistoryEntry[] = [
  {
    id: 'ph-1',
    folderId: null,
    pathString: '/RoomBox_Root',
    timestamp: '22:40:00',
  },
  {
    id: 'ph-2',
    folderId: 'folder-art-inspo',
    pathString: '/RoomBox_Root/01_Art_Inspo',
    timestamp: '22:42:10',
  },
  {
    id: 'ph-3',
    folderId: 'folder-ps1-assets',
    pathString: '/RoomBox_Root/02_PS1_Game_Assets',
    timestamp: '22:50:05',
  },
];
