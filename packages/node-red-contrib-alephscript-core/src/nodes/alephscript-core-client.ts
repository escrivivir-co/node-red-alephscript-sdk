import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';
import { Socket } from 'socket.io-client';

interface CoreAuthErrorPayload {
  reason?: string;
  message?: string;
  error?: {
    message?: string;
  };
  [key: string]: unknown;
}

interface CoreConfigNode extends Node {
  getSocket(): Socket | undefined;
  addConnectionCallback(callback: (connected: boolean) => void): void;
  removeConnectionCallback(callback: (connected: boolean) => void): void;
  addAuthErrorCallback(callback: (payload: CoreAuthErrorPayload) => void): void;
  removeAuthErrorCallback(callback: (payload: CoreAuthErrorPayload) => void): void;
}

interface CoreClientNodeDef extends NodeDef {
  config: string;
  clientName: string;
  session: string;
  clientType: string;
  defaultRoom: string;
  autoRegister: boolean;
  autoSubscribe: boolean;
  features: string;
}

interface CoreClientNode extends Node {
  configNode?: CoreConfigNode;
  clientName: string;
  session: string;
  clientType: string;
  defaultRoom: string;
  features: string[];
  connectionCallback?: (connected: boolean) => void;
  authErrorCallback?: (payload: CoreAuthErrorPayload) => void;
  lastAuthError?: string;
}

interface CoreCommandPayload {
  command?: 'register' | 'subscribe' | 'unsubscribe' | 'room_message' | 'get_server_state' | 'raw_emit';
  room?: string;
  event?: string;
  data?: unknown;
  payload?: unknown;
  args?: unknown[];
}

function parseFeatures(value: string | undefined): string[] {
  return (value || 'node-red,alephscript-core')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sessionId(): string {
  return `nr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatAuthReason(payload: CoreAuthErrorPayload): string {
  return payload.reason || payload.message || payload.error?.message || 'unauthorized';
}

export = function (RED: NodeAPI) {
  function CoreClientNode(this: CoreClientNode, config: CoreClientNodeDef) {
    RED.nodes.createNode(this, config);

    this.configNode = RED.nodes.getNode(config.config) as CoreConfigNode | undefined;
    this.clientName = config.clientName || 'node-red-core-client';
    this.session = config.session || sessionId();
    this.clientType = config.clientType || 'NodeRedCoreClient';
    this.defaultRoom = config.defaultRoom || process.env.ROOMS_DEFAULT_ROOM || 'ENGINE_THREADS';
    this.features = parseFeatures(config.features);

    if (!this.configNode) {
      this.status({ fill: 'red', shape: 'ring', text: 'missing config' });
      this.error('AlephScript Core config node not found');
      return;
    }

    this.connectionCallback = (connected: boolean) => {
      if (connected) {
        this.lastAuthError = undefined;
      }
      this.status({
        fill: connected ? 'green' : 'red',
        shape: connected ? 'dot' : (this.lastAuthError ? 'dot' : 'ring'),
        text: connected ? 'connected' : (this.lastAuthError ? `auth: ${this.lastAuthError}` : 'disconnected')
      });
      if (connected) {
        if (config.autoRegister !== false) {
          registerClient(this);
        }
        if (config.autoSubscribe !== false && this.defaultRoom) {
          emit(this, 'CLIENT_SUSCRIBE', { room: this.defaultRoom });
        }
      }
    };

    this.configNode.addConnectionCallback(this.connectionCallback);

    this.authErrorCallback = (payload: CoreAuthErrorPayload) => {
      const reason = formatAuthReason(payload);
      this.lastAuthError = reason;
      this.status({ fill: 'red', shape: 'dot', text: `auth: ${reason}` });
      this.send({
        topic: 'auth_error',
        payload,
        alephscript: {
          source: 'auth',
          clientName: this.clientName,
          receivedAt: new Date().toISOString(),
          reason
        }
      });
    };
    this.configNode.addAuthErrorCallback(this.authErrorCallback);

    wireInboundEvents(this);

    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        handleInput(this, msg);
        send(msg);
        done();
      } catch (error) {
        done(error instanceof Error ? error : new Error(String(error)));
      }
    });

    this.on('close', () => {
      if (this.configNode && this.connectionCallback) {
        this.configNode.removeConnectionCallback(this.connectionCallback);
      }
      if (this.configNode && this.authErrorCallback) {
        this.configNode.removeAuthErrorCallback(this.authErrorCallback);
      }
    });
  }

  function socketOf(node: CoreClientNode): Socket | undefined {
    return node.configNode?.getSocket();
  }

  function emit(node: CoreClientNode, event: string, payload?: unknown, ...args: unknown[]): void {
    const socket = socketOf(node);
    if (!socket?.connected) {
      node.status({ fill: 'yellow', shape: 'ring', text: 'not connected' });
      throw new Error('AlephScript socket is not connected');
    }
    socket.emit(event, payload, ...args);
  }

  function registerClient(node: CoreClientNode): void {
    emit(node, 'CLIENT_REGISTER', {
      usuario: node.clientName,
      sesion: node.session,
      type: node.clientType,
      features: node.features
    });
  }

  function handleInput(node: CoreClientNode, msg: NodeMessage): void {
    const payload = (msg.payload || {}) as CoreCommandPayload;
    const command = payload.command || (msg.topic as CoreCommandPayload['command']) || 'room_message';

    if (command === 'register') {
      registerClient(node);
      return;
    }

    if (command === 'subscribe') {
      emit(node, 'CLIENT_SUSCRIBE', { room: payload.room || node.defaultRoom });
      return;
    }

    if (command === 'unsubscribe') {
      emit(node, 'CLIENT_UNSUSCRIBE', { room: payload.room || node.defaultRoom });
      return;
    }

    if (command === 'get_server_state') {
      emit(node, 'GET_SERVER_STATE', payload.payload || {});
      return;
    }

    if (command === 'raw_emit') {
      if (!payload.event) {
        throw new Error('payload.event is required for raw_emit');
      }
      emit(node, payload.event, payload.payload, ...(payload.args || []));
      return;
    }

    emit(node, 'ROOM_MESSAGE', {
      event: payload.event || msg.topic || 'NODE_RED_MESSAGE',
      room: payload.room || node.defaultRoom,
      data: payload.data ?? payload.payload ?? msg.payload,
      from: node.clientName,
      timestamp: new Date().toISOString()
    });
  }

  function wireInboundEvents(node: CoreClientNode): void {
    const socket = socketOf(node);
    if (!socket) {
      return;
    }

    socket.onAny((event: string, ...args: unknown[]) => {
      if (event === 'auth_error') {
        return;
      }

      node.send({
        topic: event,
        payload: args.length === 1 ? args[0] : args,
        alephscript: {
          source: 'socket.io',
          clientName: node.clientName,
          receivedAt: new Date().toISOString()
        }
      });
    });
  }

  RED.nodes.registerType('alephscript-core-client', CoreClientNode);
};