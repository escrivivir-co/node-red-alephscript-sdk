import { Node, NodeDef, NodeInitializer, NodeMessage } from 'node-red';
import { io, Socket } from 'socket.io-client';

interface BotNodeDef extends NodeDef {
  botName: string;
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
  features: string[];
}

interface BotNode extends Node {
  socket?: Socket;
  botName: string;
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
  features: string[];
  initializeConnection(): void;
  generateSessionHash(): string;
}

interface AlephScriptMessage {
  from: string;
  data: any;
  timestamp: string;
  type?: string;
}

const BotNodeInitializer: NodeInitializer = (RED) => {
  function BotNodeConstructor(this: BotNode, config: BotNodeDef) {
    RED.nodes.createNode(this, config);
    
    this.botName = config.botName || 'NodeRedBot';
    this.serverUrl = config.serverUrl || 'http://localhost:3000';
    this.namespace = config.namespace || '/runtime';
    this.autoConnect = config.autoConnect !== false;
    this.features = config.features || ['messaging', 'node-red-integration'];

    // Initialize AlephScript connection
    if (this.autoConnect) {
      this.initializeConnection();
    }

    // Handle node input - send messages to AlephScript
    this.on('input', (msg: NodeMessage, send, done) => {
      if (this.socket && this.socket.connected) {
        const alephMessage: AlephScriptMessage = {
          from: this.botName,
          data: msg.payload,
          timestamp: new Date().toISOString(),
          type: msg.topic || 'node-red-message'
        };
        
        // Emit to all connected clients in namespace
        this.socket.emit('ROOM_MESSAGE', {
          event: 'NODE_RED_MESSAGE',
          room: 'ENGINE_THREADS', // Default room for bot messages
          data: alephMessage
        });
        
        // Forward message through the flow
        send(msg);
        done();
      } else {
        done(new Error('Bot not connected to AlephScript server'));
      }
    });

    // Handle node close
    this.on('close', () => {
      if (this.socket) {
        this.socket.disconnect();
      }
    });
  }

  BotNodeConstructor.prototype.initializeConnection = function(this: BotNode) {
    try {
      const fullUrl = this.serverUrl + this.namespace;
      this.socket = io(fullUrl);
      
      this.socket.on('connect', () => {
        this.status({ fill: 'green', shape: 'dot', text: 'connected' });
        
        // Follow AlephScript protocol: CLIENT_REGISTER first
        this.socket?.emit('CLIENT_REGISTER', { 
          usuario: this.botName,  // Using "usuario" as per protocol
          sesion: this.generateSessionHash(),
          type: 'NodeRedBot',
          features: this.features
        });
        
        // Then subscribe to ENGINE_THREADS room (standard for bots)
        this.socket?.emit('CLIENT_SUSCRIBE', { 
          room: 'ENGINE_THREADS' 
        });
        
        this.log(`🤖 ${this.botName} registered and subscribed to ENGINE_THREADS`);
      });

      this.socket.on('disconnect', () => {
        this.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        this.log(`🔌 ${this.botName} disconnected from AlephScript server`);
      });

      this.socket.on('connect_error', (error: any) => {
        this.status({ fill: 'red', shape: 'dot', text: 'connection error' });
        this.error(`Connection error: ${error.message}`);
      });

      // Listen for broadcast messages from server
      this.socket.onAny((event: string, ...args: any[]) => {
        // Forward all AlephScript events as Node-RED messages
        this.send({
          payload: {
            event,
            args,
            source: 'alephscript-server'
          },
          topic: 'alephscript-event',
          timestamp: new Date().toISOString()
        });
      });

      // Listen for specific room messages
      this.socket.on('ROOM_MESSAGE', (data: any) => {
        this.send({
          payload: data,
          topic: 'room-message',
          timestamp: new Date().toISOString()
        });
      });

      // Listen for sys channel messages (health, errors, warnings)
      this.socket.on('SYS_HEALTH_CHECK', (data: any) => {
        this.send({
          payload: data,
          topic: 'sys-health',
          timestamp: new Date().toISOString()
        });
      });

      this.socket.on('SYS_ERROR', (data: any) => {
        this.send({
          payload: data,
          topic: 'sys-error',
          timestamp: new Date().toISOString()
        });
      });

      this.socket.on('SYS_WARNING', (data: any) => {
        this.send({
          payload: data,
          topic: 'sys-warning',
          timestamp: new Date().toISOString()
        });
      });

    } catch (error) {
      this.error(`Failed to initialize connection: ${error}`);
      this.status({ fill: 'red', shape: 'dot', text: 'error' });
    }
  };

  BotNodeConstructor.prototype.generateSessionHash = function(this: BotNode): string {
    // Simple session hash generator
    return Math.random().toString(36).substring(2, 15);
  };

  RED.nodes.registerType('alephscript-bot', BotNodeConstructor);
};

export = BotNodeInitializer;
