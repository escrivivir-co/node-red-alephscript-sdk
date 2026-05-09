import { Node, NodeAPI, NodeDef } from 'node-red';
import { io, Socket } from 'socket.io-client';

interface CoreConfigNodeDef extends NodeDef {
  serverUrl: string;
  namespace: string;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  timeout: number;
}

interface CoreConfigNode extends Node {
  serverUrl: string;
  namespace: string;
  socket?: Socket;
  connectionCallbacks: Set<(connected: boolean) => void>;
  getSocket(): Socket | undefined;
  getEndpoint(): string;
  addConnectionCallback(callback: (connected: boolean) => void): void;
  removeConnectionCallback(callback: (connected: boolean) => void): void;
}

export = function (RED: NodeAPI) {
  function CoreConfigNode(this: CoreConfigNode, config: CoreConfigNodeDef) {
    RED.nodes.createNode(this, config);

    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.namespace = config.namespace || '/runtime';
    this.connectionCallbacks = new Set();

    const endpoint = this.getEndpoint();
    this.socket = io(endpoint, {
      transports: ['websocket', 'polling'],
      timeout: Number(config.timeout) || 5000,
      reconnection: config.reconnection !== false,
      reconnectionAttempts: Number(config.reconnectionAttempts) || 5,
      reconnectionDelay: Number(config.reconnectionDelay) || 1000
    });

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

    this.on('close', () => {
      this.socket?.disconnect();
      this.socket = undefined;
      this.connectionCallbacks.clear();
    });
  }

  CoreConfigNode.prototype.getSocket = function (this: CoreConfigNode): Socket | undefined {
    return this.socket;
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

  RED.nodes.registerType('alephscript-core-config', CoreConfigNode);
};