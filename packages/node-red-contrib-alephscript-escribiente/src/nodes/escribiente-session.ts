import fs from 'fs';
import path from 'path';
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { EscribienteConfigNode } from '../node-types';
import { SessionManifest } from '../types';
import { buildSessionId, ensureDirSync, nowIso, readJsonFile, slugify, updateManifest, writeJsonFile } from '../utils/fs-utils';

interface SessionNodeDef extends NodeDef {
  config: string;
}

interface SessionNode extends Node {
  configNode: EscribienteConfigNode;
}

interface SessionCommand {
  action?: 'open' | 'close' | 'status';
  slug?: string;
  sessionId?: string;
  source?: 'mic' | 'mp3' | 'mixed';
  sourcePath?: string;
  chunkSec?: number;
}

function manifestPathForSession(sessionsRoot: string, sessionId: string): string {
  return path.join(sessionsRoot, sessionId, 'manifest.json');
}

export = function (RED: NodeAPI) {
  function EscribienteSessionNode(this: SessionNode, config: SessionNodeDef) {
    RED.nodes.createNode(this, config);

    this.configNode = RED.nodes.getNode(config.config) as EscribienteConfigNode;
    if (!this.configNode) {
      this.error('Escribiente config node not found');
      return;
    }

    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        const resolved = this.configNode.getResolvedConfig();
        const command = (msg.payload || {}) as SessionCommand;
        const action = command.action || (msg.topic === 'open_session_request'
          ? 'open'
          : msg.topic === 'close_session_request'
            ? 'close'
            : msg.topic === 'session_status_request'
              ? 'status'
              : undefined);

        if (!action) {
          done();
          return;
        }

        if (action === 'open') {
          const slug = slugify(command.slug || 'sesion');
          const sessionId = command.sessionId || buildSessionId(slug);
          const sessionDir = path.join(resolved.sessionsRoot, sessionId);
          const audioDir = path.join(sessionDir, 'audio');
          const textDir = path.join(sessionDir, 'text');
          const sourceFilesDir = path.join(sessionDir, 'source-files');
          const queueInbox = path.join(resolved.queueRoot, 'INBOX', sessionId);
          const queueOutbox = path.join(resolved.queueRoot, 'OUTBOX', sessionId);
          const manifestPath = manifestPathForSession(resolved.sessionsRoot, sessionId);

          [sessionDir, audioDir, textDir, sourceFilesDir, queueInbox, queueOutbox].forEach(ensureDirSync);

          const existing = readJsonFile<SessionManifest | null>(manifestPath, null);
          const manifest: SessionManifest = existing ?? {
            sessionId,
            slug,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            source: command.source || resolved.defaultSource,
            status: 'open',
            model: resolved.model,
            device: resolved.device,
            computeType: resolved.computeType,
            language: resolved.language,
            beamSize: resolved.beamSize,
            chunkSec: Number(command.chunkSec) || resolved.chunkSec,
            sessionDir,
            queueInbox,
            queueOutbox,
            audioDir,
            textDir,
            sourceFilesDir,
            chunksQueued: 0,
            chunksCompleted: 0,
            chunksFailed: 0,
            sourcePath: command.sourcePath,
            notes: []
          };

          manifest.status = 'open';
          manifest.updatedAt = nowIso();
          manifest.beamSize = manifest.beamSize || resolved.beamSize;
          if (command.sourcePath) {
            manifest.sourcePath = command.sourcePath;
          }
          writeJsonFile(manifestPath, manifest);

          this.status({ fill: 'green', shape: 'dot', text: sessionId });
          send({
            ...msg,
            sessionId,
            topic: 'session_opened',
            payload: manifest
          });
          done();
          return;
        }

        const sessionId = command.sessionId || (msg as NodeMessage & { sessionId?: string }).sessionId;
        if (!sessionId) {
          throw new Error('sessionId is required for close/status actions');
        }

        const manifestPath = manifestPathForSession(resolved.sessionsRoot, sessionId);
        if (!fs.existsSync(manifestPath)) {
          throw new Error(`Session manifest not found for ${sessionId}`);
        }

        if (action === 'status') {
          const manifest = readJsonFile<SessionManifest>(manifestPath, {} as SessionManifest);
          this.status({ fill: 'blue', shape: 'dot', text: `${manifest.chunksCompleted}/${manifest.chunksQueued}` });
          send({
            ...msg,
            sessionId,
            topic: 'session_status',
            payload: manifest
          });
          done();
          return;
        }

        const manifest = updateManifest(manifestPath, (draft) => ({
          ...draft,
          status: 'closing',
          updatedAt: nowIso()
        }));
        this.status({ fill: 'yellow', shape: 'ring', text: `closing ${sessionId}` });
        send({
          ...msg,
          sessionId,
          topic: 'session_closing',
          payload: manifest
        });
        done();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.status({ fill: 'red', shape: 'dot', text: 'session error' });
        done(new Error(message));
      }
    });
  }

  RED.nodes.registerType('alephscript-escribiente-session', EscribienteSessionNode);
};
