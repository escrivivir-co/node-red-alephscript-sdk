import { Node, NodeAPI, NodeDef } from "node-red";
import { io, Socket } from "socket.io-client";

interface SysChannelNodeConfig extends NodeDef {
    name: string;
    socketConnection: string;
    
    // Message type filters
    messageTypes: string[];
    
    // Log level filters  
    logLevels: string[];
    
    // Service ID filters
    serviceIds: string[];
    
    // Thresholds
    healthCheckInterval: number;
    errorCountThreshold: number;
    memoryThreshold: number;
    
    // Output routing
    outputHealth: boolean;
    outputErrors: boolean;
    outputInfo: boolean;
}

interface SysChannelMessage {
    id: string;
    type: "health_check" | "error" | "warning" | "info" | "config_change" | "service_status";
    source: string;
    timestamp: number;
    payload: {
        level?: "debug" | "info" | "warn" | "error" | "fatal";
        message?: string;
        error?: Error;
        serviceId?: string;
        status?: "online" | "offline" | "degraded";
        health?: boolean;
        configKey?: string;
        configValue?: any;
    };
    metadata?: Record<string, any>;
}

interface SysChannelNode extends Node {
    socket?: Socket;
    config: SysChannelNodeConfig;
    errorCount: number;
    lastHealthCheck: number;
    healthCheckTimer?: NodeJS.Timeout;
}

export = function(RED: NodeAPI) {
    function SysChannelNode(this: SysChannelNode, config: SysChannelNodeConfig) {
        RED.nodes.createNode(this, config);
        
        this.config = config;
        this.errorCount = 0;
        this.lastHealthCheck = Date.now();
        
        // Set status to connecting
        this.status({ fill: "yellow", shape: "ring", text: "connecting" });
        
        // Initialize socket connection
        initializeSocket.call(this);
        
        // Start health check monitoring if enabled
        if (config.outputHealth && config.healthCheckInterval > 0) {
            startHealthCheckMonitoring.call(this);
        }
        
        // Handle node shutdown
        this.on('close', () => {
            cleanup.call(this);
        });
    }
    
    function initializeSocket(this: SysChannelNode) {
        try {
            // Connect to AlephScript server (same pattern as Bot Node)
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
                
                // Subscribe to sys channel
                this.socket?.emit('join_channel', { channel: 'sys' });
            });
            
            this.socket.on('disconnect', () => {
                this.status({ fill: "red", shape: "ring", text: "disconnected" });
                this.log("Disconnected from AlephScript server");
            });
            
            this.socket.on('connect_error', (error: any) => {
                this.status({ fill: "red", shape: "dot", text: "error" });
                this.error(`Connection error: ${error.message}`);
            });
            
            // Listen for sys channel messages
            this.socket.on('sys_message', (message: SysChannelMessage) => {
                handleSysMessage.call(this, message);
            });
            
        } catch (error) {
            this.status({ fill: "red", shape: "dot", text: "error" });
            this.error(`Failed to initialize socket: ${error}`);
        }
    }
    
    function handleSysMessage(this: SysChannelNode, message: SysChannelMessage) {
        try {
            // Apply filters
            if (!shouldProcessMessage.call(this, message)) {
                return;
            }
            
            // Update error count for monitoring
            if (message.type === 'error') {
                this.errorCount++;
                
                // Check error threshold
                if (this.errorCount >= this.config.errorCountThreshold) {
                    this.warn(`Error threshold exceeded: ${this.errorCount} errors`);
                    this.errorCount = 0; // Reset counter
                }
            }
            
            // Route message to appropriate output
            const outputIndex = getOutputIndex.call(this, message);
            if (outputIndex !== -1) {
                const msg = {
                    payload: message,
                    topic: `sys/${message.type}`,
                    timestamp: message.timestamp,
                    source: message.source,
                    messageType: message.type,
                    level: message.payload.level,
                    serviceId: message.payload.serviceId
                };
                
                // Send to specific output
                const outputs: Array<any> = [null, null, null];
                outputs[outputIndex] = msg;
                this.send(outputs);
            }
            
        } catch (error) {
            this.error(`Error handling sys message: ${error}`);
        }
    }
    
    function shouldProcessMessage(this: SysChannelNode, message: SysChannelMessage): boolean {
        // Filter by message type
        if (this.config.messageTypes.length > 0 && 
            !this.config.messageTypes.includes(message.type)) {
            return false;
        }
        
        // Filter by log level
        if (this.config.logLevels.length > 0 && 
            message.payload.level &&
            !this.config.logLevels.includes(message.payload.level)) {
            return false;
        }
        
        // Filter by service ID
        if (this.config.serviceIds.length > 0 && 
            message.payload.serviceId &&
            !this.config.serviceIds.includes(message.payload.serviceId)) {
            return false;
        }
        
        return true;
    }
    
    function getOutputIndex(this: SysChannelNode, message: SysChannelMessage): number {
        // Output 0: Health & Status
        if (this.config.outputHealth && 
            (message.type === 'health_check' || message.type === 'service_status')) {
            return 0;
        }
        
        // Output 1: Alerts (errors and warnings)
        if (this.config.outputErrors && 
            (message.type === 'error' || message.type === 'warning')) {
            return 1;
        }
        
        // Output 2: Info (info and config changes)
        if (this.config.outputInfo && 
            (message.type === 'info' || message.type === 'config_change')) {
            return 2;
        }
        
        return -1; // No output
    }
    
    function startHealthCheckMonitoring(this: SysChannelNode) {
        this.healthCheckTimer = setInterval(() => {
            performSystemHealthCheck.call(this);
        }, this.config.healthCheckInterval);
    }
    
    function performSystemHealthCheck(this: SysChannelNode) {
        try {
            // Check memory usage
            const memUsage = process.memoryUsage();
            const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            
            const isHealthy = memUsageMB <= this.config.memoryThreshold;
            
            // Create health check message
            const healthMessage: SysChannelMessage = {
                id: `health_${Date.now()}`,
                type: 'health_check',
                source: 'sys-channel-node',
                timestamp: Date.now(),
                payload: {
                    serviceId: 'node-red-sys-monitor',
                    health: isHealthy,
                    message: `Memory usage: ${memUsageMB}MB`,
                    level: isHealthy ? 'info' : 'warn'
                },
                metadata: {
                    memoryUsage: memUsage,
                    uptime: process.uptime(),
                    errorCount: this.errorCount
                }
            };
            
            // Send health check through normal message flow
            handleSysMessage.call(this, healthMessage);
            
            // Update node status
            const statusText = `${memUsageMB}MB | ${this.errorCount} errors`;
            this.status({ 
                fill: isHealthy ? "green" : "yellow", 
                shape: "dot", 
                text: statusText 
            });
            
        } catch (error) {
            this.error(`Health check failed: ${error}`);
        }
    }
    
    function cleanup(this: SysChannelNode) {
        // Clear health check timer
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = undefined;
        }
        
        // Disconnect socket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = undefined;
        }
        
        this.status({});
    }
    
    // Register the node
    RED.nodes.registerType("sys-channel-node", SysChannelNode);
};
