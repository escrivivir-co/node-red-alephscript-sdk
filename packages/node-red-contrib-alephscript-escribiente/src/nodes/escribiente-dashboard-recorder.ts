import Busboy from 'busboy';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { EscribienteConfigNode } from '../node-types';
import { SessionManifest } from '../types';
import { audioExtensionFromMimeOrName, ensureDirSync, readJsonFile, sanitizeFileName } from '../utils/fs-utils';

interface DashboardRecorderNodeDef extends NodeDef {
  config: string;
  group: string;
  width: number;
  height: number;
  defaultChunkSec: number;
  defaultSource?: 'mic' | 'mp3' | 'mixed';
  title: string;
  uploadPath?: string;
  uploadEnabled?: boolean;
}

interface DashboardRecorderNode extends Node {
  defaultChunkSec: number;
  configNode?: EscribienteConfigNode | null;
}

interface DashboardDataStore {
  save(base: DashboardBaseNode, node: Node, msg: NodeMessage): void;
}

interface DashboardBaseNode extends Node {
  stores?: {
    data?: DashboardDataStore;
  };
}

interface DashboardEvents {
  onInput?: (msg: NodeMessage, send: (msg?: NodeMessage) => void) => void | Promise<void>;
  onSocket?: Record<string, (conn: unknown, id: string, msg: NodeMessage) => void>;
  onError?: (error: Error) => void;
}

interface DashboardGroupNode extends Node {
  register(node: Node, config: DashboardRecorderNodeDef, evts: DashboardEvents): void;
  getBase(): DashboardBaseNode;
}

interface UploadTarget {
  sessionsRoot: string;
}

interface UploadHttpRequest {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
  pipe: (dest: NodeJS.WritableStream) => void;
}

interface UploadHttpResponse {
  status: (code: number) => UploadHttpResponse;
  json: (payload: unknown) => void;
}

const uploadTargets = new Map<string, UploadTarget>();
const uploadRouteBase = '/alephscript-escribiente/upload';
const maxUploadBytes = 1024 * 1024 * 512;
let uploadRouteRegistered = false;

function buildManifestPath(sessionsRoot: string, sessionId: string): string {
  return path.join(sessionsRoot, sessionId, 'manifest.json');
}

function joinHttpPath(...segments: Array<string | undefined>): string {
  const cleaned = segments
    .filter((segment): segment is string => typeof segment === 'string' && segment.length > 0)
    .map((segment, index) => index === 0 ? segment.replace(/\/+$/g, '') : segment.replace(/^\/+|\/+$/g, ''))
    .filter((segment) => segment.length > 0);

  if (!cleaned.length) {
    return '/';
  }

  const joined = cleaned.join('/');
  return joined.startsWith('/') ? joined : `/${joined}`;
}

function buildUploadPath(httpNodeRoot: string | undefined, nodeId: string): string {
  return joinHttpPath(httpNodeRoot || '/', uploadRouteBase, encodeURIComponent(nodeId));
}

function sendUploadError(res: UploadHttpResponse, statusCode: number, error: string): void {
  res.status(statusCode).json({ error });
}

function isSupportedAudioFile(fileName: string, mimeType: string): boolean {
  const ext = audioExtensionFromMimeOrName(mimeType, fileName, '');
  return mimeType.startsWith('audio/') || ['.mp3', '.wav', '.aac', '.ogg', '.webm', '.m4a'].includes(ext);
}

function buildStoredUploadName(fileName: string, mimeType: string): string {
  const ext = audioExtensionFromMimeOrName(mimeType, fileName, '.mp3');
  const normalizedBase = sanitizeFileName(path.basename(fileName || `upload${ext}`));
  const fileNameWithExt = path.extname(normalizedBase) ? normalizedBase : `${normalizedBase}${ext}`;
  return `${Date.now()}-${fileNameWithExt}`;
}

