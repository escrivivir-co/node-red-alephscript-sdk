import fs from 'fs';
import path from 'path';
import { SessionManifest } from '../types';

export const DEFAULT_RELATIVE_PATHS = {
  pythonCommand: '../.venv/Scripts/python.exe',
  workerScript: '../DocumentMachineSDK/workers/escribiente-whisper/worker.py',
  precheckScript: '../DocumentMachineSDK/workers/escribiente-whisper/precheck.py',
  sessionsRoot: '../ARCHIVO/PLUGINS/DOCUMENT_MACHINE/STORAGE/TRANSCRIPTIONS',
  queueRoot: '../ARCHIVO/PLUGINS/DOCUMENT_MACHINE/STORAGE/ESCRIBIENTE_QUEUE',
  ffmpegCommand: 'ffmpeg'
};

export function resolveConfigPath(target: string): string {
  if (!target) {
    return process.cwd();
  }
  return path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
}

export function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  const base = (input || 'sesion')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return base || 'sesion';
}

export function buildSessionId(slug: string, date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}-${slugify(slug)}`;
}

export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath: string, payload: unknown): void {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export function audioExtensionFromMimeOrName(mimeType?: string, fileName?: string, fallback = '.webm'): string {
  if (fileName) {
    const ext = path.extname(fileName);
    if (ext) {
      return ext.toLowerCase();
    }
  }

  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('aac')) return '.aac';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('webm')) return '.webm';
  return fallback;
}

export function decodeBase64Payload(data: string): Buffer {
  const normalized = data.includes(',') ? data.split(',')[1] : data;
  return Buffer.from(normalized, 'base64');
}

export function nextChunkIndex(audioDir: string): number {
  if (!fs.existsSync(audioDir)) return 1;

  const maxIndex = fs.readdirSync(audioDir)
    .map((fileName) => Number.parseInt(fileName.slice(0, 3), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0);

  return maxIndex + 1;
}

export function formatChunkId(index: number, startSec: number, endSec: number): string {
  const safeStart = Math.max(0, Math.floor(startSec));
  const safeEnd = Math.max(safeStart, Math.ceil(endSec));
  return `${String(index).padStart(3, '0')}-${String(safeStart).padStart(5, '0')}-${String(safeEnd).padStart(5, '0')}`;
}

export function listFilesRecursive(dirPath: string, matcher?: (filePath: string) => boolean): string[] {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, matcher));
      continue;
    }
    if (!matcher || matcher(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export function sortChunkPaths(filePaths: string[]): string[] {
  return [...filePaths].sort((left, right) => path.basename(left).localeCompare(path.basename(right)));
}

export function updateManifest(filePath: string, mutate: (manifest: SessionManifest) => SessionManifest): SessionManifest {
  const manifest = readJsonFile<SessionManifest>(filePath, {} as SessionManifest);
  const updated = mutate({ ...manifest, updatedAt: nowIso() });
  writeJsonFile(filePath, updated);
  return updated;
}
