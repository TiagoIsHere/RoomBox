import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';

export type FileCategory = 'folder' | 'image' | 'audio' | 'note' | 'code' | 'archive';
export type GitStatusBadge = 'M' | 'U' | 'A' | 'D';

export interface FsFileEntry {
  id: string; // Full absolute path on disk
  path: string;
  name: string;
  type: FileCategory;
  parentId: string | null;
  size: string;
  sizeBytes: number;
  modifiedAt: string;
  ino?: number;
  // Permissions, Ownership, Links & Git
  permissions?: string;
  ownerUid?: number;
  ownerGid?: number;
  nlink?: number;
  isSymlink?: boolean;
  symlinkTarget?: string;
  gitStatus?: GitStatusBadge;
  // Custom metadata
  folderPfp?: string;
  folderStickerLabel?: string;
  content?: string;
  imageUrl?: string;
  comment: string;
  hashtags: string[];
  pinned?: boolean;
}

export interface FileMoveOp {
  fromPath: string;
  toPath: string;
}

export interface StoredItemMeta {
  customName?: string;
  comment?: string;
  hashtags?: string[];
  folderPfp?: string;
  folderStickerLabel?: string;
  pinned?: boolean;
}

export interface UserMetadataStore {
  itemsByPath: Record<string, StoredItemMeta>;
  itemsByInode: Record<string, StoredItemMeta>;
  pinnedDirs: string[];
  todos: Array<{ id: string; text: string; completed: boolean; createdAt: string }>;
  actionLogs: Array<any>;
  pathHistory: Array<any>;
  theme?: any;
  customThemes?: Array<any>;
  vimMode?: boolean;
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac']);
const ARCHIVE_EXTS = new Set(['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'dmg', 'iso']);
const CODE_EXTS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss', 'html', 'py', 'rs', 'go', 'c', 'cpp', 'h', 'sh', 'yaml', 'yml', 'toml', 'glsl', 'sql',
]);
const DOC_EXTS = new Set(['txt', 'md', 'rtf', 'log', 'csv', 'pdf', 'doc', 'docx']);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatModePermissions(mode: number): string {
  const octal = (mode & 0o777).toString(8).padStart(4, '0');
  const chars = [
    mode & 0o400 ? 'r' : '-',
    mode & 0o200 ? 'w' : '-',
    mode & 0o100 ? 'x' : '-',
    mode & 0o040 ? 'r' : '-',
    mode & 0o020 ? 'w' : '-',
    mode & 0o010 ? 'x' : '-',
    mode & 0o004 ? 'r' : '-',
    mode & 0o002 ? 'w' : '-',
    mode & 0o001 ? 'x' : '-',
  ].join('');
  return `${octal} (${chars})`;
}

function classifyExtension(ext: string): Exclude<FileCategory, 'folder'> {
  const clean = ext.toLowerCase().replace(/^\./, '');
  if (IMAGE_EXTS.has(clean)) return 'image';
  if (AUDIO_EXTS.has(clean)) return 'audio';
  if (ARCHIVE_EXTS.has(clean)) return 'archive';
  if (CODE_EXTS.has(clean)) return 'code';
  return 'note';
}

export const MAX_PREVIEW_BYTES = 16 * 1024; // 16KB cap for streamed file previews

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export function naturalCompare(a: string, b: string): number {
  return naturalCollator.compare(a, b);
}

export function naturalSortItems<T extends { name: string; type?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    return naturalCollator.compare(a.name, b.name);
  });
}

export function readStreamPreview(
  filePath: string,
  maxBytes = MAX_PREVIEW_BYTES
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    const stream = fs.createReadStream(filePath, { start: 0, end: maxBytes - 1 });
    stream.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remaining = maxBytes - total;
      if (buf.length > remaining) {
        chunks.push(buf.subarray(0, remaining));
        total += remaining;
        stream.destroy();
      } else {
        chunks.push(buf);
        total += buf.length;
        if (total >= maxBytes) {
          stream.destroy();
        }
      }
    });
    stream.on('close', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    stream.on('error', (err) => reject(err));
  });
}

