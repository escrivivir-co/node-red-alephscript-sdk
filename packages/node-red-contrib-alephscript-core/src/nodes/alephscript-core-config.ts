import { Node, NodeAPI, NodeDef } from 'node-red';
import { AlephScriptClient } from '@alephscript/mcp-core-sdk/client';
import { Socket } from 'socket.io-client';

interface CoreConfigNodeDef extends NodeDef {
  serverUrl: string;
  namespace: string;
  authToken: string;
  authRoom: string;
  authUser: string;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
}

interface CoreAuthErrorPayload {
  reason?: string;
  message?: string;
  error?: {
    message?: string;
  };
  [key: string]: unknown;
}

interface CoreConfigNode extends Node {
  serverUrl: string;
  namespace: string;
  authToken: string;
  authRoom: string;
  authUser: string;
  socket?: Socket;
  client?: AlephScriptClient;
  connectionCallbacks: Set<(connected: boolean) => void>;
  authErrorCallbacks: Set<(payload: CoreAuthErrorPayload) => void>;
  getSocket(): Socket | undefined;
  getClient(): AlephScriptClient | undefined;
  getEndpoint(): string;
  addConnectionCallback(callback: (connected: boolean) => void): void;
  removeConnectionCallback(callback: (connected: boolean) => void): void;
  addAuthErrorCallback(callback: (payload: CoreAuthErrorPayload) => void): void;
  removeAuthErrorCallback(callback: (payload: CoreAuthErrorPayload) => void): void;
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeAuthError(payload: unknown): CoreAuthErrorPayload {
  if (payload && typeof payload === 'object') {
    return payload as CoreAuthErrorPayload;
  }

  return {
    message: payload ? String(payload) : 'unauthorized'
  };
}

function buildAuthPayload(node: CoreConfigNode): { token?: string; room?: string; user?: string } {
  return {
    token: normalizeText(node.authToken),
    room: normalizeText(node.authRoom),
    user: normalizeText(node.authUser)
  };
}

export = function (RED: NodeAPI) {
  function CoreConfigNode(this: CoreConfigNode, config: CoreConfigNodeDef) {
    RED.nodes.createNode(this, config);

    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.namespace = config.namespace || '/runtime';
    this.authToken = config.authToken || '';
    this.authRoom = config.authRoom || process.env.ROOMS_DEFAULT_ROOM || '';
    this.authUser = config.authUser || '';
    this.connectionCallbacks = new Set();
    this.authErrorCallbacks = new Set();

    this.client = new AlephScriptClient(config.name || 'AlephScript Core Server', this.serverUrl, this.namespace, {
      auth: buildAuthPayload(this),
      autoConnect: true,
      transports: ['websocket', 'polling'],
      timeout: Number(config.timeout) || 5000,
      reconnection: config.reconnection !== false,
      reconnectionAttempts: Number(config.reconnectionAttempts) || 5,
      reconnectionDelayMax: Number(config.reconnectionDelay) || 1000
    });
    this.socket = this.client.io;

    this.socket.on('connect', () => {
      this.connectionCallbacks.forEach((callback) => callback(true));
    });

    this.socket.on('disconnect', () => {
      this.connectionCallbacks.forEach((callback) => callback(false));
    });

    this.socket.on('connect_error', (error) => {
      this.error(`AlephScript connection error: ${error.message}`);
      this.connectionCallbacks.forEach((callback) => callback(false));
    });

    this.client.on('auth_error', (payload) => {
      const authError = normalizeAuthError(payload);
      const reason = authError.reason || authError.message || authError.error?.message || 'unauthorized';
      this.warn(`AlephScript auth error: ${reason}`);
      this.authErrorCallbacks.forEach((callback) => callback(authError));
    });

    this.on('close', () => {
      this.client?.disconnect();
      this.socket = undefined;
      this.client = undefined;
      this.connectionCallbacks.clear();
      this.authErrorCallbacks.clear();
    });
  }

  CoreConfigNode.prototype.getSocket = function (this: CoreConfigNode): Socket | undefined {
    return this.socket;
  };

  CoreConfigNode.prototype.getClient = function (this: CoreConfigNode): AlephScriptClient | undefined {
    return this.client;
  };

  CoreConfigNode.prototype.getEndpoint = function (this: CoreConfigNode): string {
    return `${this.serverUrl.replace(/\/+$/g, '')}${this.namespace.startsWith('/') ? this.namespace : `/${this.namespace}`}`;
  };

  CoreConfigNode.prototype.addConnectionCallback = function (this: CoreConfigNode, callback: (connected: boolean) => void): void {
    this.connectionCallbacks.add(callback);
  };

  CoreConfigNode.prototype.removeConnectionCallback = function (this: CoreConfigNode, callback: (connected: boolean) => void): void {
    this.connectionCallbacks.delete(callback);
  };

  CoreConfigNode.prototype.addAuthErrorCallback = function (this: CoreConfigNode, callback: (payload: CoreAuthErrorPayload) => void): void {
    this.authErrorCallbacks.add(callback);
  };

  CoreConfigNode.prototype.removeAuthErrorCallback = function (this: CoreConfigNode, callback: (payload: CoreAuthErrorPayload) => void): void {
    this.authErrorCallbacks.delete(callback);
  };

  RED.nodes.registerType('alephscript-core-config', CoreConfigNode);
};