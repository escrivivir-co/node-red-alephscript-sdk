import fs from 'fs';
import path from 'path';
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { EscribienteConfigNode } from '../node-types';
import { EscribienteJob, SessionManifest } from '../types';
import {
  audioExtensionFromMimeOrName,
  decodeBase64Payload,
  formatChunkId,
  nextChunkIndex,
  nowIso,
  readJsonFile,
  updateManifest,
  writeJsonFile
} from '../utils/fs-utils';
import { probeDurationSeconds, transcodeSliceToWav } from '../utils/process-utils';

interface ChunkerNodeDef extends NodeDef {
  config: string;
  timeoutMs: number;
}

interface ChunkerCommand {
  action?: 'queue_chunk' | 'chunk_file' | 'mic_chunk' | 'upload_mp3';
  sessionId?: string;
  source?: 'mic' | 'mp3' | 'mixed';
  data?: string;
  fileData?: string;
  audioData?: string;
  audioPath?: string;
  fileName?: string;
  mimeType?: string;
  startSec?: number;
  endSec?: number;
  chunkSec?: number;
  beamSize?: number;
  disableChunking?: boolean;
}

interface ChunkerNode extends Node {
  configNode: EscribienteConfigNode;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function buildManifestPath(sessionsRoot: string, sessionId: string): string {
  return path.join(sessionsRoot, sessionId, 'manifest.json');
}

function shouldHandleMessage(msg: NodeMessage, command: ChunkerCommand): boolean {
  const topic = msg.topic || '';
  return Boolean(
    command.action ||
    topic === 'mic_chunk' ||
    topic === 'upload_mp3' ||
    topic === 'queue_chunk'
  );
}

function decodeInputBuffer(command: ChunkerCommand, msg: NodeMessage): Buffer | null {
  if (Buffer.isBuffer(msg.payload)) {
    return msg.payload;
  }
  if (Buffer.isBuffer((msg as NodeMessage & { data?: Buffer }).data)) {
    return (msg as NodeMessage & { data?: Buffer }).data as Buffer;
  }

  const maybeBase64 = command.data || command.fileData || command.audioData;
  if (typeof maybeBase64 === 'string' && maybeBase64.trim()) {
    return decodeBase64Payload(maybeBase64);
  }

  return null;
}

function readManifest(sessionsRoot: string, sessionId: string): SessionManifest {
  const manifestPath = buildManifestPath(sessionsRoot, sessionId);
  return readJsonFile<SessionManifest>(manifestPath, {} as SessionManifest);
}

export = function (RED: NodeAPI) {
  function EscribienteChunkerNode(this: ChunkerNode, config: ChunkerNodeDef) {
    RED.nodes.createNode(this, config);

    this.configNode = RED.nodes.getNode(config.config) as EscribienteConfigNode;
    if (!this.configNode) {
      this.error('Escribiente config node not found');
      return;
    }

    const timeoutMs = Number(config.timeoutMs) || 600000;

    this.on('input', async (msg: NodeMessage, send, done) => {
      const command = (msg.payload || {}) as ChunkerCommand;
      if (!shouldHandleMessage(msg, command)) {
        done();
        return;
      }

      try {
        const resolved = this.configNode.getResolvedConfig();
        const action = command.action || (msg.topic === 'upload_mp3' ? 'chunk_file' : 'queue_chunk');
        const sessionId = command.sessionId || (msg as NodeMessage & { sessionId?: string }).sessionId;
        if (!sessionId) {
          throw new Error('sessionId is required');
        }

        const manifestPath = buildManifestPath(resolved.sessionsRoot, sessionId);
        const manifest = readManifest(resolved.sessionsRoot, sessionId);
        if (!manifest.sessionId) {
          throw new Error(`Session manifest not found for ${sessionId}`);
        }

        const source = command.source || manifest.source || resolved.defaultSource;
        const chunkSec = Number(command.chunkSec) || manifest.chunkSec || resolved.chunkSec;
        const beamSize = Number(command.beamSize) || manifest.beamSize || resolved.beamSize;
        const buffer = decodeInputBuffer(command, msg);
        const sourceAudioPath = command.audioPath;
        const ext = audioExtensionFromMimeOrName(command.mimeType, command.fileName, source === 'mp3' ? '.mp3' : '.webm');
        const queueInbox = manifest.queueInbox;
        const jobs: EscribienteJob[] = [];

        this.status({ fill: 'blue', shape: 'dot', text: 'queueing audio' });

        let localSourcePath: string | undefined = sourceAudioPath;
        if (!localSourcePath && buffer) {
          const sourceFileName = sanitizeFileName(command.fileName || `${Date.now()}${ext}`);
          localSourcePath = path.join(manifest.sourceFilesDir, sourceFileName);
          fs.writeFileSync(localSourcePath, buffer);
        }

        if (!localSourcePath || !fs.existsSync(localSourcePath)) {
          throw new Error('No audio payload or audioPath provided');
        }

        const queueSingleChunk = (chunkPath: string, chunkIndex: number, startSec: number, endSec: number) => {
          const chunkId = formatChunkId(chunkIndex, startSec, endSec);
          const job: EscribienteJob = {
            jobId: `${sessionId}-${chunkId}`,
            sessionId,
            sessionDir: manifest.sessionDir,
            chunkId,
            chunkIndex,
            audioPath: chunkPath,
            source,
            startSec,
            endSec,
            model: manifest.model,
            device: manifest.device,
            computeType: manifest.computeType,
            language: manifest.language,
            beamSize,
            createdAt: nowIso(),
            originalFileName: command.fileName,
            mimeType: command.mimeType,
            chunkSec
          };
          writeJsonFile(path.join(queueInbox, `${chunkId}.job.json`), job);
          jobs.push(job);
          send({
            ...msg,
            topic: 'chunk_queued',
            sessionId,
            chunkId,
            payload: job
          });
        };

        const shouldSplitMp3 = action === 'chunk_file' && source === 'mp3' && !command.disableChunking && ext === '.mp3';
        if (shouldSplitMp3) {
          let durationSec: number;
          try {
            durationSec = await probeDurationSeconds(localSourcePath, resolved.ffmpegCommand, timeoutMs);
          } catch {
            durationSec = chunkSec;
          }

          const baseIndex = nextChunkIndex(manifest.audioDir);
          let offset = 0;
          let counter = 0;
          while (offset < durationSec) {
            const startSec = offset;
            const endSec = Math.min(durationSec, offset + chunkSec);
            const chunkIndex = baseIndex + counter;
            const chunkId = formatChunkId(chunkIndex, startSec, endSec);
            const chunkPath = path.join(manifest.audioDir, `${chunkId}.wav`);
            await transcodeSliceToWav(
              resolved.ffmpegCommand,
              localSourcePath,
              chunkPath,
              startSec,
              Math.max(1, endSec - startSec),
              timeoutMs
            );
            queueSingleChunk(chunkPath, chunkIndex, startSec, endSec);
            counter += 1;
            offset = endSec;
          }
        } else {
          const chunkIndex = nextChunkIndex(manifest.audioDir);
          const startSec = Number(command.startSec ?? ((chunkIndex - 1) * chunkSec));
          const endSec = Number(command.endSec ?? (startSec + chunkSec));
          const chunkId = formatChunkId(chunkIndex, startSec, endSec);
          const chunkPath = path.join(manifest.audioDir, `${chunkId}${ext}`);
          if (buffer) {
            fs.writeFileSync(chunkPath, buffer);
          } else if (localSourcePath !== chunkPath) {
            fs.copyFileSync(localSourcePath, chunkPath);
          }
          queueSingleChunk(chunkPath, chunkIndex, startSec, endSec);
        }

        const updatedManifest = updateManifest(manifestPath, (draft) => ({
          ...draft,
          updatedAt: nowIso(),
          source,
          chunkSec,
          sourcePath: draft.sourcePath || localSourcePath,
          chunksQueued: (draft.chunksQueued || 0) + jobs.length
        }));

        this.status({ fill: 'green', shape: 'dot', text: `${jobs.length} queued` });
        send({
          ...msg,
          topic: 'chunk_batch_queued',
          sessionId,
          payload: {
            session: updatedManifest,
            jobs,
            count: jobs.length
          }
        });
        done();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.status({ fill: 'red', shape: 'dot', text: 'chunker error' });
        done(new Error(message));
      }
    });
  }

  RED.nodes.registerType('alephscript-escribiente-chunker', EscribienteChunkerNode);
};