async function parseAndStoreUpload(req: UploadHttpRequest, sessionsRoot: string): Promise<{ audioPath: string; fileName: string; mimeType: string; size: number; sessionId: string; }> {
  return new Promise((resolve, reject) => {
    const parser = Busboy({
      headers: req.headers,
      limits: {
        fields: 10,
        files: 1,
        parts: 12,
        fileSize: maxUploadBytes
      }
    });

    let sessionId = '';
    let destinationPath = '';
    let storedFileName = '';
    let mimeType = 'audio/mpeg';
    let fileWritePromise: Promise<void> | null = null;
    let bytesReceived = 0;
    let fileSeen = false;
    let limitReached = false;
    let finalizeStarted = false;

    const cleanupDestination = async () => {
      if (fileWritePromise) {
        try {
          await fileWritePromise;
        } catch {
          // Ignore write errors here; the original parse error is more useful.
        }
      }

      if (destinationPath && fs.existsSync(destinationPath)) {
        fs.rmSync(destinationPath, { force: true });
      }
    };

    const fail = (error: Error) => {
      if (finalizeStarted) {
        return;
      }
      finalizeStarted = true;
      cleanupDestination()
        .finally(() => reject(error));
    };

    parser.on('field', (name: string, value: string) => {
      if (name === 'sessionId') {
        sessionId = value.trim();
      }
    });

    parser.on('file', (name, stream, info) => {
      if (name !== 'file') {
        stream.resume();
        return;
      }

      if (fileSeen) {
        stream.resume();
        fail(new Error('Only one upload file is supported per request'));
        return;
      }

      fileSeen = true;

      if (!sessionId) {
        stream.resume();
        fail(new Error('sessionId must be provided before the file field'));
        return;
      }

      const manifestPath = buildManifestPath(sessionsRoot, sessionId);
      const manifest = readJsonFile<SessionManifest | null>(manifestPath, null);
      if (!manifest?.sessionId) {
        stream.resume();
        fail(new Error(`Session manifest not found for ${sessionId}`));
        return;
      }

      if (manifest.status && manifest.status !== 'open') {
        stream.resume();
        fail(new Error(`Session ${sessionId} is not open for uploads`));
        return;
      }

      mimeType = info.mimeType || 'audio/mpeg';
      if (!isSupportedAudioFile(info.filename, mimeType)) {
        stream.resume();
        fail(new Error('Only audio files are supported for Escribiente uploads'));
        return;
      }

      storedFileName = buildStoredUploadName(info.filename, mimeType);
      ensureDirSync(manifest.sourceFilesDir);
      destinationPath = path.join(manifest.sourceFilesDir, storedFileName);

      stream.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
      });

      stream.on('limit', () => {
        limitReached = true;
      });

      fileWritePromise = pipeline(stream, fs.createWriteStream(destinationPath));
    });

    parser.on('filesLimit', () => {
      fail(new Error('Only one audio file can be uploaded at a time'));
    });

    parser.on('partsLimit', () => {
      fail(new Error('Upload request has too many multipart sections'));
    });

    parser.on('fieldsLimit', () => {
      fail(new Error('Upload request has too many fields'));
    });

    parser.on('error', (error: unknown) => {
      fail(error instanceof Error ? error : new Error(String(error)));
    });

    parser.on('close', () => {
      if (finalizeStarted) {
        return;
      }

      finalizeStarted = true;

      (async () => {
        if (!sessionId) {
          throw new Error('sessionId is required');
        }

        if (!fileSeen || !fileWritePromise || !destinationPath) {
          throw new Error('No audio file was received');
        }

        await fileWritePromise;

        if (limitReached) {
          await cleanupDestination();
          throw new Error(`Uploaded file exceeds the ${Math.floor(maxUploadBytes / (1024 * 1024))}MB limit`);
        }

        resolve({
          audioPath: destinationPath,
          fileName: storedFileName,
          mimeType,
          size: bytesReceived,
          sessionId
        });
      })().catch((error) => {
        cleanupDestination()
          .finally(() => reject(error instanceof Error ? error : new Error(String(error))));
      });
    });

    req.pipe(parser);
  });
}

