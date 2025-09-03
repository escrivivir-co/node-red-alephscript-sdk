import { Node, NodeAPI, NodeDef } from "node-red";
import { io, Socket } from "socket.io-client";

interface UIChannelNodeConfig extends NodeDef {
    name: string;
    socketConnection: string;
    
    // Message type filters
    messageTypes: string[];
    
    // Component filters
    components: string[];
    
    // Display type filters
    displayTypes: string[];
    
    // Output routing
    outputNotifications: boolean;
    outputRenderRequests: boolean;
    outputUserInputs: boolean;
}

interface UIChannelMessage {
    id: string;
    type: "user_input" | "display_update" | "notification" | "ui_event" | "phase_change" | "render_request";
    source: string;
    timestamp: number;
    payload: {
        input?: string;
        command?: string;
        args?: string[];
        displayType?: "info" | "success" | "warning" | "error";
        title?: string;
        message?: string;
        component?: string;
        phase?: string;
        uiState?: any;
        renderData?: any;
    };
    metadata?: Record<string, any>;
}

interface UIChannelNode extends Node {
    socket?: Socket;
    config: UIChannelNodeConfig;
    activeComponents: Set<string>;
    currentPhase: string;
}

export = function(RED: NodeAPI) {
    function UIChannelNode(this: UIChannelNode, config: UIChannelNodeConfig) {
        RED.nodes.createNode(this, config);
        
        this.config = config;
        this.activeComponents = new Set();
        this.currentPhase = "idle";
        
        // Set status to connecting
        this.status({ fill: "yellow", shape: "ring", text: "connecting" });
        
        // Initialize socket connection
        initializeSocket.call(this);
        
        // Handle input messages (for sending UI updates)
        this.on('input', (msg: any) => {
            handleInputMessage.call(this, msg);
        });
        
        // Handle node shutdown
        this.on('close', () => {
            cleanup.call(this);
        });
    }
    
    function initializeSocket(this: UIChannelNode) {
        try {
            // Connect to AlephScript server (same pattern as other channel nodes)
            const serverUrl = process.env.ALEPHSCRIPT_SERVER_URL || "http://localhost:3001";
            
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 5000,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000
            });
            
            this.socket.on('connect', () => {
                this.status({ fill: "green", shape: "dot", text: "connected" });
                this.log("Connected to AlephScript server");
                
                // Subscribe to ui channel
                this.socket?.emit('join_channel', { channel: 'ui' });
            });
            
            this.socket.on('disconnect', () => {
                this.status({ fill: "red", shape: "ring", text: "disconnected" });
                this.log("Disconnected from AlephScript server");
            });
            
            this.socket.on('connect_error', (error: any) => {
                this.status({ fill: "red", shape: "dot", text: "error" });
                this.error(`Connection error: ${error.message}`);
            });
            
            // Listen for ui channel messages
            this.socket.on('ui_message', (message: UIChannelMessage) => {
                handleUIMessage.call(this, message);
            });
            
        } catch (error) {
            this.status({ fill: "red", shape: "dot", text: "error" });
            this.error(`Failed to initialize socket: ${error}`);
        }
    }
    
    function handleUIMessage(this: UIChannelNode, message: UIChannelMessage) {
        try {
            // Apply filters
            if (!shouldProcessMessage.call(this, message)) {
                return;
            }
            
            // Track active components
            if (message.payload.component) {
                this.activeComponents.add(message.payload.component);
            }
            
            // Track phase changes
            if (message.type === 'phase_change' && message.payload.phase) {
                this.currentPhase = message.payload.phase;
                this.status({ 
                    fill: "blue", 
                    shape: "dot", 
                    text: `Phase: ${this.currentPhase}` 
                });
            }
            
            // Route message to appropriate output
            const outputIndex = getOutputIndex.call(this, message);
            if (outputIndex !== -1) {
                const msg = {
                    payload: message,
                    topic: `ui/${message.type}`,
                    timestamp: message.timestamp,
                    source: message.source,
                    messageType: message.type,
                    component: message.payload.component,
                    displayType: message.payload.displayType,
                    phase: message.payload.phase
                };
                
                // Send to specific output
                const outputs: Array<any> = [null, null, null];
                outputs[outputIndex] = msg;
                this.send(outputs);
            }
            
        } catch (error) {
            this.error(`Error handling UI message: ${error}`);
        }
    }
    
    function handleInputMessage(this: UIChannelNode, msg: any) {
        try {
            // Handle incoming messages to send UI updates
            if (msg.payload && typeof msg.payload === 'object') {
                const uiMessage = msg.payload;
                
                // Validate and send UI message
                if (uiMessage.type && this.socket) {
                    this.socket.emit('ui_message', {
                        id: `ui_${Date.now()}`,
                        type: uiMessage.type,
                        source: 'ui-channel-node',
                        timestamp: Date.now(),
                        payload: uiMessage.payload || {},
                        metadata: uiMessage.metadata || {}
                    });
                    
                    this.log(`Sent UI message: ${uiMessage.type}`);
                }
            }
        } catch (error) {
            this.error(`Error handling input message: ${error}`);
        }
    }
    
    function shouldProcessMessage(this: UIChannelNode, message: UIChannelMessage): boolean {
        // Filter by message type
        if (this.config.messageTypes.length > 0 && 
            !this.config.messageTypes.includes(message.type)) {
            return false;
        }
        
        // Filter by component
        if (this.config.components.length > 0 && 
            message.payload.component &&
            !this.config.components.includes(message.payload.component)) {
            return false;
        }
        
        // Filter by display type
        if (this.config.displayTypes.length > 0 && 
            message.payload.displayType &&
            !this.config.displayTypes.includes(message.payload.displayType)) {
            return false;
        }
        
        return true;
    }
    
    function getOutputIndex(this: UIChannelNode, message: UIChannelMessage): number {
        // Output 0: Notifications & Display Updates
        if (this.config.outputNotifications && 
            (message.type === 'notification' || message.type === 'display_update')) {
            return 0;
        }
        
        // Output 1: Render Requests & Phase Changes
        if (this.config.outputRenderRequests && 
            (message.type === 'render_request' || message.type === 'phase_change')) {
            return 1;
        }
        
        // Output 2: User Inputs & UI Events
        if (this.config.outputUserInputs && 
            (message.type === 'user_input' || message.type === 'ui_event')) {
            return 2;
        }
        
        return -1; // No output
    }
    
    function cleanup(this: UIChannelNode) {
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = undefined;
        }
        
        // Clear state
        this.activeComponents.clear();
        this.currentPhase = "idle";
        
        this.status({});
    }
    
    // Register the node
    RED.nodes.registerType("ui-channel-node", UIChannelNode);
};
