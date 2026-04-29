import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';

interface DashboardRecorderNodeDef extends NodeDef {
  group: string;
  width: number;
  height: number;
  defaultChunkSec: number;
  title: string;
  format: string;
}

interface DashboardRecorderNode extends Node {
  defaultChunkSec: number;
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
        data: payload.data,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        chunkSec: payload.chunkSec
      }
    };
  }

  return null;
}

export = function (RED: NodeAPI) {
  function EscribienteDashboardRecorderNode(this: DashboardRecorderNode, config: DashboardRecorderNodeDef) {
    RED.nodes.createNode(this, config);
    this.defaultChunkSec = Number(config.defaultChunkSec) || 60;

    this.on('input', (msg: NodeMessage, send, done) => {
      const normalized = normalizeUiCommand(msg);
      if (normalized) {
        if (normalized.topic === 'open_session_request') {
          this.status({ fill: 'blue', shape: 'dot', text: 'opening session' });
        } else if (normalized.topic === 'mic_chunk' || normalized.topic === 'upload_mp3') {
          this.status({ fill: 'blue', shape: 'dot', text: 'sending audio' });
        } else if (normalized.topic === 'run_precheck') {
          this.status({ fill: 'blue', shape: 'dot', text: 'precheck' });
        }
        send(normalized);
        done();
        return;
      }

      if (msg.topic === 'session_opened') {
        const payload = msg.payload as { sessionId?: string } | undefined;
        this.status({ fill: 'green', shape: 'dot', text: payload?.sessionId || 'session open' });
      } else if (msg.topic === 'session_closed') {
        this.status({ fill: 'yellow', shape: 'ring', text: 'session closed' });
      } else if (msg.topic === 'chunk_completed') {
        this.status({ fill: 'green', shape: 'dot', text: 'transcribed' });
      } else if (msg.topic === 'chunk_failed') {
        this.status({ fill: 'red', shape: 'ring', text: 'chunk failed' });
      } else if (msg.topic === 'precheck_result') {
        const payload = msg.payload as { ready?: boolean; warnings?: unknown[] } | undefined;
        this.status({ fill: payload?.ready ? (payload?.warnings?.length ? 'yellow' : 'green') : 'red', shape: 'dot', text: payload?.ready ? 'ready' : 'not ready' });
      }

      send(msg);
      done();
    });
  }

  RED.nodes.registerType('alephscript-escribiente-dashboard-recorder', EscribienteDashboardRecorderNode);
};
