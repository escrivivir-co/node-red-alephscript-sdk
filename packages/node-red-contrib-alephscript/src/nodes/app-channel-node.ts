import { Node, NodeDef, NodeInitializer, NodeMessage } from 'node-red';
import { io, Socket } from 'socket.io-client';

interface AppChannelNodeDef extends NodeDef {
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
  stateFilters: string[];
  actionFilters: string[];
  componentId: string;
}

interface AppChannelNode extends Node {
  socket?: Socket;
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
  stateFilters: string[];
  actionFilters: string[];
  componentId: string;
  currentState: string;
  stateHistory: string[];
  initializeConnection(): void;
  generateSessionHash(): string;
  handleAppMessage(message: AppMessage): void;
  filterMessage(message: AppMessage): boolean;
}

interface AppMessage {
  type: 'state_transition' | 'action_request' | 'action_result';
  from: string;
  payload: {
    targetState?: string;
    actionType?: string;
    actionParams?: any;
    result?: any;
    success?: boolean;
  };
  timestamp: string;
}

const AppChannelNodeInitializer: NodeInitializer = (RED) => {
  function AppChannelNodeConstructor(this: AppChannelNode, config: AppChannelNodeDef) {
    RED.nodes.createNode(this, config);
    
    this.serverUrl = config.serverUrl || 'http://localhost:3000';
    this.namespace = config.namespace || '/runtime';
    this.autoConnect = config.autoConnect !== false;
    this.stateFilters = config.stateFilters || [];
    this.actionFilters = config.actionFilters || [];
    this.componentId = config.componentId || 'node-red-app-channel';
    this.currentState = 'initial';
    this.stateHistory = ['initial'];

    // Initialize AlephScript App Channel connection
    if (this.autoConnect) {
      this.initializeConnection();
    }

    // Handle node input - send app channel messages
    this.on('input', (msg: NodeMessage, send, done) => {
      if (this.socket && this.socket.connected) {
        try {
          let appMessage: AppMessage;
          const payload = msg.payload as any;
          
          // Handle different input types
          if (msg.topic === 'state_transition') {
            appMessage = {
              type: 'state_transition',
              from: this.componentId,
              payload: {
                targetState: payload.targetState || payload
              },
              timestamp: new Date().toISOString()
            };
          } else if (msg.topic === 'action_request') {
            appMessage = {
              type: 'action_request',
              from: this.componentId,
              payload: {
                actionType: payload.actionType,
                actionParams: payload.actionParams
              },
              timestamp: new Date().toISOString()
            };
          } else {
            // Generic app message
            appMessage = {
              type: payload.type || 'action_request',
              from: this.componentId,
              payload: payload,
              timestamp: new Date().toISOString()
            };
          }
          
          // Send to app channel
          this.socket.emit('APP_CHANNEL_MESSAGE', appMessage);
          
          // Forward message through the flow
          send(msg);
          done();
        } catch (error) {
          done(error instanceof Error ? error : new Error(String(error)));
        }
      } else {
        done(new Error('App Channel not connected to AlephScript server'));
      }
    });

    // Handle node close
    this.on('close', () => {
      if (this.socket) {
        this.socket.disconnect();
      }
    });
  }

  AppChannelNodeConstructor.prototype.initializeConnection = function(this: AppChannelNode) {
    try {
      const fullUrl = this.serverUrl + this.namespace;
      this.socket = io(fullUrl);
      
      this.socket.on('connect', () => {
        this.status({ fill: 'green', shape: 'dot', text: 'connected' });
        
        // Register as app channel client
        this.socket?.emit('CLIENT_REGISTER', { 
          usuario: this.componentId,
          sesion: this.generateSessionHash(),
          type: 'AppChannelNode',
          channel: 'app'
        });
        
        // Subscribe to app channel messages
        this.socket?.emit('CLIENT_SUSCRIBE', { 
          room: 'APP_CHANNEL' 
        });
        
        this.log(`📱 ${this.componentId} connected to App Channel`);
      });

      this.socket.on('disconnect', () => {
        this.status({ fill: 'red', shape: 'ring', text: 'disconnected' });
        this.log('📱 App Channel disconnected');
      });

      this.socket.on('connect_error', (error) => {
        this.status({ fill: 'red', shape: 'dot', text: 'connection error' });
        this.error(`App Channel connection error: ${error.message}`);
      });

      // Listen for app channel messages
      this.socket.on('APP_CHANNEL_MESSAGE', (message: AppMessage) => {
        this.handleAppMessage(message);
      });

      // Listen for room messages that might contain app channel data
      this.socket.on('ROOM_MESSAGE', (data) => {
        if (data.room === 'APP_CHANNEL' || data.event === 'APP_MESSAGE') {
          this.handleAppMessage(data.data);
        }
      });

    } catch (error) {
      this.error(`Failed to initialize App Channel connection: ${error}`);
      this.status({ fill: 'red', shape: 'dot', text: 'init error' });
    }
  };

  AppChannelNodeConstructor.prototype.generateSessionHash = function(this: AppChannelNode): string {
    return `app-${this.componentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  AppChannelNodeConstructor.prototype.handleAppMessage = function(this: AppChannelNode, message: AppMessage) {
    try {
      // Apply filters
      if (!this.filterMessage(message)) {
        return;
      }

      // Update internal state if it's a state transition
      if (message.type === 'state_transition' && message.payload.targetState) {
        const previousState = this.currentState;
        this.currentState = message.payload.targetState;
        this.stateHistory.push(message.payload.targetState);
        
        this.status({ 
          fill: 'blue', 
          shape: 'dot', 
          text: `state: ${this.currentState}` 
        });
        
        this.log(`📱 State transition: ${previousState} → ${this.currentState}`);
      }

      // Prepare Node-RED message
      const nodeRedMsg: NodeMessage = {
        payload: message.payload,
        topic: message.type,
        appChannel: {
          type: message.type,
          from: message.from,
          timestamp: message.timestamp,
          currentState: this.currentState,
          stateHistory: this.stateHistory
        }
      };

      // Send to appropriate output
      if (message.type === 'state_transition') {
        // Output 1: State transitions
        this.send([nodeRedMsg, null]);
      } else if (message.type === 'action_request' || message.type === 'action_result') {
        // Output 2: Actions
        this.send([null, nodeRedMsg]);
      } else {
        // Output 1: Default to state output
        this.send([nodeRedMsg, null]);
      }

    } catch (error) {
      this.error(`Error handling app message: ${error}`);
    }
  };

  AppChannelNodeConstructor.prototype.filterMessage = function(this: AppChannelNode, message: AppMessage): boolean {
    // Filter by state if state filters are configured
    if (this.stateFilters.length > 0 && message.type === 'state_transition') {
      const targetState = message.payload.targetState;
      if (targetState && !this.stateFilters.includes(targetState)) {
        return false;
      }
    }

    // Filter by action type if action filters are configured
    if (this.actionFilters.length > 0 && 
        (message.type === 'action_request' || message.type === 'action_result')) {
      const actionType = message.payload.actionType;
      if (actionType && !this.actionFilters.includes(actionType)) {
        return false;
      }
    }

    return true;
  };

  RED.nodes.registerType('app-channel', AppChannelNodeConstructor);
};

export default AppChannelNodeInitializer;
