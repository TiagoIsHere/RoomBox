import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  FileSystemService,
  MAX_PREVIEW_BYTES,
  readStreamPreview,
} from '../../electron/fsService';

describe('FileSystemService — Real File System Operations in Isolated Temp Sandbox', () => {
  let tempDir: string;
  let userDataDir: string;
  let fsService: FileSystemService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'roombox-test-'));
    userDataDir = path.join(tempDir, '.roombox-userdata');
    await fs.mkdir(userDataDir, { recursive: true });
    fsService = new FileSystemService(userDataDir);
  });

  afterEach(async () => {
    if (tempDir && tempDir.startsWith(os.tmpdir())) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('1. Rename (rename-item)', () => {
    it('renames a file inside its exact parent directory and preserves contents and metadata', async () => {
      const subDir = path.join(tempDir, 'project_notes');
      await fs.mkdir(subDir, { recursive: true });
      const originalPath = path.join(subDir, 'draft_memo.txt');
      const originalContent = 'PS1 anime bedroomcore soundtrack notes #ost';
      await fs.writeFile(originalPath, originalContent, 'utf-8');

      fsService.updateItemMetadata(originalPath, undefined, {
        comment: 'Important tracklist',
        hashtags: ['#ost', '#ps1'],
      });

      const result = await fsService.renameItem(originalPath, 'final_memo.txt');

      expect(result.success).toBe(true);
      expect(result.newName).toBe('final_memo.txt');
      expect(result.newPath).toBe(path.join(subDir, 'final_memo.txt'));
      expect(path.dirname(result.newPath)).toBe(subDir);

      // Verify old path no longer exists and new path has identical content
      await expect(fs.access(originalPath)).rejects.toThrow();
      const renamedContent = await fs.readFile(result.newPath, 'utf-8');
      expect(renamedContent).toBe(originalContent);

      // Verify metadata migrated to newPath
      const listing = await fsService.readDirectory(subDir);
      const renamedEntry = listing.items.find((i) => i.name === 'final_memo.txt');
      expect(renamedEntry).toBeDefined();
      expect(renamedEntry?.comment).toBe('Important tracklist');
      expect(renamedEntry?.hashtags).toEqual(['#ost', '#ps1']);
    });

    it('prevents path traversal ("../") by sanitizing newName with path.basename', async () => {
      const subDir = path.join(tempDir, 'nested');
      await fs.mkdir(subDir, { recursive: true });
      const filePath = path.join(subDir, 'safe.txt');
      await fs.writeFile(filePath, 'safe content', 'utf-8');

      const result = await fsService.renameItem(
        filePath,
        '../../escaped_outside.txt'
      );

      expect(result.newName).toBe('escaped_outside.txt');
      expect(path.dirname(result.newPath)).toBe(subDir);
      expect(result.newPath).toBe(path.join(subDir, 'escaped_outside.txt'));

      // Ensure nothing was written to parent tempDir
      await expect(
        fs.access(path.join(tempDir, 'escaped_outside.txt'))
      ).rejects.toThrow();
    });

    it('throws structured errors on missing source (ENOENT), name collision, or invalid characters', async () => {
      const existingA = path.join(tempDir, 'alpha.txt');
      const existingB = path.join(tempDir, 'beta.txt');
      await fs.writeFile(existingA, 'A', 'utf-8');
      await fs.writeFile(existingB, 'B', 'utf-8');

      // Missing source file -> ENOENT
      await expect(
        fsService.renameItem(path.join(tempDir, 'nonexistent.txt'), 'new.txt')
      ).rejects.toThrow(/ENOENT/);

      // Collision with existing file
      await expect(
        fsService.renameItem(existingA, 'beta.txt')
      ).rejects.toThrow(/already exists/i);

      // Invalid characters
      await expect(
        fsService.renameItem(existingA, 'bad:name*?.txt')
      ).rejects.toThrow(/Invalid characters/i);

      // Empty filename
      await expect(fsService.renameItem(existingA, '   ')).rejects.toThrow(
        /Filename cannot be empty/i
      );
    });
  });

  describe('2. Symlinks & Hardlinks (create-symlink & create-hardlink)', () => {
    it('creates file symlinks and directory symlinks and resolves targets via fs.readlink', async () => {
      const sourceFile = path.join(tempDir, 'poster_art.svg');
      await fs.writeFile(sourceFile, '<svg></svg>', 'utf-8');

      const sourceFolder = path.join(tempDir, '01_Textures');
      await fs.mkdir(sourceFolder, { recursive: true });
      await fs.writeFile(path.join(sourceFolder, 'brick.png'), 'PNG', 'utf-8');

      // 1. File Symlink
      const fileLinkDest = path.join(tempDir, 'poster_art_link.svg');
      const createdFileLink = await fsService.createSymlink(
        sourceFile,
        fileLinkDest
      );

      expect(createdFileLink.isSymlink).toBe(true);
      expect(await fs.realpath(createdFileLink.symlinkTarget!)).toBe(
        await fs.realpath(sourceFile)
      );
      const fileLinkLstat = await fs.lstat(createdFileLink.path);
      expect(fileLinkLstat.isSymbolicLink()).toBe(true);
      const rawFileReadlink = await fs.readlink(createdFileLink.path);
      expect(path.resolve(tempDir, rawFileReadlink)).toBe(
        path.resolve(sourceFile)
      );

      // 2. Directory Symlink
      const dirLinkDest = path.join(tempDir, '01_Textures_Link');
      const createdDirLink = await fsService.createSymlink(
        sourceFolder,
        dirLinkDest
      );

      expect(createdDirLink.isSymlink).toBe(true);
      expect(createdDirLink.type).toBe('folder');
      const dirLinkLstat = await fs.lstat(createdDirLink.path);
      expect(dirLinkLstat.isSymbolicLink()).toBe(true);

      // 3. Hardlink on file
      const createdHardlink = await fsService.createHardlink(sourceFile, tempDir);
      const origStat = await fs.stat(sourceFile);
      const hlStat = await fs.stat(createdHardlink.path);
      expect(hlStat.ino).toBe(origStat.ino);
      expect(hlStat.nlink).toBeGreaterThanOrEqual(2);
    });

    it('cleanly handles broken/missing symlink targets during readDirectory without crashing', async () => {
      const ephemeralTarget = path.join(tempDir, 'ephemeral_target.txt');
      await fs.writeFile(ephemeralTarget, 'temporary data', 'utf-8');

      const brokenLinkPath = path.join(tempDir, 'broken_shortcut.txt');
      await fsService.createSymlink(ephemeralTarget, brokenLinkPath);

      // Delete the target so the symlink becomes dangling/broken
      await fs.rm(ephemeralTarget, { force: true });

      const dirListing = await fsService.readDirectory(tempDir);
      const brokenEntry = dirListing.items.find(
        (i) => i.name === 'broken_shortcut.txt'
      );

      expect(brokenEntry).toBeDefined();
      expect(brokenEntry?.isSymlink).toBe(true);
      expect(brokenEntry?.symlinkTarget).toContain('ephemeral_target.txt');
    });
  });

  describe('3. Natural Alphanumeric Sorting & Dotfile Visibility Toggle', () => {
    it('sorts item2.png before item10.png and toggles dotfile (.env, .gitignore) visibility accurately', async () => {
      const fileNames = [
        'item10.png',
        'item2.png',
        'item1.png',
        'item20.png',
        '.env',
        '.gitignore',
      ];
      for (const name of fileNames) {
        await fs.writeFile(path.join(tempDir, name), `content of ${name}`, 'utf-8');
      }

      // Default: dotfiles hidden, natural alphanumeric order
      const defaultRead = await fsService.readDirectory(tempDir);
      expect(defaultRead.items.map((i) => i.name)).toEqual([
        'item1.png',
        'item2.png',
        'item10.png',
        'item20.png',
      ]);

      // With showDotfiles: true
      const withDotfiles = await fsService.readDirectory(tempDir, {
        showDotfiles: true,
      });
      const namesWithDotfiles = withDotfiles.items.map((i) => i.name);
      expect(namesWithDotfiles).toContain('.env');
      expect(namesWithDotfiles).toContain('.gitignore');
      const idx2 = namesWithDotfiles.indexOf('item2.png');
      const idx10 = namesWithDotfiles.indexOf('item10.png');
      expect(idx2).toBeLessThan(idx10);
    });
  });

  describe('4. Streamed File Previews (16KB Cap)', () => {
    it('caps large text file previews at 16KB (16384 bytes) without loading the entire file into memory', async () => {
      const largeFilePath = path.join(tempDir, 'huge_log.txt');
      // Write a 96KB file (6x larger than the 16KB cap)
      const chunk = 'A'.repeat(1024);
      const fullContent = Array.from({ length: 96 }, (_, i) =>
        `${String(i).padStart(4, '0')}:${chunk.slice(5)}`
      ).join('');
      expect(Buffer.byteLength(fullContent, 'utf-8')).toBe(96 * 1024);
      await fs.writeFile(largeFilePath, fullContent, 'utf-8');

      const preview = await readStreamPreview(largeFilePath);
      expect(Buffer.byteLength(preview, 'utf-8')).toBe(MAX_PREVIEW_BYTES);
      expect(MAX_PREVIEW_BYTES).toBe(16 * 1024);
      expect(preview).toBe(fullContent.slice(0, MAX_PREVIEW_BYTES));

      // Verify readDirectory also populates the 16KB capped preview on large note/code files
      const listing = await fsService.readDirectory(tempDir);
      const entry = listing.items.find((i) => i.name === 'huge_log.txt');
      expect(entry).toBeDefined();
      expect(entry?.content?.length).toBe(MAX_PREVIEW_BYTES);
    });
  });
});
