import { Node, NodeAPI, NodeDef } from "node-red";
import { io, Socket } from "socket.io-client";
import { Subject, Observable, merge } from "rxjs";
import { takeUntil, tap, filter, map, share } from "rxjs/operators";

interface OrchestratorNodeConfig extends NodeDef {
    name: string;
    serverUrl: string;
    
    // AlephScript Client Config
    clientName: string;
    roomName: string;
    
    // Channel Configuration
    enableAppChannel: boolean;
    enableSysChannel: boolean;
    enableUIChannel: boolean;
    
    // Cross-channel routing
    enableCrossChannelRouting: boolean;
    
    // Performance
    messageTimeout: number;
    syncInterval: number;
    
    // Monitoring
    enableStatistics: boolean;
    enableLogging: boolean;
}

interface ChannelMessage {
    id: string;
    type: string;
    source: string;
    timestamp: number;
    channel: 'app' | 'sys' | 'ui';
    payload: any;
    metadata?: Record<string, any>;
}

interface OrchestratorNode extends Node {
    socket?: Socket;
    config: OrchestratorNodeConfig;
    
    // RxJS Subjects for each channel (like orchestrator.ts)
    appChannel$: Subject<ChannelMessage>;
    sysChannel$: Subject<ChannelMessage>;
    uiChannel$: Subject<ChannelMessage>;
    
    // Component registry
    registeredComponents: Map<string, any>;
    
    // Statistics
    totalMessages: number;
    totalErrors: number;
    startTime: number;
    
    // Lifecycle
    destroy$: Subject<void>;
    isRunning: boolean;
}

