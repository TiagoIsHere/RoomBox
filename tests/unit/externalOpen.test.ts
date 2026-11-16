import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  buildCommandFromDesktopExec,
  buildTerminalCommandArgs,
  buildTerminalDirArgs,
  findDesktopFilePath,
  findLinuxTerminal,
  isTerminalCommand,
  openLinuxFileSafely,
  parseDesktopEntry,
  spawnDetached,
} from '../../electron/externalOpen';

describe('externalOpen — Safe Linux Terminal & External Editor Launcher', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-extopen-'));
  });

  afterEach(async () => {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('parses [Desktop Entry] Terminal=true and ignores subsequent [Desktop Action] sections', () => {
    const desktopContent = `
[Desktop Entry]
Name=Helix
Exec=helix %F
Icon=helix
Terminal=true
Type=Application

[Desktop Action new-window]
Name=New Window
Exec=helix --new
Terminal=false
`;
    const parsed = parseDesktopEntry(desktopContent);
    expect(parsed.name).toBe('Helix');
    expect(parsed.exec).toBe('helix %F');
    expect(parsed.icon).toBe('helix');
    expect(parsed.terminal).toBe(true);
    expect(parsed.type).toBe('Application');
  });

  it('expands desktop Exec field codes with file paths containing spaces safely', () => {
    const filePath = '/tmp/my roombox notes/hello world.txt';
    expect(buildCommandFromDesktopExec('helix %F', filePath)).toEqual([
      'helix',
      filePath,
    ]);
    expect(
      buildCommandFromDesktopExec('"/usr/bin/my editor" --wait %f', filePath)
    ).toEqual(['/usr/bin/my editor', '--wait', filePath]);
    expect(buildCommandFromDesktopExec('nvim', filePath)).toEqual([
      'nvim',
      filePath,
    ]);
  });

  it('detects terminal editors via Terminal=true or known terminal editor binaries', () => {
    expect(
      isTerminalCommand(['helix', '/tmp/a.txt'], { terminal: true })
    ).toBe(true);
    expect(
      isTerminalCommand(['/usr/bin/nvim', '/tmp/a.txt'], { terminal: false })
    ).toBe(true);
    expect(
      isTerminalCommand(['env', 'NVIM_APPNAME=lazy', 'nvim', '/tmp/a.txt'], {
        terminal: false,
      })
    ).toBe(true);
    expect(
      isTerminalCommand(['emacs', '-nw', '/tmp/a.txt'], { terminal: false })
    ).toBe(true);
    expect(
      isTerminalCommand(['code', '--reuse-window', '/tmp/a.txt'], {
        terminal: false,
      })
    ).toBe(false);
    expect(
      isTerminalCommand(['neovide', '/tmp/a.txt'], { terminal: false })
    ).toBe(false);
  });

  it('finds terminal emulators respecting $TERMINAL and falling back across PATH', async () => {
    const binDir = path.join(tempDir, 'bin');
    await fs.mkdir(binDir, { recursive: true });
    const ghosttyPath = path.join(binDir, 'ghostty');
    const alacrittyPath = path.join(binDir, 'alacritty');
    await fs.writeFile(ghosttyPath, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    await fs.writeFile(alacrittyPath, '#!/bin/sh\nexit 0\n', { mode: 0o755 });

    const detectedDefault = findLinuxTerminal({ PATH: binDir });
    expect(detectedDefault?.name).toBe('ghostty');
    expect(detectedDefault?.executablePath).toBe(ghosttyPath);

    const detectedOverride = findLinuxTerminal({
      PATH: binDir,
      TERMINAL: 'alacritty',
    });
    expect(detectedOverride?.name).toBe('alacritty');
    expect(detectedOverride?.executablePath).toBe(alacrittyPath);
  });

  it('builds proper CLI arguments for launching commands and directories in Linux terminals', () => {
    expect(buildTerminalDirArgs('ghostty', '/tmp/work')).toEqual([
      '--working-directory=/tmp/work',
    ]);
    expect(
      buildTerminalCommandArgs('ghostty', '/tmp/work', 'helix', [
        '/tmp/work/note.txt',
      ])
    ).toEqual([
      '--working-directory=/tmp/work',
      '-e',
      'helix',
      '/tmp/work/note.txt',
    ]);
    expect(
      buildTerminalCommandArgs('kitty', '/tmp/work', 'nvim', ['/tmp/work/a.md'])
    ).toEqual(['--directory', '/tmp/work', 'nvim', '/tmp/work/a.md']);
    expect(
      buildTerminalCommandArgs('wezterm', '/tmp/work', 'vim', ['/tmp/work/a.txt'])
    ).toEqual(['start', '--cwd', '/tmp/work', '--', 'vim', '/tmp/work/a.txt']);
    expect(
      buildTerminalCommandArgs('gnome-terminal', '/tmp/work', 'hx', [
        '/tmp/work/a.txt',
      ])
    ).toEqual(['--working-directory=/tmp/work', '--', 'hx', '/tmp/work/a.txt']);
  });

  it('locates .desktop files in XDG application directories including vendor-subdir format', async () => {
    const appsDir = path.join(tempDir, 'applications');
    await fs.mkdir(path.join(appsDir, 'vendor'), { recursive: true });
    const helixDesktop = path.join(appsDir, 'Helix.desktop');
    const vendorDesktop = path.join(appsDir, 'vendor', 'app.desktop');
    await fs.writeFile(helixDesktop, '[Desktop Entry]\nName=Helix\n', 'utf-8');
    await fs.writeFile(vendorDesktop, '[Desktop Entry]\nName=VendorApp\n', 'utf-8');

    expect(findDesktopFilePath('Helix.desktop', [appsDir])).toBe(helixDesktop);
    expect(findDesktopFilePath('vendor-app.desktop', [appsDir])).toBe(
      vendorDesktop
    );
  });

  it('launches Terminal=true editors inside a detached new terminal window instead of xdg-open', async () => {
    const notePath = path.join(tempDir, 'notes with spaces.txt');
    await fs.writeFile(notePath, 'hello roombox\n', 'utf-8');

    const appsDir = path.join(tempDir, 'applications');
    await fs.mkdir(appsDir, { recursive: true });
    const desktopPath = path.join(appsDir, 'Helix.desktop');
    await fs.writeFile(
      desktopPath,
      '[Desktop Entry]\nName=Helix\nExec=helix %F\nTerminal=true\nType=Application\n',
      'utf-8'
    );

    const spawnedCalls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];

    const result = await openLinuxFileSafely(notePath, {
      queryDefaultDesktopId: async () => 'Helix.desktop',
      findDesktopFile: (id) => findDesktopFilePath(id, [appsDir]),
      findTerminal: () => ({
        name: 'ghostty',
        executablePath: '/usr/bin/ghostty',
      }),
      spawnProcess: async (cmd, args, cwd) => {
        spawnedCalls.push({ cmd, args, cwd });
        return { ok: true };
      },
      fallbackShellOpenPath: async () => {
        throw new Error('shell.openPath should not be called for terminal editors');
      },
    });

    expect(result.ok).toBe(true);
    expect(result.openedIn).toBe('ghostty (Helix)');
    expect(spawnedCalls).toEqual([
      {
        cmd: '/usr/bin/ghostty',
        args: [`--working-directory=${tempDir}`, '-e', 'helix', notePath],
        cwd: tempDir,
      },
    ]);
  });

  it('refuses to run a terminal editor in-place when no GUI terminal emulator is available', async () => {
    const notePath = path.join(tempDir, 'readme.md');
    await fs.writeFile(notePath, '# hi\n', 'utf-8');

    const appsDir = path.join(tempDir, 'applications');
    await fs.mkdir(appsDir, { recursive: true });
    await fs.writeFile(
      path.join(appsDir, 'vim.desktop'),
      '[Desktop Entry]\nName=Vim\nExec=vim %F\nTerminal=true\nType=Application\n',
      'utf-8'
    );

    const spawnedCalls: any[] = [];
    const result = await openLinuxFileSafely(notePath, {
      queryDefaultDesktopId: async () => 'vim.desktop',
      findDesktopFile: (id) => findDesktopFilePath(id, [appsDir]),
      findTerminal: () => null,
      spawnProcess: async (cmd, args, cwd) => {
        spawnedCalls.push({ cmd, args, cwd });
        return { ok: true };
      },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('no terminal emulator found');
    expect(spawnedCalls).toHaveLength(0);
  });

  it('launches non-terminal GUI apps via detached xdg-open instead of blocking', async () => {
    const notePath = path.join(tempDir, 'script.ts');
    await fs.writeFile(notePath, 'export const x = 1;\n', 'utf-8');

    const appsDir = path.join(tempDir, 'applications');
    await fs.mkdir(appsDir, { recursive: true });
    await fs.writeFile(
      path.join(appsDir, 'code.desktop'),
      '[Desktop Entry]\nName=VS Code\nExec=/usr/bin/code %F\nTerminal=false\nType=Application\n',
      'utf-8'
    );

    const spawnedCalls: Array<{ cmd: string; args: string[]; cwd?: string }> = [];
    const result = await openLinuxFileSafely(notePath, {
      queryDefaultDesktopId: async () => 'code.desktop',
      findDesktopFile: (id) => findDesktopFilePath(id, [appsDir]),
      spawnProcess: async (cmd, args, cwd) => {
        spawnedCalls.push({ cmd, args, cwd });
        return { ok: true };
      },
    });

    expect(result.ok).toBe(true);
    expect(spawnedCalls).toEqual([
      {
        cmd: 'xdg-open',
        args: [notePath],
        cwd: tempDir,
      },
    ]);
  });

  it('spawnDetached returns immediately without blocking and disconnects stdio from the parent TTY', async () => {
    const markerPath = path.join(tempDir, 'spawned.txt');
    const scriptPath = path.join(tempDir, 'slow-editor.sh');
    await fs.writeFile(
      scriptPath,
      `#!/bin/sh\necho "started" > "${markerPath}"\nsleep 2\n`,
      { mode: 0o755 }
    );

    const start = Date.now();
    const res = await spawnDetached(scriptPath, [], tempDir);
    const elapsedMs = Date.now() - start;

    expect(res.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
