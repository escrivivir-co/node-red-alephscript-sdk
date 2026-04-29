import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';

interface DashboardRecorderNodeDef extends NodeDef {
  group: string;
  width: number;
  height: number;
  defaultChunkSec: number;
  defaultSource?: 'mic' | 'mp3' | 'mixed';
  title: string;
}

interface DashboardRecorderNode extends Node {
  defaultChunkSec: number;
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
  function EscribienteDashboardRecorderNode(this: DashboardRecorderNode, config: DashboardRecorderNodeDef) {
    RED.nodes.createNode(this, config);
    this.defaultChunkSec = Number(config.defaultChunkSec) || 60;

    const group = RED.nodes.getNode(config.group) as DashboardGroupNode | null;
    if (!group) {
      this.error('Dashboard 2 group node not found');
      return;
    }

    const base = group.getBase?.();
    const saveLatestMessage = (msg: NodeMessage) => {
      if (base?.stores?.data?.save) {
        base.stores.data.save(base, this, msg);
      }
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

          const normalized = normalizeUiCommand(msg);
          const outbound = normalized || msg;
          updateStatus(this, outbound);
          this.send(outbound);
        }
      },
      onError: (error: Error) => {
        this.error(error.message);
      }
    };

    group.register(this, config, evts);
  }

  RED.nodes.registerType('alephscript-escribiente-dashboard-recorder', EscribienteDashboardRecorderNode);
};