function ensureUploadRoute(RED: NodeAPI): void {
  if (uploadRouteRegistered || !RED.httpNode) {
    return;
  }

  uploadRouteRegistered = true;
  RED.httpNode.post(`${uploadRouteBase}/:nodeId`, async (req: UploadHttpRequest, res: UploadHttpResponse) => {
    const rawNodeId = req.params?.nodeId;
    const nodeId = typeof rawNodeId === 'string' ? decodeURIComponent(rawNodeId) : '';
    if (!nodeId) {
      sendUploadError(res, 400, 'nodeId is required');
      return;
    }

    const target = uploadTargets.get(nodeId);
    if (!target) {
      sendUploadError(res, 404, `Escribiente recorder ${nodeId} is not available for uploads`);
      return;
    }

    try {
      const upload = await parseAndStoreUpload(req, target.sessionsRoot);
      res.status(201).json(upload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = /not found/i.test(message)
        ? 404
        : /limit|too many|exceeds/i.test(message)
          ? 413
          : /required|supported|open for uploads/i.test(message)
            ? 400
            : 500;
      sendUploadError(res, statusCode, message);
    }
  });
}

function normalizeUiCommand(msg: NodeMessage): NodeMessage | null {
  const payload = (msg.payload || {}) as Record<string, unknown>;
  const command = typeof payload.command === 'string' ? payload.command : null;
  if (!command) {
    return null;
  }

  if (command === 'run_precheck') {
    return { ...msg, topic: 'run_precheck', payload: { action: 'precheck' } };
  }

  if (command === 'open_session') {
    return {
      ...msg,
      topic: 'open_session_request',
      payload: {
        action: 'open',
        slug: payload.slug,
        source: payload.source,
        chunkSec: payload.chunkSec
      }
    };
  }

  if (command === 'close_session') {
    return {
      ...msg,
      topic: 'close_session_request',
      sessionId: payload.sessionId,
      payload: {
        action: 'close',
        sessionId: payload.sessionId
      }
    };
  }

  if (command === 'mic_chunk') {
    return {
      ...msg,
      topic: 'mic_chunk',
      sessionId: payload.sessionId,
      payload: {
        action: 'queue_chunk',
        sessionId: payload.sessionId,
        source: 'mic',
        data: payload.data,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        startSec: payload.startSec,
        endSec: payload.endSec,
        chunkSec: payload.chunkSec
      }
    };
  }

  if (command === 'upload_mp3') {
    return {
      ...msg,
      topic: 'upload_mp3',
      sessionId: payload.sessionId,
      payload: {
        action: 'chunk_file',
        sessionId: payload.sessionId,
        source: 'mp3',
        audioPath: payload.audioPath,
        data: payload.data,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        chunkSec: payload.chunkSec
      }
    };
  }

  return null;
}

function updateStatus(node: Node, msg: NodeMessage): void {
  const topic = msg.topic || '';

  if (topic === 'open_session_request') {
    node.status({ fill: 'blue', shape: 'dot', text: 'opening session' });
    return;
  }

  if (topic === 'mic_chunk' || topic === 'upload_mp3') {
    node.status({ fill: 'blue', shape: 'dot', text: 'sending audio' });
    return;
  }

  if (topic === 'run_precheck') {
    node.status({ fill: 'blue', shape: 'dot', text: 'precheck' });
    return;
  }

  if (topic === 'session_opened') {
    const payload = msg.payload as { sessionId?: string } | undefined;
    node.status({ fill: 'green', shape: 'dot', text: payload?.sessionId || 'session open' });
    return;
  }

  if (topic === 'session_closed' || topic === 'session_closing') {
    node.status({ fill: 'yellow', shape: 'ring', text: topic === 'session_closed' ? 'session closed' : 'closing session' });
    return;
  }

  if (topic === 'chunk_completed') {
    node.status({ fill: 'green', shape: 'dot', text: 'transcribed' });
    return;
  }

  if (topic === 'chunk_failed' || topic === 'precheck_error') {
    node.status({ fill: 'red', shape: 'ring', text: topic === 'chunk_failed' ? 'chunk failed' : 'precheck error' });
    return;
  }

  if (topic === 'precheck_result') {
    const payload = msg.payload as { ready?: boolean; warnings?: unknown[] } | undefined;
    node.status({
      fill: payload?.ready ? (payload?.warnings?.length ? 'yellow' : 'green') : 'red',
      shape: 'dot',
      text: payload?.ready ? 'ready' : 'not ready'
    });
  }
}

export = function (RED: NodeAPI) {
  ensureUploadRoute(RED);

  function EscribienteDashboardRecorderNode(this: DashboardRecorderNode, config: DashboardRecorderNodeDef) {
    RED.nodes.createNode(this, config);
    this.defaultChunkSec = Number(config.defaultChunkSec) || 60;
    this.configNode = config.config
      ? RED.nodes.getNode(config.config) as EscribienteConfigNode | null
      : null;

    const group = RED.nodes.getNode(config.group) as DashboardGroupNode | null;
    if (!group) {
      this.error('Dashboard 2 group node not found');
      return;
    }

    if (this.configNode) {
      uploadTargets.set(this.id, {
        sessionsRoot: this.configNode.getResolvedConfig().sessionsRoot
      });
    } else if (config.config) {
      this.error('Escribiente config node not found; MP3 uploads are disabled for this recorder');
    }

    const base = group.getBase?.();
    const saveLatestMessage = (msg: NodeMessage) => {
      if (base?.stores?.data?.save) {
        base.stores.data.save(base, this, msg);
      }
    };

    const settings = RED as NodeAPI & { settings?: { httpNodeRoot?: string } };
    const widgetConfig: DashboardRecorderNodeDef = {
      ...config,
      uploadPath: this.configNode ? buildUploadPath(settings.settings?.httpNodeRoot, this.id) : '',
      uploadEnabled: Boolean(this.configNode)
    };

    const evts: DashboardEvents = {
      onInput: async (msg: NodeMessage) => {
        saveLatestMessage(msg);
        updateStatus(this, msg);
      },
      onSocket: {
        'escribiente-send': (_conn: unknown, id: string, msg: NodeMessage) => {
          if (id !== this.id) {
            return;
          }

          try {
            const normalized = normalizeUiCommand(msg);
            const outbound = normalized || msg;
            updateStatus(this, outbound);
            this.send(outbound);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.status({ fill: 'red', shape: 'ring', text: 'ui error' });
            this.error(message);
          }
        }
      },
      onError: (error: Error) => {
        this.error(error.message);
      }
    };

    this.on('close', () => {
      uploadTargets.delete(this.id);
    });

    group.register(this, widgetConfig, evts);
  }

  RED.nodes.registerType('alephscript-escribiente-dashboard-recorder', EscribienteDashboardRecorderNode);
};
