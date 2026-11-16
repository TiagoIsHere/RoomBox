import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export interface DesktopEntryInfo {
  name?: string;
  exec?: string;
  icon?: string;
  terminal: boolean;
  type?: string;
  noDisplay?: boolean;
}

export interface ExternalOpenResult {
  ok: boolean;
  error?: string;
  openedIn?: string;
}

export interface TerminalOpenResult {
  ok: boolean;
  terminal: string;
  error?: string;
}

const KNOWN_TERMINAL_EDITORS = new Set([
  'vim',
  'nvim',
  'vi',
  'view',
  'vimdiff',
  'nvimdiff',
  'helix',
  'hx',
  'nano',
  'pico',
  'micro',
  'kak',
  'kakoune',
  'joe',
  'ne',
  'jed',
  'mcedit',
  'vis',
  'amp',
  'tilde',
  'less',
  'more',
  'most',
  'bat',
]);

const TEXT_FALLBACK_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.rst',
  '.log',
  '.csv',
  '.tsv',
  '.json',
  '.jsonc',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.cfg',
  '.env',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rs',
  '.go',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.css',
  '.scss',
  '.html',
  '.xml',
  '.svg',
  '.sql',
  '.glsl',
]);

const LINUX_TERMINAL_CANDIDATES = [
  'x-terminal-emulator',
  'ghostty',
  'kitty',
  'alacritty',
  'wezterm',
  'foot',
  'gnome-terminal',
  'konsole',
  'xfce4-terminal',
  'mate-terminal',
  'tilix',
  'terminator',
  'lxterminal',
  'urxvt',
  'rxvt',
  'st',
  'xterm',
];

