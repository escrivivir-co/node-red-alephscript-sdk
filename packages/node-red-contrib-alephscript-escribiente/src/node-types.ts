import type { Node } from 'node-red';

export interface EscribienteResolvedConfig {
  pythonCommand: string;
  workerScript: string;
  precheckScript: string;
  sessionsRoot: string;
  queueRoot: string;
  ffmpegCommand: string;
  model: string;
  device: string;
  computeType: string;
  language: string;
  beamSize: number;
  chunkSec: number;
  pollIntervalMs: number;
  defaultSource: 'mic' | 'mp3' | 'mixed';
}

export interface EscribienteConfigNode extends Node {
  getResolvedConfig(): EscribienteResolvedConfig;
}
