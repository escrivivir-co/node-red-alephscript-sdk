export interface EscribienteConfig {
  pythonCommand: string;
  workerScript: string;
  precheckScript: string;
  sessionsRoot: string;
  queueRoot: string;
  model: string;
  device: string;
  computeType: string;
  language: string;
  chunkSec: number;
}

export const VERSION = '0.1.0';