function isExecutableFile(candidate: string): boolean {
  try {
    const stat = fs.statSync(candidate);
    if (stat.isDirectory()) return false;
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function resolveExecutableInPath(
  bin: string,
  pathEnv = process.env.PATH || ''
): string | null {
  const trimmed = bin.trim();
  if (!trimmed) return null;

  if (trimmed.includes('/')) {
    return isExecutableFile(trimmed) ? trimmed : null;
  }

  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const fullPath = path.join(dir, trimmed);
    if (isExecutableFile(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export function findLinuxTerminal(
  env: NodeJS.ProcessEnv = process.env
): { name: string; executablePath: string } | null {
  const pathEnv = env.PATH || '';
  const envTerminal = env.TERMINAL?.trim();
  if (envTerminal) {
    const firstToken = envTerminal.split(/\s+/)[0];
    const resolvedEnvTerm =
      resolveExecutableInPath(envTerminal, pathEnv) ||
      resolveExecutableInPath(firstToken, pathEnv);
    if (resolvedEnvTerm) {
      return {
        name: path.basename(resolvedEnvTerm),
        executablePath: resolvedEnvTerm,
      };
    }
  }

  for (const candidate of LINUX_TERMINAL_CANDIDATES) {
    const resolved = resolveExecutableInPath(candidate, pathEnv);
    if (resolved) {
      return {
        name: candidate,
        executablePath: resolved,
      };
    }
  }

  return null;
}

function shellQuoteArg(arg: string): string {
  if (/^[a-zA-Z0-9_./:=+-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

export function buildTerminalDirArgs(terminalName: string, cwd: string): string[] {
  const base = path.basename(terminalName).toLowerCase();
  switch (base) {
    case 'ghostty':
    case 'gnome-terminal':
    case 'xfce4-terminal':
    case 'mate-terminal':
    case 'tilix':
    case 'terminator':
    case 'lxterminal':
      return [`--working-directory=${cwd}`];
    case 'alacritty':
    case 'foot':
      return ['--working-directory', cwd];
    case 'kitty':
      return ['--directory', cwd];
    case 'wezterm':
      return ['start', '--cwd', cwd];
    case 'konsole':
      return ['--workdir', cwd];
    default:
      return [];
  }
}

export function buildTerminalCommandArgs(
  terminalName: string,
  cwd: string,
  command: string,
  commandArgs: string[]
): string[] {
  const base = path.basename(terminalName).toLowerCase();
  const cmdTokens = [command, ...commandArgs];

  switch (base) {
    case 'ghostty':
      return [`--working-directory=${cwd}`, '-e', ...cmdTokens];
    case 'kitty':
      return ['--directory', cwd, ...cmdTokens];
    case 'alacritty':
      return ['--working-directory', cwd, '-e', ...cmdTokens];
    case 'wezterm':
      return ['start', '--cwd', cwd, '--', ...cmdTokens];
    case 'foot':
      return ['--working-directory', cwd, ...cmdTokens];
    case 'gnome-terminal':
      return [`--working-directory=${cwd}`, '--', ...cmdTokens];
    case 'konsole':
      return ['--workdir', cwd, '-e', ...cmdTokens];
    case 'xfce4-terminal':
    case 'mate-terminal':
    case 'terminator':
      return [`--working-directory=${cwd}`, '-x', ...cmdTokens];
    case 'tilix':
      return [
        `--working-directory=${cwd}`,
        '-e',
        cmdTokens.map(shellQuoteArg).join(' '),
      ];
    case 'lxterminal':
      return [`--working-directory=${cwd}`, '-e', ...cmdTokens];
    default:
      return ['-e', ...cmdTokens];
  }
}

export function parseDesktopEntry(content: string): DesktopEntryInfo {
  const result: DesktopEntryInfo = { terminal: false };
  let inDesktopEntry = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      inDesktopEntry = line === '[Desktop Entry]';
      continue;
    }
    if (!inDesktopEntry) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    if (key === 'Name') result.name = val;
    else if (key === 'Exec') result.exec = val;
    else if (key === 'Icon') result.icon = val;
    else if (key === 'Type') result.type = val;
    else if (key === 'NoDisplay') result.noDisplay = val.toLowerCase() === 'true';
    else if (key === 'Terminal') {
      const lowered = val.toLowerCase();
      result.terminal = lowered === 'true' || lowered === '1';
    }
  }

  return result;
}

function tokenizeExecLine(execLine: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let hasToken = false;

  for (let i = 0; i < execLine.length; i++) {
    const ch = execLine[i];

    if (inQuotes) {
      if (ch === '\\' && i + 1 < execLine.length) {
        const next = execLine[i + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          current += next;
          i++;
          continue;
        }
      }
      if (ch === '"') {
        inQuotes = false;
        continue;
      }
      current += ch;
      hasToken = true;
    } else {
      if (ch === '"') {
        inQuotes = true;
        hasToken = true;
      } else if (/\s/.test(ch)) {
        if (hasToken) {
          tokens.push(current);
          current = '';
          hasToken = false;
        }
      } else if (ch === '\\' && i + 1 < execLine.length) {
        current += execLine[i + 1];
        i++;
        hasToken = true;
      } else {
        current += ch;
        hasToken = true;
      }
    }
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}

export function buildCommandFromDesktopExec(
  execLine: string,
  filePath: string,
  options?: { name?: string; icon?: string; desktopFilePath?: string }
): string[] {
  const rawTokens = tokenizeExecLine(execLine);
  if (rawTokens.length === 0) return [];

  const fileUrl = pathToFileURL(filePath).toString();
  const expanded: string[] = [];
  let replacedFile = false;

  for (const token of rawTokens) {
    if (token === '%f' || token === '%F') {
      expanded.push(filePath);
      replacedFile = true;
      continue;
    }
    if (token === '%u' || token === '%U') {
      expanded.push(fileUrl);
      replacedFile = true;
      continue;
    }
    if (token === '%i') {
      if (options?.icon) {
        expanded.push('--icon', options.icon);
      }
      continue;
    }
    if (token === '%c') {
      if (options?.name) expanded.push(options.name);
      continue;
    }
    if (token === '%k') {
      if (options?.desktopFilePath) expanded.push(options.desktopFilePath);
      continue;
    }
    if (/^%[dDnNvm]$/.test(token)) {
      continue;
    }

    let out = '';
    for (let i = 0; i < token.length; i++) {
      if (token[i] === '%' && i + 1 < token.length) {
        const code = token[i + 1];
        if (code === '%') {
          out += '%';
          i++;
          continue;
        }
        if (code === 'f' || code === 'F') {
          out += filePath;
          replacedFile = true;
          i++;
          continue;
        }
        if (code === 'u' || code === 'U') {
          out += fileUrl;
          replacedFile = true;
          i++;
          continue;
        }
        if (code === 'c') {
          out += options?.name || '';
          i++;
          continue;
        }
        if (code === 'k') {
          out += options?.desktopFilePath || '';
          i++;
          continue;
        }
        if ('idDnNvm'.includes(code)) {
          i++;
          continue;
        }
      }
      out += token[i];
    }
    expanded.push(out);
  }

  if (!replacedFile) {
    expanded.push(filePath);
  }

  return expanded;
}

export function isTerminalCommand(
  cmdTokens: string[],
  entry?: DesktopEntryInfo | null
): boolean {
  if (entry?.terminal) return true;
  if (cmdTokens.length === 0) return false;

  let idx = 0;
  let cmdBase = path.basename(cmdTokens[idx]).toLowerCase();

  if (cmdBase === 'env') {
    idx++;
    while (idx < cmdTokens.length) {
      const tok = cmdTokens[idx];
      if (tok === '-u' || tok === '--unset') {
        idx += 2;
        continue;
      }
      if (tok.startsWith('-') || tok.includes('=')) {
        idx++;
        continue;
      }
      break;
    }
    if (idx >= cmdTokens.length) return false;
    cmdBase = path.basename(cmdTokens[idx]).toLowerCase();
  }

  if (KNOWN_TERMINAL_EDITORS.has(cmdBase)) {
    return true;
  }

  if (cmdBase === 'emacs' || cmdBase === 'emacsclient') {
    const rest = cmdTokens.slice(idx + 1);
    return rest.some(
      (a) => a === '-nw' || a === '--no-window-system' || a === '-t' || a === '--tty'
    );
  }

  return false;
}

export function getXdgApplicationDirs(
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = os.homedir()
): string[] {
  const dataHome = env.XDG_DATA_HOME?.trim() || path.join(homeDir, '.local', 'share');
  const dataDirsRaw = env.XDG_DATA_DIRS?.trim() || '/usr/local/share:/usr/share';
  const dataDirs = dataDirsRaw
    .split(path.delimiter)
    .map((d) => d.trim())
    .filter(Boolean);

  const candidates = [
    path.join(dataHome, 'applications'),
    ...dataDirs.map((d) => path.join(d, 'applications')),
    path.join(homeDir, '.local', 'share', 'flatpak', 'exports', 'share', 'applications'),
    '/var/lib/flatpak/exports/share/applications',
  ];

  return Array.from(new Set(candidates));
}

function searchDesktopInDir(dir: string, desktopId: string, depth = 0): string | null {
  if (depth > 3 || !fs.existsSync(dir)) return null;

  const direct = path.join(dir, desktopId);
  if (fs.existsSync(direct)) return direct;

  if (desktopId.includes('-')) {
    const slashVariant = path.join(dir, desktopId.replace(/-/g, path.sep));
    if (fs.existsSync(slashVariant)) return slashVariant;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const found = searchDesktopInDir(path.join(dir, ent.name), desktopId, depth + 1);
        if (found) return found;
      }
    }
  } catch {
    // Ignore permission errors
  }

  return null;
}

export function findDesktopFilePath(
  desktopId: string,
  appDirs: string[] = getXdgApplicationDirs()
): string | null {
  if (!desktopId) return null;
  if (path.isAbsolute(desktopId) && fs.existsSync(desktopId)) {
    return desktopId;
  }

  for (const dir of appDirs) {
    const found = searchDesktopInDir(dir, desktopId);
    if (found) return found;
  }

  return null;
}

function runCommandStdout(command: string, args: string[], timeoutMs = 2500): Promise<string> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err) {
        resolve('');
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function queryDefaultDesktopIdForFile(filePath: string): Promise<string | null> {
  let mimeType = await runCommandStdout('xdg-mime', ['query', 'filetype', filePath]);

  if (!mimeType) {
    const gioOut = await runCommandStdout('gio', [
      'info',
      '-a',
      'standard::content-type',
      filePath,
    ]);
    const match = gioOut.match(/standard::content-type:\s*(\S+)/);
    if (match) mimeType = match[1];
  }

  if (mimeType) {
    const directDefault = await runCommandStdout('xdg-mime', [
      'query',
      'default',
      mimeType,
    ]);
    if (directDefault) return directDefault;

    const gioMimeOut = await runCommandStdout('gio', ['mime', mimeType]);
    const firstLine = gioMimeOut.split(/\r?\n/)[0] || '';
    const desktopMatch = firstLine.match(/(\S+\.desktop)\s*$/);
    if (desktopMatch) return desktopMatch[1];
  }

  const ext = path.extname(filePath).toLowerCase();
  const isTextLike =
    mimeType.startsWith('text/') ||
    mimeType === 'inode/x-empty' ||
    mimeType === 'application/x-zerosize' ||
    TEXT_FALLBACK_EXTENSIONS.has(ext);

  if (isTextLike) {
    const textDefault = await runCommandStdout('xdg-mime', [
      'query',
      'default',
      'text/plain',
    ]);
    if (textDefault) return textDefault;
  }

  return null;
}

export function spawnDetached(
  command: string,
  args: string[],
  cwd?: string
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const safeCwd = cwd && fs.existsSync(cwd) ? cwd : undefined;

    try {
      const child = spawn(command, args, {
        cwd: safeCwd,
        detached: true,
        stdio: 'ignore',
      });

      child.once('error', (err) => {
        if (!settled) {
          settled = true;
          resolve({ ok: false, error: err.message });
        }
      });

      child.once('spawn', () => {
        child.unref();
        if (!settled) {
          settled = true;
          resolve({ ok: true });
        }
      });
    } catch (err: any) {
      if (!settled) {
        settled = true;
        resolve({ ok: false, error: err?.message || String(err) });
      }
    }
  });
}

export async function openLinuxTerminalAtDir(
  targetDir: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<TerminalOpenResult> {
  const safeDir = fs.existsSync(targetDir) ? targetDir : os.homedir();
  const terminal = findLinuxTerminal(env);

  if (!terminal) {
    return {
      ok: false,
      terminal: 'Linux Terminal',
      error: 'No terminal emulator found in PATH (set $TERMINAL or install a terminal emulator).',
    };
  }

  const args = buildTerminalDirArgs(terminal.name, safeDir);
  const launched = await spawnDetached(terminal.executablePath, args, safeDir);

  return {
    ok: launched.ok,
    terminal: terminal.name,
    error: launched.error,
  };
}

export interface OpenLinuxFileDeps {
  queryDefaultDesktopId?: (filePath: string) => Promise<string | null>;
  findDesktopFile?: (desktopId: string) => string | null;
  readDesktopFile?: (desktopPath: string) => string;
  findTerminal?: () => { name: string; executablePath: string } | null;
  spawnProcess?: (
    command: string,
    args: string[],
    cwd?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  fallbackShellOpenPath?: (filePath: string) => Promise<string>;
}

export async function openLinuxFileSafely(
  filePath: string,
  deps: OpenLinuxFileDeps = {}
): Promise<ExternalOpenResult> {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    return { ok: false, error: `File does not exist: ${resolvedPath}` };
  }

  const queryDesktopId = deps.queryDefaultDesktopId || queryDefaultDesktopIdForFile;
  const locateDesktop = deps.findDesktopFile || ((id) => findDesktopFilePath(id));
  const readDesktop =
    deps.readDesktopFile || ((p) => fs.readFileSync(p, 'utf-8'));
  const detectTerminal = deps.findTerminal || (() => findLinuxTerminal());
  const launch = deps.spawnProcess || spawnDetached;
  const fileDir = path.dirname(resolvedPath);

  const defaultDesktopId = await queryDesktopId(resolvedPath);
  if (defaultDesktopId) {
    const desktopFilePath = locateDesktop(defaultDesktopId);
    if (desktopFilePath) {
      try {
        const entry = parseDesktopEntry(readDesktop(desktopFilePath));
        if (entry.exec) {
          const cmdTokens = buildCommandFromDesktopExec(entry.exec, resolvedPath, {
            name: entry.name,
            icon: entry.icon,
            desktopFilePath,
          });

          if (cmdTokens.length > 0 && isTerminalCommand(cmdTokens, entry)) {
            const terminal = detectTerminal();
            if (!terminal) {
              return {
                ok: false,
                error: `Cannot open "${path.basename(resolvedPath)}" in terminal editor (${
                  entry.name || cmdTokens[0]
                }): no terminal emulator found in PATH.`,
              };
            }

            const [cmd, ...cmdArgs] = cmdTokens;
            const termArgs = buildTerminalCommandArgs(
              terminal.name,
              fileDir,
              cmd,
              cmdArgs
            );
            const spawned = await launch(terminal.executablePath, termArgs, fileDir);
            if (!spawned.ok) {
              return {
                ok: false,
                error: spawned.error || `Failed to launch ${terminal.name}`,
              };
            }
            return {
              ok: true,
              openedIn: `${terminal.name} (${entry.name || path.basename(cmd)})`,
            };
          }
        }
      } catch {
        // Fall through to detached xdg-open if .desktop parsing fails
      }
    }
  }

  // Non-terminal default app (or no .desktop found): launch xdg-open / gio open
  // completely detached with stdio: 'ignore' so it never inherits the parent TTY or blocks.
  const xdgOpenRes = await launch('xdg-open', [resolvedPath], fileDir);
  if (xdgOpenRes.ok) {
    return { ok: true };
  }

  const gioOpenRes = await launch('gio', ['open', resolvedPath], fileDir);
  if (gioOpenRes.ok) {
    return { ok: true };
  }

  if (deps.fallbackShellOpenPath) {
    const errMsg = await deps.fallbackShellOpenPath(resolvedPath);
    return errMsg ? { ok: false, error: errMsg } : { ok: true };
  }

  return {
    ok: false,
    error: xdgOpenRes.error || gioOpenRes.error || 'Failed to open file externally.',
  };
}