function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: 1500 }, (err, stdout) => {
      if (err) resolve('');
      else resolve(stdout);
    });
  });
}

export class FileSystemService {
  private dbFilePath: string;
  private store: UserMetadataStore;

  constructor(userDataDir: string) {
    this.dbFilePath = path.join(userDataDir, 'roombox-metadata.json');
    this.store = this.loadStore();
  }

  private loadStore(): UserMetadataStore {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          itemsByPath: parsed.itemsByPath || {},
          itemsByInode: parsed.itemsByInode || {},
          pinnedDirs: parsed.pinnedDirs || [],
          todos: parsed.todos || [],
          actionLogs: parsed.actionLogs || [],
          pathHistory: parsed.pathHistory || [],
          theme: parsed.theme || undefined,
          customThemes: parsed.customThemes || [],
          vimMode: Boolean(parsed.vimMode),
        };
      }
    } catch {
      // Fallback to default store
    }
    return {
      itemsByPath: {},
      itemsByInode: {},
      pinnedDirs: [],
      todos: [
        {
          id: 'todo-1',
          text: 'Toggle VIM: ON in the titlebar and navigate with j/k/l/h/gg/G',
          completed: false,
          createdAt: '22:10',
        },
        {
          id: 'todo-2',
          text: 'Inspect Git status pills (M/U/A) & Symlink target paths',
          completed: false,
          createdAt: '22:30',
        },
        {
          id: 'todo-3',
          text: 'Press Cmd/Ctrl + K to test 1-click Auto-Sort by Type',
          completed: false,
          createdAt: '23:00',
        },
      ],
      actionLogs: [],
      pathHistory: [],
      customThemes: [],
      vimMode: false,
    };
  }

  private saveStore(): void {
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch {
      // Ignore write errors
    }
  }

  public getStoreState() {
    return this.store;
  }

  public saveUiState(
    partial: Partial<
      Pick<
        UserMetadataStore,
        | 'todos'
        | 'actionLogs'
        | 'pathHistory'
        | 'theme'
        | 'customThemes'
        | 'pinnedDirs'
        | 'vimMode'
      >
    >
  ) {
    if (partial.todos !== undefined) this.store.todos = partial.todos;
    if (partial.actionLogs !== undefined) this.store.actionLogs = partial.actionLogs;
    if (partial.pathHistory !== undefined) this.store.pathHistory = partial.pathHistory;
    if (partial.theme !== undefined) this.store.theme = partial.theme;
    if (partial.customThemes !== undefined) this.store.customThemes = partial.customThemes;
    if (partial.pinnedDirs !== undefined) this.store.pinnedDirs = partial.pinnedDirs;
    if (partial.vimMode !== undefined) this.store.vimMode = partial.vimMode;
    this.saveStore();
    return { ok: true };
  }

  public recordErrorLog(
    operation: string,
    err: unknown,
    targetPath?: string,
    fallbackCode = 'ERR_FS'
  ) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Operation failed';
    const codeMatch = rawMessage.match(
      /\b(ENOENT|EACCES|EEXIST|EPERM|EINVAL|ENOTEMPTY|EBUSY|EXDEV|EISDIR|ENOTDIR)\b/
    );
    const errorCode = String(
      (err as any)?.code || (codeMatch ? codeMatch[1] : fallbackCode)
    );
    const cleanMsg = rawMessage.replace(
      /^Error invoking remote method '[^']+': Error:\s*/i,
      ''
    );
    const timestamp = new Date().toTimeString().slice(0, 8);
    const summary = `[ERROR] ${operation}: ${cleanMsg}`;

    const entry = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp,
      actionType: 'error' as const,
      errorCode,
      operation,
      summary,
      fromPath: targetPath,
    };

    this.store.actionLogs = [entry, ...(this.store.actionLogs || [])].slice(0, 100);
    this.saveStore();
    return entry;
  }

  public async saveWallpaperImage(sourcePath: string): Promise<{
    dataUrl: string;
    savedPath: string;
    fileName: string;
  }> {
    const resolvedSrc = path.resolve(sourcePath);
    const wallpapersDir = path.join(path.dirname(this.dbFilePath), 'wallpapers');
    await fsp.mkdir(wallpapersDir, { recursive: true });

    const ext = path.extname(resolvedSrc).toLowerCase().replace('.', '') || 'png';
    const safeBase = path.basename(resolvedSrc).replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedPath = path.join(wallpapersDir, `${Date.now()}_${safeBase}`);
    await fsp.copyFile(resolvedSrc, savedPath);

    const buf = await fsp.readFile(savedPath);
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'gif'
        ? 'image/gif'
        : 'image/png';
    const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

    return {
      dataUrl,
      savedPath,
      fileName: path.basename(resolvedSrc),
    };
  }

  public updateItemMetadata(
    targetPath: string,
    ino: number | undefined,
    patch: Partial<StoredItemMeta>
  ) {
    const existing =
      this.store.itemsByPath[targetPath] ||
      (ino ? this.store.itemsByInode[String(ino)] : undefined) ||
      {};
    const merged: StoredItemMeta = { ...existing, ...patch };
    this.store.itemsByPath[targetPath] = merged;
    if (ino) {
      this.store.itemsByInode[String(ino)] = merged;
    }
    this.saveStore();
    return merged;
  }

  public async getDiskUsage(targetPath: string = os.homedir()) {
    try {
      const stats = await fsp.statfs(targetPath);
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      const usedPercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
      return {
        totalBytes,
        freeBytes,
        usedBytes,
        usedPercent,
        freeFormatted: `${formatBytes(freeBytes)} free`,
        totalFormatted: formatBytes(totalBytes),
      };
    } catch {
      return {
        totalBytes: 0,
        freeBytes: 0,
        usedBytes: 0,
        usedPercent: 42,
        freeFormatted: 'Available',
        totalFormatted: 'Disk',
      };
    }
  }

  public async getGitStatusInfo(dirPath: string): Promise<{
    branch: string | null;
    statusByFullPath: Map<string, GitStatusBadge>;
  }> {
    const statusByFullPath = new Map<string, GitStatusBadge>();
    const topLevelRaw = await execGit(['rev-parse', '--show-toplevel'], dirPath);
    const repoRoot = topLevelRaw.trim();
    if (!repoRoot) {
      return { branch: null, statusByFullPath };
    }

    const [branchRaw, porcelainRaw] = await Promise.all([
      execGit(['rev-parse', '--abbrev-ref', 'HEAD'], dirPath),
      execGit(['status', '--porcelain', '-uall'], dirPath),
    ]);

    let realDirPath = path.resolve(dirPath);
    try {
      realDirPath = await fsp.realpath(dirPath);
    } catch {
      // Fallback to resolved dirPath
    }
    const resolvedDirPath = path.resolve(dirPath);

    const branch = branchRaw.trim() || 'HEAD';
    const lines = porcelainRaw.split('\n').filter(Boolean);
    for (const line of lines) {
      if (line.length < 4) continue;
      const xy = line.slice(0, 2);
      let relPath = line.slice(3).trim();
      if (relPath.includes(' -> ')) {
        relPath = relPath.split(' -> ').pop()!.trim();
      }
      relPath = relPath.replace(/^"|"$/g, '');
      const absPath = path.resolve(repoRoot, relPath);

      let badge: GitStatusBadge = 'M';
      if (xy.includes('?')) badge = 'U';
      else if (xy.includes('A')) badge = 'A';
      else if (xy.includes('D')) badge = 'D';
      else badge = 'M';

      statusByFullPath.set(absPath, badge);
      // Also map relative to caller's unresolved dirPath (e.g. macOS /var -> /private/var)
      const relFromRealDir = path.relative(realDirPath, absPath);
      if (!relFromRealDir.startsWith('..')) {
        const callerAbsPath = path.resolve(resolvedDirPath, relFromRealDir);
        statusByFullPath.set(callerAbsPath, badge);
        const callerParent = path.dirname(callerAbsPath);
        if (callerParent !== resolvedDirPath && !statusByFullPath.has(callerParent)) {
          statusByFullPath.set(callerParent, badge);
        }
      }

      // Also mark parent folders inside dirPath as modified if a child file is dirty
      const parentDir = path.dirname(absPath);
      if (parentDir !== repoRoot && !statusByFullPath.has(parentDir)) {
        statusByFullPath.set(parentDir, badge);
      }
    }

    return { branch, statusByFullPath };
  }

  public async readDirectory(
    dirPath: string,
    options?: { showDotfiles?: boolean }
  ): Promise<{
    currentPath: string;
    parentPath: string | null;
    gitBranch: string | null;
    items: FsFileEntry[];
  }> {
    const resolvedDir = path.resolve(dirPath);
    const parentDir =
      path.dirname(resolvedDir) !== resolvedDir ? path.dirname(resolvedDir) : null;
    const showDotfiles = Boolean(options?.showDotfiles);

    let dirents: fs.Dirent[] = [];
    const gitInfoPromise = this.getGitStatusInfo(resolvedDir);
    try {
      dirents = await fsp.readdir(resolvedDir, { withFileTypes: true });
    } catch (err: any) {
      if (err?.code === 'EPERM' || err?.code === 'EACCES') {
        dirents = [];
      } else {
        throw err;
      }
    }
    const gitInfo = await gitInfoPromise;

    const items: FsFileEntry[] = [];

    for (const dirent of dirents) {
      if (
        dirent.name === '.DS_Store' ||
        dirent.name === 'Thumbs.db' ||
        dirent.name === '.git' ||
        dirent.name === '.roombox-userdata'
      ) {
        continue;
      }
      if (!showDotfiles && dirent.name.startsWith('.')) continue;

      const fullPath = path.join(resolvedDir, dirent.name);
      try {
        const lst = await fsp.lstat(fullPath);
        const isSymlink = lst.isSymbolicLink();
        let st = lst;
        let symlinkTarget: string | undefined;

        if (isSymlink) {
          try {
            const rawLink = await fsp.readlink(fullPath);
            symlinkTarget = path.resolve(resolvedDir, rawLink);
            st = await fsp.stat(fullPath);
          } catch {
            // Broken symlink still displays its raw target
            try {
              const rawLink = await fsp.readlink(fullPath);
              symlinkTarget = path.resolve(resolvedDir, rawLink);
            } catch {
              symlinkTarget = 'Unresolved target';
            }
          }
        }

        const isDir = st.isDirectory();
        const ext = path.extname(dirent.name);
        const fileType: FileCategory = isDir ? 'folder' : classifyExtension(ext);

        const meta =
          this.store.itemsByPath[fullPath] ||
          (st.ino ? this.store.itemsByInode[String(st.ino)] : undefined) ||
          {};

        let sizeLabel = formatBytes(st.size);
        if (isDir) {
          try {
            const sub = await fsp.readdir(fullPath);
            const visibleCount = sub.filter((n) => !n.startsWith('.')).length;
            sizeLabel = `${visibleCount} item${visibleCount === 1 ? '' : 's'}`;
          } catch {
            sizeLabel = 'Folder';
          }
        }

        let imageUrl: string | undefined;
        let content: string | undefined;

        if (!isDir && fileType === 'image' && st.size > 0 && st.size < 2.5 * 1024 * 1024) {
          try {
            const buf = await fsp.readFile(fullPath);
            const cleanExt = ext.toLowerCase().replace('.', '');
            const mime =
              cleanExt === 'svg'
                ? 'image/svg+xml'
                : cleanExt === 'jpg'
                ? 'image/jpeg'
                : `image/${cleanExt || 'png'}`;
            imageUrl = `data:${mime};base64,${buf.toString('base64')}`;
          } catch {
            // Ignore
          }
        } else if (
          !isDir &&
          (fileType === 'note' || fileType === 'code') &&
          st.size > 0
        ) {
          try {
            content = await readStreamPreview(fullPath, MAX_PREVIEW_BYTES);
          } catch {
            // Ignore
          }
        }

        items.push({
          id: fullPath,
          path: fullPath,
          name: meta.customName || dirent.name,
          type: fileType,
          parentId: resolvedDir,
          size: sizeLabel,
          sizeBytes: st.size,
          modifiedAt: formatDate(st.mtimeMs),
          ino: st.ino,
          permissions: formatModePermissions(st.mode),
          ownerUid: st.uid,
          ownerGid: st.gid,
          nlink: st.nlink,
          isSymlink,
          symlinkTarget,
          gitStatus: gitInfo.statusByFullPath.get(fullPath),
          folderPfp: meta.folderPfp,
          folderStickerLabel: meta.folderStickerLabel,
          content,
          imageUrl,
          comment: meta.comment || '',
          hashtags: meta.hashtags || [],
          pinned: meta.pinned || this.store.pinnedDirs.includes(fullPath),
        });
      } catch {
        // Skip unreadable entries
      }
    }

    return {
      currentPath: resolvedDir,
      parentPath: parentDir,
      gitBranch: gitInfo.branch,
      items: naturalSortItems(items),
    };
  }

  public async createSymlink(
    targetPath: string,
    linkPath: string,
    customName?: string
  ): Promise<FsFileEntry> {
    const resolvedTarget = path.resolve(targetPath);
    let stats: fs.Stats | null = null;
    try {
      stats = await fsp.stat(resolvedTarget);
    } catch {
      stats = null;
    }
    const isDir = stats ? stats.isDirectory() : false;

    let resolvedLinkPath: string;
    if (customName && customName.trim()) {
      const sanitizedLinkName = path.basename(customName.trim());
      if (/[<>:"/\\|?*\x00-\x1F]/.test(sanitizedLinkName)) {
        throw new Error(`Invalid characters in symlink name "${sanitizedLinkName}".`);
      }
      resolvedLinkPath = path.join(path.resolve(linkPath), sanitizedLinkName);
    } else if (
      linkPath &&
      fs.existsSync(linkPath) &&
      fs.statSync(linkPath).isDirectory()
    ) {
      const ext = isDir ? '' : path.extname(resolvedTarget);
      const stem = isDir
        ? path.basename(resolvedTarget)
        : path.basename(resolvedTarget, ext);
      const defaultName = isDir
        ? `${stem} - symlink`
        : `${stem} - symlink${ext}`;
      resolvedLinkPath = path.join(path.resolve(linkPath), defaultName);
    } else {
      resolvedLinkPath = path.resolve(linkPath);
    }

    const parentDir = path.dirname(resolvedLinkPath);
    await fsp.mkdir(parentDir, { recursive: true });

    let linkAlreadyExists = fs.existsSync(resolvedLinkPath);
    if (!linkAlreadyExists) {
      try {
        await fsp.lstat(resolvedLinkPath);
        linkAlreadyExists = true;
      } catch {
        linkAlreadyExists = false;
      }
    }
    if (linkAlreadyExists) {
      throw new Error(
        `"${path.basename(resolvedLinkPath)}" already exists in destination folder.`
      );
    }

    // Cross-platform symlink creation:
    // If target is a directory, try 'dir' and fall back to 'junction' on Windows EPERM/EACCES; if file, pass 'file'.
    if (isDir) {
      try {
        await fsp.symlink(resolvedTarget, resolvedLinkPath, 'dir');
      } catch (err: any) {
        if (
          process.platform === 'win32' &&
          (err?.code === 'EPERM' || err?.code === 'EACCES')
        ) {
          await fsp.symlink(resolvedTarget, resolvedLinkPath, 'junction');
        } else {
          throw err;
        }
      }
    } else {
      await fsp.symlink(resolvedTarget, resolvedLinkPath, 'file');
    }

    const lst = await fsp.lstat(resolvedLinkPath);
    const finalName = path.basename(resolvedLinkPath);
    const ext = isDir ? '' : path.extname(finalName);
    const targetSize = stats ? stats.size : lst.size;

    this.updateItemMetadata(resolvedLinkPath, lst.ino, {
      comment: `Symbolic link ⇢ ${resolvedTarget}`,
      hashtags: ['#symlink'],
    });

    return {
      id: resolvedLinkPath,
      path: resolvedLinkPath,
      name: finalName,
      type: isDir ? 'folder' : classifyExtension(ext),
      parentId: parentDir,
      size: isDir ? 'Symlink Dir' : formatBytes(targetSize),
      sizeBytes: targetSize,
      modifiedAt: formatDate(lst.mtimeMs),
      ino: lst.ino,
      permissions: formatModePermissions(lst.mode),
      ownerUid: lst.uid,
      ownerGid: lst.gid,
      nlink: lst.nlink,
      isSymlink: true,
      symlinkTarget: resolvedTarget,
      comment: `Symbolic link ⇢ ${resolvedTarget}`,
      hashtags: ['#symlink'],
    };
  }

  public async createHardlink(sourcePath: string, targetDir?: string): Promise<FsFileEntry> {
    const dir = targetDir || path.dirname(sourcePath);
    const ext = path.extname(sourcePath);
    const stem = path.basename(sourcePath, ext);
    let linkPath = path.join(dir, `${stem}_hardlink${ext}`);
    if (fs.existsSync(linkPath)) {
      linkPath = path.join(dir, `${stem}_hardlink_${Date.now().toString().slice(-4)}${ext}`);
    }
    await fsp.link(sourcePath, linkPath);
    const st = await fsp.stat(linkPath);

    return {
      id: linkPath,
      path: linkPath,
      name: path.basename(linkPath),
      type: classifyExtension(ext),
      parentId: dir,
      size: formatBytes(st.size),
      sizeBytes: st.size,
      modifiedAt: formatDate(st.mtimeMs),
      ino: st.ino,
      permissions: formatModePermissions(st.mode),
      ownerUid: st.uid,
      ownerGid: st.gid,
      nlink: st.nlink,
      comment: `Hardlink sharing inode #${st.ino}`,
      hashtags: ['#hardlink'],
    };
  }

  public async permanentDeleteItems(pathsToDelete: string[]): Promise<string[]> {
    const deleted: string[] = [];
    for (const p of pathsToDelete) {
      try {
        await fsp.rm(p, { recursive: true, force: true });
        delete this.store.itemsByPath[p];
        deleted.push(p);
      } catch {
        // Ignore locked files
      }
    }
    this.saveStore();
    return deleted;
  }

  public async createFolder(
    parentDir: string,
    folderName: string,
    folderPfp?: string,
    folderStickerLabel?: string
  ): Promise<FsFileEntry> {
    const targetPath = path.join(parentDir, folderName);
    await fsp.mkdir(targetPath, { recursive: true });
    const st = await fsp.stat(targetPath);

    if (folderPfp || folderStickerLabel) {
      this.updateItemMetadata(targetPath, st.ino, {
        folderPfp,
        folderStickerLabel,
        hashtags: ['#wip'],
      });
    }

    return {
      id: targetPath,
      path: targetPath,
      name: folderName,
      type: 'folder',
      parentId: parentDir,
      size: '0 items',
      sizeBytes: 0,
      modifiedAt: formatDate(st.mtimeMs),
      ino: st.ino,
      permissions: formatModePermissions(st.mode),
      ownerUid: st.uid,
      ownerGid: st.gid,
      nlink: st.nlink,
      folderPfp,
      folderStickerLabel,
      comment: '',
      hashtags: ['#wip'],
    };
  }

  public async createNote(
    parentDir: string,
    fileName: string,
    content: string
  ): Promise<FsFileEntry> {
    const targetPath = path.join(parentDir, fileName);
    await fsp.writeFile(targetPath, content, 'utf-8');
    const st = await fsp.stat(targetPath);

    this.updateItemMetadata(targetPath, st.ino, {
      comment: 'Created in RoomBox',
      hashtags: ['#notes'],
    });

    return {
      id: targetPath,
      path: targetPath,
      name: fileName,
      type: 'note',
      parentId: parentDir,
      size: formatBytes(st.size),
      sizeBytes: st.size,
      modifiedAt: formatDate(st.mtimeMs),
      ino: st.ino,
      permissions: formatModePermissions(st.mode),
      ownerUid: st.uid,
      ownerGid: st.gid,
      nlink: st.nlink,
      content,
      comment: 'Created in RoomBox',
      hashtags: ['#notes'],
    };
  }

  public async renameItem(
    oldPath: string,
    newName: string
  ): Promise<{
    success: boolean;
    fromPath: string;
    toPath: string;
    newPath: string;
    newName: string;
  }> {
    const resolvedOld = path.resolve(oldPath);
    const parentDir = path.dirname(resolvedOld);
    const sanitizedName = path.basename(newName.trim()); // prevents accidental path traversal
    if (!sanitizedName) {
      throw new Error('Filename cannot be empty.');
    }

    if (/[<>:"/\\|?*\x00-\x1F]/.test(sanitizedName)) {
      throw new Error(`Invalid characters in filename "${sanitizedName}".`);
    }

    const newPath = path.join(parentDir, sanitizedName);
    if (resolvedOld === newPath) {
      return {
        success: true,
        fromPath: resolvedOld,
        toPath: newPath,
        newPath,
        newName: sanitizedName,
      };
    }

    if (
      fs.existsSync(newPath) &&
      resolvedOld.toLowerCase() !== newPath.toLowerCase()
    ) {
      throw new Error(`"${sanitizedName}" already exists in this directory.`);
    }

    try {
      await fsp.rename(resolvedOld, newPath);
      if (this.store.itemsByPath[resolvedOld]) {
        const prevMeta = { ...this.store.itemsByPath[resolvedOld] };
        delete prevMeta.customName;
        this.store.itemsByPath[newPath] = prevMeta;
        delete this.store.itemsByPath[resolvedOld];
        this.saveStore();
      }
      return {
        success: true,
        fromPath: resolvedOld,
        toPath: newPath,
        newPath,
        newName: sanitizedName,
      };
    } catch (err: any) {
      // If the OS blocks renaming a protected system folder (e.g., macOS ~/Public, ~/Desktop ACL EACCES/EPERM)
      // or sandbox boundary, persist the new name in RoomBox's local metadata store so renaming still works seamlessly.
      if (err?.code === 'EACCES' || err?.code === 'EPERM') {
        let ino: number | undefined;
        try {
          const st = await fsp.lstat(resolvedOld);
          ino = st.ino;
        } catch {
          // Ignore stat error
        }
        this.updateItemMetadata(resolvedOld, ino, {
          customName: sanitizedName,
        });
        return {
          success: true,
          fromPath: resolvedOld,
          toPath: resolvedOld,
          newPath: resolvedOld,
          newName: sanitizedName,
        };
      }
      throw err;
    }
  }

  public async moveItems(sourcePaths: string[], targetDir: string): Promise<FileMoveOp[]> {
    const operations: FileMoveOp[] = [];
    await fsp.mkdir(targetDir, { recursive: true });

    for (const src of sourcePaths) {
      if (src === targetDir) continue;
      const baseName = path.basename(src);
      let dest = path.join(targetDir, baseName);
      if (src === dest) continue;

      if (fs.existsSync(dest)) {
        const ext = path.extname(baseName);
        const stem = path.basename(baseName, ext);
        dest = path.join(targetDir, `${stem}_${Date.now().toString().slice(-4)}${ext}`);
      }

      await fsp.rename(src, dest);
      if (this.store.itemsByPath[src]) {
        this.store.itemsByPath[dest] = this.store.itemsByPath[src];
        delete this.store.itemsByPath[src];
      }
      operations.push({ fromPath: src, toPath: dest });
    }

    this.saveStore();
    return operations;
  }

  public async autoSortDirectory(dirPath: string): Promise<{
    sortedCount: number;
    operations: FileMoveOp[];
  }> {
    const dirents = await fsp.readdir(dirPath, { withFileTypes: true });
    const operations: FileMoveOp[] = [];

    const folderNames: Record<string, string> = {
      image: 'Images',
      note: 'Documents',
      code: 'Documents',
      audio: 'Audio',
      archive: 'Archives',
    };

    for (const dirent of dirents) {
      if (dirent.isDirectory() || dirent.name.startsWith('.')) continue;
      const fullPath = path.join(dirPath, dirent.name);
      const ext = path.extname(dirent.name);
      const cleanExt = ext.toLowerCase().replace(/^\./, '');

      let targetSubfolder = 'Documents';
      if (IMAGE_EXTS.has(cleanExt)) targetSubfolder = folderNames.image;
      else if (AUDIO_EXTS.has(cleanExt)) targetSubfolder = folderNames.audio;
      else if (ARCHIVE_EXTS.has(cleanExt)) targetSubfolder = folderNames.archive;
      else if (DOC_EXTS.has(cleanExt) || CODE_EXTS.has(cleanExt)) {
        targetSubfolder = folderNames.note;
      }

      const subDirPath = path.join(dirPath, targetSubfolder);
      await fsp.mkdir(subDirPath, { recursive: true });

      let destPath = path.join(subDirPath, dirent.name);
      if (fs.existsSync(destPath)) {
        const stem = path.basename(dirent.name, ext);
        destPath = path.join(
          subDirPath,
          `${stem}_${Date.now().toString().slice(-4)}${ext}`
        );
      }

      await fsp.rename(fullPath, destPath);
      if (this.store.itemsByPath[fullPath]) {
        this.store.itemsByPath[destPath] = this.store.itemsByPath[fullPath];
        delete this.store.itemsByPath[fullPath];
      }
      operations.push({ fromPath: fullPath, toPath: destPath });
    }

    this.saveStore();
    return {
      sortedCount: operations.length,
      operations,
    };
  }

  public async batchRename(
    targetPaths: string[],
    options: {
      mode: 'sequential' | 'affix' | 'replace';
      prefix?: string;
      suffix?: string;
      findText?: string;
      replaceText?: string;
    }
  ): Promise<FileMoveOp[]> {
    const operations: FileMoveOp[] = [];
    let counter = 1;

    for (const filePath of targetPaths) {
      const parentDir = path.dirname(filePath);
      const oldName = path.basename(filePath);
      const st = await fsp.stat(filePath);
      const ext = st.isDirectory() ? '' : path.extname(oldName);
      const stem = st.isDirectory() ? oldName : path.basename(oldName, ext);

      let newName = oldName;
      if (options.mode === 'sequential') {
        const base = (options.prefix || 'asset').trim();
        const num = String(counter++).padStart(2, '0');
        newName = `${base}_${num}${ext}`;
      } else if (options.mode === 'affix') {
        const pre = options.prefix || '';
        const suf = options.suffix || '';
        newName = `${pre}${stem}${suf}${ext}`;
      } else if (options.mode === 'replace' && options.findText) {
        newName = oldName.split(options.findText).join(options.replaceText || '');
      }

      if (!newName || newName === oldName) continue;
      const newPath = path.join(parentDir, newName);
      if (fs.existsSync(newPath)) continue;

      await fsp.rename(filePath, newPath);
      if (this.store.itemsByPath[filePath]) {
        this.store.itemsByPath[newPath] = this.store.itemsByPath[filePath];
        delete this.store.itemsByPath[filePath];
      }
      operations.push({ fromPath: filePath, toPath: newPath });
    }

    this.saveStore();
    return operations;
  }

  public async undoOperations(operations: FileMoveOp[]): Promise<number> {
    let restored = 0;
    for (let i = operations.length - 1; i >= 0; i--) {
      const op = operations[i];
      try {
        if (op.fromPath === op.toPath) {
          let ino: number | undefined;
          try {
            const st = await fsp.lstat(op.fromPath);
            ino = st.ino;
          } catch {
            // Ignore
          }
          this.updateItemMetadata(op.fromPath, ino, { customName: undefined });
          restored++;
          continue;
        }
        if (fs.existsSync(op.toPath)) {
          await fsp.mkdir(path.dirname(op.fromPath), { recursive: true });
          await fsp.rename(op.toPath, op.fromPath);
          if (this.store.itemsByPath[op.toPath]) {
            this.store.itemsByPath[op.fromPath] = this.store.itemsByPath[op.toPath];
            delete this.store.itemsByPath[op.toPath];
          }
          restored++;
        }
      } catch {
        // Ignore
      }
    }
    this.saveStore();
    return restored;
  }
}
