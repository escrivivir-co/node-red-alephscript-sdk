export type EscribienteSource = 'mic' | 'mp3' | 'mixed';

export interface EscribienteJob {
  jobId: string;
  sessionId: string;
  sessionDir: string;
  chunkId: string;
  chunkIndex: number;
  audioPath: string;
  source: EscribienteSource;
  startSec: number;
  endSec: number;
  model: string;
  device: string;
  computeType: string;
  language: string;
  beamSize: number;
  createdAt: string;
  originalFileName?: string;
  mimeType?: string;
  chunkSec?: number;
}

export interface EscribienteSegment {
  start: number;
  end: number;
  text: string;
  avgLogprob: number;
  confidence: 'HIGH' | 'OK' | 'LOW';
}

export interface EscribienteResult {
  sessionId: string;
  sessionDir: string;
  chunkId: string;
  chunkIndex: number;
  audioPath: string;
  source: EscribienteSource;
  startSec: number;
  endSec: number;
  language: string;
  languageProbability: number;
  text: string;
  segments: EscribienteSegment[];
  processingSeconds: number;
  model: string;
  device: string;
  computeType: string;
  createdAt: string;
  completedAt: string;
  originalFileName?: string;
  mimeType?: string;
  error?: string;
}

export interface SessionManifest {
  sessionId: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  source: EscribienteSource;
  status: 'open' | 'closing' | 'closed';
  model: string;
  device: string;
  computeType: string;
  language: string;
  beamSize: number;
  chunkSec: number;
  sessionDir: string;
  queueInbox: string;
  queueOutbox: string;
  audioDir: string;
  textDir: string;
  sourceFilesDir: string;
  chunksQueued: number;
  chunksCompleted: number;
  chunksFailed: number;
  sourcePath?: string;
  exportZip?: string;
  closedAt?: string;
  notes?: string[];
}

export interface PrecheckResult {
  ready: boolean;
  recommendedModel: string;
  recommendedChunkSec: number;
  recommendedDevice: string;
  recommendedComputeType: string;
  ffmpegAvailable: boolean;
  gpuAvailable: boolean;
  pythonExecutable: string;
  sessionsRoot: string;
  queueRoot: string;
  warnings: string[];
  info: Record<string, unknown>;
}