export = function(RED: NodeAPI) {
    function OrchestratorNode(this: OrchestratorNode, config: OrchestratorNodeConfig) {
        RED.nodes.createNode(this, config);
        
        this.config = config;
        this.registeredComponents = new Map();
        this.totalMessages = 0;
        this.totalErrors = 0;
        this.startTime = Date.now();
        this.isRunning = false;
        
        // Initialize RxJS subjects (following orchestrator.ts pattern)
        this.appChannel$ = new Subject<ChannelMessage>();
        this.sysChannel$ = new Subject<ChannelMessage>();
        this.uiChannel$ = new Subject<ChannelMessage>();
        this.destroy$ = new Subject<void>();
        
        // Set status to starting
        this.status({ fill: "yellow", shape: "ring", text: "starting" });
        
        // Initialize orchestrator
        initializeOrchestrator.call(this);
        
        // Handle input messages from channel nodes
        this.on('input', (msg: any) => {
            handleChannelInput.call(this, msg);
        });
        
        // Handle node shutdown
        this.on('close', () => {
            shutdown.call(this);
        });
    }
    
    function initializeOrchestrator(this: OrchestratorNode) {
        try {
            // Connect to AlephScript server (following orchestrator.ts initAlephClient)
            const serverUrl = this.config.serverUrl || process.env.ALEPHSCRIPT_SERVER_URL || "http://localhost:3001";
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: this.config.messageTimeout || 5000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            
            this.socket.on('connect', () => {
                this.status({ fill: "green", shape: "dot", text: "connected" });
                this.log("Orchestrator connected to AlephScript server");
                
                // Register as AlephScript client (following orchestrator.ts pattern)
                registerAsAlephScriptClient.call(this);
                
                this.isRunning = true;
                this.startTime = Date.now();
            });
            
            this.socket.on('disconnect', () => {
                this.status({ fill: "red", shape: "ring", text: "disconnected" });
                this.log("Orchestrator disconnected from AlephScript server");
                this.isRunning = false;
            });
            
            this.socket.on('connect_error', (error: any) => {
                this.status({ fill: "red", shape: "dot", text: "error" });
                this.error(`Orchestrator connection error: ${error.message}`);
                this.totalErrors++;
            });
            
            // Set up channel message listeners
            setupChannelListeners.call(this);
            
            // Set up cross-channel routing if enabled
            if (this.config.enableCrossChannelRouting) {
                setupCrossChannelRouting.call(this);
            }
            
            // Set up statistics if enabled
            if (this.config.enableStatistics) {
                setupStatistics.call(this);
            }
            
        } catch (error) {
            this.status({ fill: "red", shape: "dot", text: "error" });
            this.error(`Failed to initialize orchestrator: ${error}`);
            this.totalErrors++;
        }
    }
    
    function registerAsAlephScriptClient(this: OrchestratorNode) {
        // Following orchestrator.ts initAlephClient pattern
        const clientName = this.config.clientName || "orchestrator-node";
        const roomName = this.config.roomName || `${clientName}_ROOM`;
        
        // CLIENT_REGISTER (following orchestrator.ts)
        const registerPayload = {
            usuario: clientName,
            sesion: generateSessionHash()
        };
        
        this.socket?.emit("CLIENT_REGISTER", registerPayload);
        this.socket?.emit("CLIENT_SUSCRIBE", { room: roomName });
        
        // MAKE_MASTER (establishing room ownership)
        this.socket?.emit("MAKE_MASTER", { features: [] }, roomName);
        
        this.log(`Orchestrator registered as ${clientName} in room ${roomName}`);
    }
    
    function setupChannelListeners(this: OrchestratorNode) {
        // Listen for messages from each channel (app, sys, ui)
        if (this.config.enableAppChannel) {
            this.socket?.on('app_message', (message: any) => {
                handleChannelMessage.call(this, { ...message, channel: 'app' });
            });
        }
        
        if (this.config.enableSysChannel) {
            this.socket?.on('sys_message', (message: any) => {
                handleChannelMessage.call(this, { ...message, channel: 'sys' });
            });
        }
        
        if (this.config.enableUIChannel) {
            this.socket?.on('ui_message', (message: any) => {
                handleChannelMessage.call(this, { ...message, channel: 'ui' });
            });
        }
        
        // Listen for component registration
        this.socket?.on('component_register', (componentData: any) => {
            registerComponent.call(this, componentData);
        });
    }
    
    function handleChannelMessage(this: OrchestratorNode, message: ChannelMessage) {
        try {
            this.totalMessages++;
            
            // Route to appropriate channel subject
            switch (message.channel) {
                case 'app':
                    this.appChannel$.next(message);
                    break;
                case 'sys':
                    this.sysChannel$.next(message);
                    break;
                case 'ui':
                    this.uiChannel$.next(message);
                    break;
            }
            
            // Send to appropriate output
            const outputIndex = getChannelOutputIndex(message.channel);
            if (outputIndex !== -1) {
                const msg = {
                    payload: message,
                    topic: `orchestrator/${message.channel}/${message.type}`,
                    timestamp: message.timestamp,
                    source: message.source,
                    channel: message.channel,
                    orchestratorStats: {
                        totalMessages: this.totalMessages,
                        uptime: Date.now() - this.startTime,
                        registeredComponents: this.registeredComponents.size
                    }
                };
                
                const outputs: Array<any> = [null, null, null, null];
                outputs[outputIndex] = msg;
                this.send(outputs);
            }
            
        } catch (error) {
            this.error(`Error handling channel message: ${error}`);
            this.totalErrors++;
        }
    }
    
    function handleChannelInput(this: OrchestratorNode, msg: any) {
        try {
            // Handle messages from Node-RED channel nodes
            if (msg.payload && msg.channel && this.socket) {
                const channelMessage: ChannelMessage = {
                    id: `orchestrator_${Date.now()}`,
                    type: msg.payload.type || 'message',
                    source: 'orchestrator-node',
                    timestamp: Date.now(),
                    channel: msg.channel,
                    payload: msg.payload,
                    metadata: msg.metadata || {}
                };
                
                // Emit to appropriate channel
                this.socket.emit(`${msg.channel}_message`, channelMessage);
                
                if (this.config.enableLogging) {
                    this.log(`Sent ${msg.channel} message: ${channelMessage.type}`);
                }
            }
        } catch (error) {
            this.error(`Error handling input message: ${error}`);
            this.totalErrors++;
        }
    }
    
    function setupCrossChannelRouting(this: OrchestratorNode) {
        // Merge all channels for cross-channel analysis (following orchestrator.ts)
        const allChannels$ = merge(
            this.appChannel$.pipe(map((msg: ChannelMessage) => ({ ...msg, sourceChannel: 'app' as const }))),
            this.sysChannel$.pipe(map((msg: ChannelMessage) => ({ ...msg, sourceChannel: 'sys' as const }))),
            this.uiChannel$.pipe(map((msg: ChannelMessage) => ({ ...msg, sourceChannel: 'ui' as const })))
        ).pipe(
            takeUntil(this.destroy$),
            share()
        );

        // Subscribe to merged stream for cross-channel correlation
        allChannels$.subscribe((message: ChannelMessage & { sourceChannel: string }) => {
            // Send aggregated message to output 4
            const aggregatedMsg = {
                payload: message,
                topic: `orchestrator/cross-channel`,
                timestamp: message.timestamp,
                aggregationType: 'cross-channel',
                correlatedChannels: [message.sourceChannel],
                orchestratorStats: {
                    totalMessages: this.totalMessages,
                    uptime: Date.now() - this.startTime
                }
            };
            
            const outputs: Array<any> = [null, null, null, aggregatedMsg];
            this.send(outputs);
        });
    }
    
    function setupStatistics(this: OrchestratorNode) {
        // Update status periodically with statistics
        const statsInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(statsInterval);
                return;
            }
            
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const statusText = `${this.totalMessages} msgs | ${this.registeredComponents.size} components | ${uptime}s`;
            
            this.status({
                fill: this.totalErrors > 0 ? "yellow" : "green",
                shape: "dot",
                text: statusText
            });
        }, this.config.syncInterval || 1000);
    }
    
    function registerComponent(this: OrchestratorNode, componentData: any) {
        const componentId = componentData.id || componentData.name;
        this.registeredComponents.set(componentId, componentData);
        
        this.log(`Registered component: ${componentId}`);
        
        // Send component registration notification to sys channel
        if (this.config.enableSysChannel && this.socket) {
            this.socket.emit('sys_message', {
                id: `component_${Date.now()}`,
                type: 'info',
                source: 'orchestrator-node',
                timestamp: Date.now(),
                payload: {
                    message: `Component registered: ${componentId}`,
                    level: 'info'
                }
            });
        }
    }
    
    function getChannelOutputIndex(channel: string): number {
        switch (channel) {
            case 'app': return 0;
            case 'sys': return 1;
            case 'ui': return 2;
            default: return -1;
        }
    }
    
    function generateSessionHash(): string {
        return Math.random().toString(36).substring(2, 15);
    }
    
    function shutdown(this: OrchestratorNode) {
        this.isRunning = false;
        
        // Complete all subjects
        this.destroy$.next();
        this.destroy$.complete();
        this.appChannel$.complete();
        this.sysChannel$.complete();
        this.uiChannel$.complete();
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = undefined;
        }
        
        // Clear component registry
        this.registeredComponents.clear();
        
        this.status({});
        this.log("Orchestrator shutdown complete");
    }
    
    // Register the node
    RED.nodes.registerType("orchestrator-node", OrchestratorNode);
};
