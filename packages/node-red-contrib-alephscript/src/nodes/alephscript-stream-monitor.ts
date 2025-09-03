import { Node, NodeAPI, NodeDef, NodeMessage } from "node-red";

interface AlephScriptConfigNode extends Node {
    getSocket(): any;
    addConnectionCallback(callback: (connected: boolean) => void): void;
    removeConnectionCallback(callback: (connected: boolean) => void): void;
}

interface StreamMonitorWidgetDef extends NodeDef {
    config: string; // AlephScript config node ID
    group: string;  // Dashboard 2.0 group
    width: number;
    height: number;
    format: string; // HTML template
    maxMessages: number;
    autoScroll: boolean;
    showTimestamps: boolean;
}

interface StreamMonitorWidget extends Node {
    config: AlephScriptConfigNode;
    maxMessages: number;
    autoScroll: boolean;
    showTimestamps: boolean;
    messageHistory: StreamMessage[];
    connectionCallback?: (connected: boolean) => void;
    isMonitoring: boolean;
    monitoredRooms: Set<string>;
}

interface StreamMessage {
    id: string;
    timestamp: number;
    room: string;
    from: string;
    message: string;
    type: 'message' | 'join' | 'leave' | 'system';
    channel?: 'app' | 'sys' | 'ui';
}

interface StreamCommand {
    command: 'start_monitoring' | 'stop_monitoring' | 'clear_history' | 'get_status' | 'filter_room';
    room?: string;
    filterEnabled?: boolean;
}

