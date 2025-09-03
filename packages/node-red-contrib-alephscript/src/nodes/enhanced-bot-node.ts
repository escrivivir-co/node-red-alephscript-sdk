import { Node, NodeDef, NodeInitializer, NodeMessage } from 'node-red';
import { io, Socket } from 'socket.io-client';

// Define NodeSend type locally since it's not exported
type NodeSend = (msg: NodeMessage | NodeMessage[] | (NodeMessage | null)[] | null) => void;

interface EnhancedBotNodeDef extends NodeDef {
  botName: string;
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
  features: string[];
  // Enhanced properties for multi-output
  outputSelection: ('app' | 'sys' | 'ui' | 'debug')[];
  triggerMode: 'manual' | 'interval' | 'external';
  intervalSeconds: number;
  payloadType: 'timestamp' | 'string' | 'json' | 'number';
  payload: any;
}

interface EnhancedBotNode extends Node {
  socket?: Socket;
  botName: string;
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
  features: string[];
  // Enhanced properties
  outputSelection: ('app' | 'sys' | 'ui' | 'debug')[];
  triggerMode: 'manual' | 'interval' | 'external';
  intervalSeconds: number;
  payloadType: 'timestamp' | 'string' | 'json' | 'number';
  payload: any;
  intervalTimer?: NodeJS.Timeout;
  
  initializeConnection(): void;
  generateSessionHash(): string;
  sendToSelectedOutputs(data: any, send: NodeSend): void;
  startInterval(): void;
  stopInterval(): void;
}

interface AlephScriptMessage {
  from: string;
  data: any;
  timestamp: string;
  type?: string;
}

