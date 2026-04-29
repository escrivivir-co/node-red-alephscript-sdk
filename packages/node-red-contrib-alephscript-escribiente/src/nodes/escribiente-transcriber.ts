import fs from 'fs';
import path from 'path';
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { EscribienteConfigNode } from '../node-types';
import { EscribienteResult, SessionManifest } from '../types';
import { ensureDirSync, listFilesRecursive, nowIso, readJsonFile, updateManifest, writeJsonFile } from '../utils/fs-utils';

interface TranscriberNodeDef extends NodeDef {
  config: string;
  autoStart: boolean;
  pollIntervalMs: number;
}

interface TranscriberNode extends Node {
  configNode: EscribienteConfigNode;
  processedFiles: Set<string>;
  timer?: NodeJS.Timeout;
  scanQueue(msg?: NodeMessage): void;
}

function shouldScanMessage(msg: NodeMessage): boolean {
  if (!msg.topic) return true;
  return msg.topic === 'scan_transcriptions' || msg.topic === 'chunk_batch_queued' || msg.topic === 'session_status_request';
}

export = function (RED: NodeAPI) {
  function EscribienteTranscriberNode(this: TranscriberNode, config: TranscriberNodeDef) {
    RED.nodes.createNode(this, config);

    this.configNode = RED.nodes.getNode(config.config) as EscribienteConfigNode;
    this.processedFiles = new Set();

    if (!this.configNode) {
      this.error('Escribiente config node not found');
      return;
    }

    this.scanQueue = (msg?: NodeMessage) => {
      try {
        const resolved = this.configNode.getResolvedConfig();
        const outboxRoot = path.join(resolved.queueRoot, 'OUTBOX');
        const candidates = listFilesRecursive(outboxRoot, (filePath) => filePath.endsWith('.result.json') || filePath.endsWith('.error.json'));

        for (const candidate of candidates) {
          if (this.processedFiles.has(candidate)) {
            continue;
          }

          const payload = readJsonFile<Record<string, unknown>>(candidate, {});
          const sessionId = String(payload.sessionId || '');
          const chunkId = String(payload.chunkId || path.basename(candidate).replace(/\.(result|error)\.json$/, ''));
          if (!sessionId) {
            this.processedFiles.add(candidate);
            continue;
          }

          const manifestPath = path.join(resolved.sessionsRoot, sessionId, 'manifest.json');
          if (!fs.existsSync(manifestPath)) {
            continue;
          }

          const manifest = readJsonFile<SessionManifest>(manifestPath, {} as SessionManifest);
          ensureDirSync(manifest.textDir);

          if (candidate.endsWith('.result.json')) {
            const resultPath = path.join(manifest.textDir, `${chunkId}.json`);
            const textPath = path.join(manifest.textDir, `${chunkId}.txt`);
            const isFirst = !fs.existsSync(resultPath);
            writeJsonFile(resultPath, payload);
            const result = payload as unknown as EscribienteResult;
            fs.writeFileSync(textPath, result.text || '', 'utf8');

            let updated = manifest;
            if (isFirst) {
              updated = updateManifest(manifestPath, (draft) => ({
                ...draft,
                updatedAt: nowIso(),
                chunksCompleted: (draft.chunksCompleted || 0) + 1
              }));
            }

            this.status({ fill: 'green', shape: 'dot', text: `${updated.chunksCompleted}/${updated.chunksQueued}` });
            this.send({
              ...(msg || {}),
              topic: 'chunk_completed',
              sessionId,
              chunkId,
              payload: {
                result,
                session: updated
              }
            });
          } else {
            const errorPath = path.join(manifest.textDir, `${chunkId}.error.json`);
            const isFirst = !fs.existsSync(errorPath);
            writeJsonFile(errorPath, payload);
            let updated = manifest;
            if (isFirst) {
              updated = updateManifest(manifestPath, (draft) => ({
                ...draft,
                updatedAt: nowIso(),
                chunksFailed: (draft.chunksFailed || 0) + 1
              }));
            }
            this.status({ fill: 'red', shape: 'ring', text: `${updated.chunksFailed} failed` });
            this.send({
              ...(msg || {}),
              topic: 'chunk_failed',
              sessionId,
              chunkId,
              payload: {
                error: payload,
                session: updated
              }
            });
          }

          this.processedFiles.add(candidate);
        }
      } catch (error) {
        this.error(error instanceof Error ? error.message : String(error));
      }
    };

    this.on('input', (msg: NodeMessage, _send, done) => {
      if (shouldScanMessage(msg)) {
        this.scanQueue(msg);
      }
      done();
    });

    const pollIntervalMs = Number(config.pollIntervalMs) || this.configNode.getResolvedConfig().pollIntervalMs;
    if (config.autoStart !== false) {
      this.scanQueue();
      this.timer = setInterval(() => this.scanQueue(), pollIntervalMs);
    }

    this.on('close', () => {
      if (this.timer) {
        clearInterval(this.timer);
      }
    });
  }

  RED.nodes.registerType('alephscript-escribiente-transcriber', EscribienteTranscriberNode);
};