export = function(RED: NodeAPI) {
    function StreamMonitorWidget(this: StreamMonitorWidget, config: StreamMonitorWidgetDef) {
        RED.nodes.createNode(this, config);
        
        this.maxMessages = config.maxMessages || 100;
        this.autoScroll = config.autoScroll !== false;
        this.showTimestamps = config.showTimestamps !== false;
        this.messageHistory = [];
        this.isMonitoring = false;
        this.monitoredRooms = new Set();
        
        // Get config node
        this.config = RED.nodes.getNode(config.config) as AlephScriptConfigNode;
        if (!this.config) {
            this.error("AlephScript config node not found");
            return;
        }
        
        // Setup connection monitoring
        this.connectionCallback = (connected: boolean) => {
            this.status({
                fill: connected ? "green" : "red",
                shape: "dot",
                text: connected ? (this.isMonitoring ? "monitoring" : "connected") : "disconnected"
            });
            
            // Send connection status to dashboard
            this.send({
                topic: "connection",
                payload: { connected, timestamp: Date.now() }
            });
            
            if (connected && this.isMonitoring) {
                setupStreamListeners.call(this);
            }
        };
        
        this.config.addConnectionCallback(this.connectionCallback);
        
        // Handle input messages from dashboard
        this.on('input', (msg: NodeMessage) => {
            handleInputMessage.call(this, msg);
        });
        
        // Handle node shutdown
        this.on('close', () => {
            cleanup.call(this);
        });
        
        // Send initial status
        sendStatus.call(this);
    }
    
    function sendStatus(this: StreamMonitorWidget) {
        this.send({
            topic: "status",
            payload: {
                isMonitoring: this.isMonitoring,
                connected: this.config.getSocket()?.connected || false,
                messageCount: this.messageHistory.length,
                monitoredRooms: Array.from(this.monitoredRooms),
                maxMessages: this.maxMessages,
                autoScroll: this.autoScroll,
                showTimestamps: this.showTimestamps,
                timestamp: Date.now()
            }
        });
    }
    
    function handleInputMessage(this: StreamMonitorWidget, msg: NodeMessage) {
        try {
            const input = msg.payload as StreamCommand;
            
            switch (input.command) {
                case 'start_monitoring':
                    startMonitoring.call(this, input.room);
                    break;
                case 'stop_monitoring':
                    stopMonitoring.call(this);
                    break;
                case 'clear_history':
                    clearHistory.call(this);
                    break;
                case 'filter_room':
                    filterByRoom.call(this, input.room, input.filterEnabled);
                    break;
                case 'get_status':
                    sendStatus.call(this);
                    break;
                default:
                    this.warn("Unknown command: " + input.command);
            }
        } catch (error) {
            this.error("Error handling input: " + (error as Error).message);
        }
    }
    
    function startMonitoring(this: StreamMonitorWidget, room?: string) {
        const socket = this.config.getSocket();
        if (!socket || !socket.connected) {
            this.warn("Not connected to AlephScript server");
            this.send({
                topic: "monitor_error",
                payload: { error: "Not connected to server" }
            });
            return;
        }
        
        this.isMonitoring = true;
        
        // Add room to monitored rooms if specified
        if (room) {
            this.monitoredRooms.add(room);
        }
        
        setupStreamListeners.call(this);
        
        this.log(`Started monitoring AlephScript message streams${room ? ` for room: ${room}` : ''}`);
        
        // Add system message
        addMessage.call(this, {
            id: generateMessageId(),
            timestamp: Date.now(),
            room: room || 'all',
            from: 'system',
            message: `Stream monitoring started${room ? ` for room: ${room}` : ''}`,
            type: 'system'
        });
        
        this.status({ fill: "green", shape: "dot", text: "monitoring" });
        sendStatus.call(this);
    }
    
    function stopMonitoring(this: StreamMonitorWidget) {
        this.isMonitoring = false;
        this.monitoredRooms.clear();
        
        const socket = this.config.getSocket();
        if (socket) {
            // Remove listeners
            socket.off('message');
            socket.off('room_joined');
            socket.off('room_left');
            socket.off('app_message');
            socket.off('sys_message');
            socket.off('ui_message');
        }
        
        this.log("Stopped monitoring AlephScript message streams");
        
        // Add system message
        addMessage.call(this, {
            id: generateMessageId(),
            timestamp: Date.now(),
            room: 'all',
            from: 'system',
            message: 'Stream monitoring stopped',
            type: 'system'
        });
        
        this.status({ fill: "yellow", shape: "ring", text: "stopped" });
        sendStatus.call(this);
    }
    
    function setupStreamListeners(this: StreamMonitorWidget) {
        const socket = this.config.getSocket();
        if (!socket) return;
        
        // Listen for general messages
        socket.on('message', (data: any) => {
            if (shouldProcessMessage.call(this, data.room)) {
                addMessage.call(this, {
                    id: generateMessageId(),
                    timestamp: Date.now(),
                    room: data.room || 'unknown',
                    from: data.from || data.usuario || 'unknown',
                    message: data.message || data.content || JSON.stringify(data),
                    type: 'message'
                });
            }
        });
        
        // Listen for room events
        socket.on('room_joined', (data: any) => {
            if (shouldProcessMessage.call(this, data.room)) {
                addMessage.call(this, {
                    id: generateMessageId(),
                    timestamp: Date.now(),
                    room: data.room || 'unknown',
                    from: data.usuario || 'unknown',
                    message: `Joined room: ${data.room}`,
                    type: 'join'
                });
            }
        });
        
        socket.on('room_left', (data: any) => {
            if (shouldProcessMessage.call(this, data.room)) {
                addMessage.call(this, {
                    id: generateMessageId(),
                    timestamp: Date.now(),
                    room: data.room || 'unknown',
                    from: data.usuario || 'unknown',
                    message: `Left room: ${data.room}`,
                    type: 'leave'
                });
            }
        });
        
        // Listen for channel-specific messages
        socket.on('app_message', (data: any) => {
            if (shouldProcessMessage.call(this, data.room)) {
                addMessage.call(this, {
                    id: generateMessageId(),
                    timestamp: Date.now(),
                    room: data.room || 'unknown',
                    from: data.source || 'app-channel',
                    message: data.payload?.action || JSON.stringify(data.payload),
                    type: 'message',
                    channel: 'app'
                });
            }
        });
        
        socket.on('sys_message', (data: any) => {
            if (shouldProcessMessage.call(this, data.room)) {
                addMessage.call(this, {
                    id: generateMessageId(),
                    timestamp: Date.now(),
                    room: data.room || 'unknown',
                    from: data.source || 'sys-channel',
                    message: `${data.payload?.level || 'INFO'}: ${data.payload?.message || JSON.stringify(data.payload)}`,
                    type: 'message',
                    channel: 'sys'
                });
            }
        });
        
        socket.on('ui_message', (data: any) => {
            if (shouldProcessMessage.call(this, data.room)) {
                addMessage.call(this, {
                    id: generateMessageId(),
                    timestamp: Date.now(),
                    room: data.room || 'unknown',
                    from: data.source || 'ui-channel',
                    message: `${data.payload?.displayType || 'notification'}: ${data.payload?.message || JSON.stringify(data.payload)}`,
                    type: 'message',
                    channel: 'ui'
                });
            }
        });
    }
    
    function shouldProcessMessage(this: StreamMonitorWidget, room: string): boolean {
        if (!this.isMonitoring) return false;
        if (this.monitoredRooms.size === 0) return true; // Monitor all rooms
        return this.monitoredRooms.has(room);
    }
    
    function addMessage(this: StreamMonitorWidget, message: StreamMessage) {
        this.messageHistory.push(message);
        
        // Limit message history
        if (this.messageHistory.length > this.maxMessages) {
            this.messageHistory = this.messageHistory.slice(-this.maxMessages);
        }
        
        // Send to dashboard
        this.send({
            topic: "new_message",
            payload: message
        });
        
        // Send updated history
        this.send({
            topic: "message_history",
            payload: {
                messages: this.messageHistory.slice(-20), // Send last 20 for UI update
                totalCount: this.messageHistory.length
            }
        });
    }
    
    function clearHistory(this: StreamMonitorWidget) {
        this.messageHistory = [];
        this.log("Cleared message history");
        
        this.send({
            topic: "history_cleared",
            payload: { timestamp: Date.now() }
        });
        
        sendStatus.call(this);
    }
    
    function filterByRoom(this: StreamMonitorWidget, room?: string, enabled?: boolean) {
        if (enabled && room) {
            this.monitoredRooms.clear();
            this.monitoredRooms.add(room);
            this.log(`Filtering messages for room: ${room}`);
        } else {
            this.monitoredRooms.clear();
            this.log("Removed room filter - monitoring all rooms");
        }
        
        sendStatus.call(this);
    }
    
    function generateMessageId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    function cleanup(this: StreamMonitorWidget) {
        if (this.config && this.connectionCallback) {
            this.config.removeConnectionCallback(this.connectionCallback);
        }
        
        if (this.isMonitoring) {
            stopMonitoring.call(this);
        }
    }
    
    RED.nodes.registerType("alephscript-stream-monitor", StreamMonitorWidget);
};