const EnhancedBotNodeInitializer: NodeInitializer = (RED) => {
  function EnhancedBotNodeConstructor(this: EnhancedBotNode, config: EnhancedBotNodeDef) {
    RED.nodes.createNode(this, config);
    
    // Original bot properties
    this.botName = config.botName || 'NodeRedBot';
    this.serverUrl = config.serverUrl || 'http://localhost:3000';
    this.namespace = config.namespace || '/runtime';
    this.autoConnect = config.autoConnect !== false;
    this.features = config.features || ['messaging', 'node-red-integration'];
    
    // Enhanced properties for multi-output
    this.outputSelection = config.outputSelection || ['debug'];
    this.triggerMode = config.triggerMode || 'manual';
    this.intervalSeconds = config.intervalSeconds || 5;
    this.payloadType = config.payloadType || 'timestamp';
    this.payload = config.payload || '';

    // Initialize AlephScript connection
    if (this.autoConnect) {
      this.initializeConnection();
    }

    // Start interval if configured
    if (this.triggerMode === 'interval') {
      this.startInterval();
    }

    // Handle external input (enhanced functionality)
    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        // If connected to AlephScript, emit the message
        if (this.socket && this.socket.connected) {
          const alephMessage: AlephScriptMessage = {
            from: this.botName,
            data: msg.payload,
            timestamp: new Date().toISOString(),
            type: msg.topic || 'node-red-message'
          };
          
          // Emit to AlephScript server
          this.socket.emit('ROOM_MESSAGE', {
            event: 'NODE_RED_MESSAGE',
            room: 'ENGINE_THREADS',
            data: alephMessage
          });
        }

        // Send to selected outputs (NEW: Multi-output functionality)
        this.sendToSelectedOutputs(msg.payload, (msgs) => send(msgs as any));
        done();
        
      } catch (error) {
        done(error instanceof Error ? error : new Error(String(error)));
      }
    });

    // Handle node close
    this.on('close', () => {
      this.stopInterval();
      if (this.socket) {
        this.socket.disconnect();
      }
    });
  }

  // NEW: Multi-output sender
  EnhancedBotNodeConstructor.prototype.sendToSelectedOutputs = function(
    this: EnhancedBotNode, 
    data: any, 
    send: NodeSend
  ) {
    // Prepare base message with enhanced info
    const baseMessage = {
      payload: data,
      timestamp: Date.now(),
      botName: this.botName,
      source: 'enhanced-bot-node'
    };

    // Create output array (4 outputs: app, sys, ui, debug)
    const outputs: (NodeMessage | null)[] = [null, null, null, null];

    // Output 0: App Channel (if selected)
    if (this.outputSelection.includes('app')) {
      outputs[0] = {
        ...baseMessage,
        topic: 'app-channel-ready',
        channelType: 'app'
      };
    }

    // Output 1: Sys Channel (if selected)  
    if (this.outputSelection.includes('sys')) {
      outputs[1] = {
        ...baseMessage,
        topic: 'sys-channel-ready',
        channelType: 'sys'
      };
    }

    // Output 2: UI Channel (if selected)
    if (this.outputSelection.includes('ui')) {
      outputs[2] = {
        ...baseMessage,
        topic: 'ui-channel-ready',
        channelType: 'ui'
      };
    }

    // Output 3: Debug (if selected)
    if (this.outputSelection.includes('debug')) {
      outputs[3] = {
        ...baseMessage,
        topic: 'debug-output'
      };
    }

    send(outputs);
  };

  // NEW: Interval functionality
  EnhancedBotNodeConstructor.prototype.startInterval = function(this: EnhancedBotNode) {
    this.stopInterval(); // Clear any existing interval
    
    this.intervalTimer = setInterval(() => {
      let payloadData: any;
      
      // Generate payload based on type
      switch (this.payloadType) {
        case 'timestamp':
          payloadData = Date.now();
          break;
        case 'string':
          payloadData = this.payload || 'Interval trigger';
          break;
        case 'json':
          try {
            payloadData = JSON.parse(this.payload || '{}');
          } catch {
            payloadData = {};
          }
          break;
        case 'number':
          payloadData = parseFloat(this.payload) || 0;
          break;
        default:
          payloadData = Date.now();
      }

      // Send to selected outputs
      this.sendToSelectedOutputs(payloadData, (msgs: any) => this.send(msgs));
      
    }, this.intervalSeconds * 1000);
  };

  EnhancedBotNodeConstructor.prototype.stopInterval = function(this: EnhancedBotNode) {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
  };

  // Original connection logic (unchanged)
  EnhancedBotNodeConstructor.prototype.initializeConnection = function(this: EnhancedBotNode) {
    try {
      const fullUrl = this.serverUrl + this.namespace;
      this.socket = io(fullUrl);
      
      this.socket.on('connect', () => {
        this.status({ fill: 'green', shape: 'dot', text: `connected (${this.outputSelection.join(',')})` });
        
        // Follow AlephScript protocol: CLIENT_REGISTER first
        this.socket?.emit('CLIENT_REGISTER', { 
          usuario: this.botName,
          sesion: this.generateSessionHash(),
          type: 'EnhancedNodeRedBot',
          features: this.features
        });
        
        // Subscribe to ENGINE_THREADS room
        this.socket?.emit('CLIENT_SUSCRIBE', { 
          room: 'ENGINE_THREADS' 
        });
        
        this.log(`🚀 Enhanced ${this.botName} registered with outputs: ${this.outputSelection.join(', ')}`);
      });

      this.socket.on('disconnect', () => {
        this.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        this.log(`🔌 Enhanced ${this.botName} disconnected from AlephScript server`);
      });

      this.socket.on('connect_error', (error: any) => {
        this.status({ fill: 'red', shape: 'dot', text: 'connection error' });
        this.error(`Connection error: ${error.message}`);
      });

      // Listen for AlephScript events and forward to debug output
      this.socket.onAny((event: string, ...args: any[]) => {
        if (this.outputSelection.includes('debug')) {
          this.send([null, null, null, {
            payload: {
              event,
              args,
              source: 'alephscript-server'
            },
            topic: 'alephscript-event',
            timestamp: new Date().toISOString()
          }]);
        }
      });

    } catch (error) {
      this.error(`Failed to initialize connection: ${error}`);
      this.status({ fill: 'red', shape: 'dot', text: 'error' });
    }
  };

  EnhancedBotNodeConstructor.prototype.generateSessionHash = function(this: EnhancedBotNode): string {
    return Math.random().toString(36).substring(2, 15);
  };

  RED.nodes.registerType('alephscript-enhanced-bot', EnhancedBotNodeConstructor);
};

export = EnhancedBotNodeInitializer;
