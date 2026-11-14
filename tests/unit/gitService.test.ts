import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemService } from '../../electron/fsService';

const execFileAsync = promisify(execFile);

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

describe('Git Status Parser Integration (gitService.test.ts)', () => {
  let tempDir: string;
  let userDataDir: string;
  let fsService: FileSystemService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-test-git-'));
    userDataDir = path.join(tempDir, '.roombox-userdata');
    await fs.mkdir(userDataDir, { recursive: true });
    fsService = new FileSystemService(userDataDir);

    // Initialize an isolated temporary Git repository inside os.tmpdir()
    await runGit(['init'], tempDir);
    await runGit(['config', 'user.email', 'qa@roombox.local'], tempDir);
    await runGit(['config', 'user.name', 'RoomBox QA Runner'], tempDir);
  });

  afterEach(async () => {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('correctly parses git status --porcelain into M (modified), U (untracked), and A (staged/added) badges', async () => {
    // 1. Create and commit a baseline tracked file
    const trackedFile = path.join(tempDir, 'tracked_scene.glsl');
    await fs.writeFile(trackedFile, 'void main() { gl_FragColor = vec4(1.0); }', 'utf-8');
    await runGit(['add', 'tracked_scene.glsl'], tempDir);
    await runGit(['commit', '-m', 'Initial commit'], tempDir);

    // 2. Modify the tracked file -> should report 'M'
    await fs.writeFile(
      trackedFile,
      'void main() { gl_FragColor = vec4(0.85, 0.65, 0.69, 1.0); }',
      'utf-8'
    );

    // 3. Create an untracked file -> should report 'U'
    const untrackedFile = path.join(tempDir, 'untracked_notes.txt');
    await fs.writeFile(untrackedFile, 'untracked draft notes', 'utf-8');

    // 4. Create and stage a new file -> should report 'A'
    const stagedFile = path.join(tempDir, 'staged_config.json');
    await fs.writeFile(stagedFile, '{"theme":"tokyo-night"}', 'utf-8');
    await runGit(['add', 'staged_config.json'], tempDir);

    // Verify low-level getGitStatusInfo() map
    const gitInfo = await fsService.getGitStatusInfo(tempDir);
    expect(gitInfo.branch).toBeTruthy();

    const realTracked = await fs.realpath(trackedFile);
    const realUntracked = await fs.realpath(untrackedFile);
    const realStaged = await fs.realpath(stagedFile);

    expect(
      gitInfo.statusByFullPath.get(trackedFile) ??
        gitInfo.statusByFullPath.get(realTracked)
    ).toBe('M');
    expect(
      gitInfo.statusByFullPath.get(untrackedFile) ??
        gitInfo.statusByFullPath.get(realUntracked)
    ).toBe('U');
    expect(
      gitInfo.statusByFullPath.get(stagedFile) ??
        gitInfo.statusByFullPath.get(realStaged)
    ).toBe('A');

    // Verify high-level readDirectory() attaches gitStatus badges to returned items
    const listing = await fsService.readDirectory(tempDir);
    expect(listing.gitBranch).toBeTruthy();

    const byName = new Map(listing.items.map((item) => [item.name, item]));
    expect(byName.get('tracked_scene.glsl')?.gitStatus).toBe('M');
    expect(byName.get('untracked_notes.txt')?.gitStatus).toBe('U');
    expect(byName.get('staged_config.json')?.gitStatus).toBe('A');
  });

  it('propagates dirty status badge to parent subfolder when a nested file is modified or untracked', async () => {
    const subDir = path.join(tempDir, 'shaders');
    await fs.mkdir(subDir, { recursive: true });
    const nestedUntracked = path.join(subDir, 'dither_pass.glsl');
    await fs.writeFile(nestedUntracked, '// ps1 dither matrix', 'utf-8');

    const listing = await fsService.readDirectory(tempDir);
    const shadersFolder = listing.items.find((item) => item.name === 'shaders');
    expect(shadersFolder).toBeDefined();
    expect(shadersFolder?.type).toBe('folder');
    expect(shadersFolder?.gitStatus).toBe('U');
  });

  it('gracefully returns null gitBranch and empty status map for non-Git directories', async () => {
    const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-test-nongit-'));
    try {
      await fs.writeFile(path.join(nonGitDir, 'plain.txt'), 'no git here', 'utf-8');
      const gitInfo = await fsService.getGitStatusInfo(nonGitDir);
      expect(gitInfo.branch).toBeNull();
      expect(gitInfo.statusByFullPath.size).toBe(0);
    } finally {
      if (nonGitDir.startsWith(os.tmpdir())) {
        await fs.rm(nonGitDir, { recursive: true, force: true });
      }
    }
  });
});
