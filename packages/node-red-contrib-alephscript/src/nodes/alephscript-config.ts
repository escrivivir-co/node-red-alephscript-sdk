import { Node, NodeAPI, NodeDef } from "node-red";
import { io, Socket } from "socket.io-client";

interface AlephScriptConfigNodeDef extends NodeDef {
    serverUrl: string;
    namespace: string;
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    timeout: number;
}

interface AlephScriptConfigNode extends Node {
    serverUrl: string;
    namespace: string;
    reconnection: boolean;
    reconnectionAttempts: number;
    reconnectionDelay: number;
    timeout: number;
    socket?: Socket;
    connectionCallbacks: Set<(connected: boolean) => void>;
    
    // Public methods for other nodes to use
    getSocket(): Socket | undefined;
    addConnectionCallback(callback: (connected: boolean) => void): void;
    removeConnectionCallback(callback: (connected: boolean) => void): void;
}

export = function(RED: NodeAPI) {
    function AlephScriptConfigNode(this: AlephScriptConfigNode, config: AlephScriptConfigNodeDef) {
        RED.nodes.createNode(this, config);
        
        this.serverUrl = config.serverUrl || "http://localhost:3001";
        this.namespace = config.namespace || "/";
        this.reconnection = config.reconnection !== false;
        this.reconnectionAttempts = config.reconnectionAttempts || 5;
        this.reconnectionDelay = config.reconnectionDelay || 1000;
        this.timeout = config.timeout || 5000;
        this.connectionCallbacks = new Set();
        
        // Initialize socket connection
        initializeSocket.call(this);
        
        // Handle node shutdown
        this.on('close', () => {
            cleanup.call(this);
        });
    }
    
    function initializeSocket(this: AlephScriptConfigNode) {
        try {
            const fullUrl = this.serverUrl + this.namespace;
            
            this.socket = io(fullUrl, {
                transports: ['websocket', 'polling'],
                timeout: this.timeout,
                reconnection: this.reconnection,
                reconnectionAttempts: this.reconnectionAttempts,
                reconnectionDelay: this.reconnectionDelay
            });
            
            this.socket.on('connect', () => {
                this.debug("Connected to AlephScript server: " + fullUrl);
                notifyConnectionCallbacks.call(this, true);
            });
            
            this.socket.on('disconnect', (reason) => {
                this.debug("Disconnected from AlephScript server: " + reason);
                notifyConnectionCallbacks.call(this, false);
            });
            
            this.socket.on('connect_error', (error) => {
                this.error("Connection error: " + error.message);
                notifyConnectionCallbacks.call(this, false);
            });
            
        } catch (error) {
            this.error("Failed to initialize socket: " + (error as Error).message);
        }
    }
    
    function notifyConnectionCallbacks(this: AlephScriptConfigNode, connected: boolean) {
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(connected);
            } catch (error) {
                this.error("Error in connection callback: " + (error as Error).message);
            }
        });
    }
    
    AlephScriptConfigNode.prototype.getSocket = function(this: AlephScriptConfigNode): Socket | undefined {
        return this.socket;
    };
    
    AlephScriptConfigNode.prototype.addConnectionCallback = function(this: AlephScriptConfigNode, callback: (connected: boolean) => void) {
        this.connectionCallbacks.add(callback);
    };
    
    AlephScriptConfigNode.prototype.removeConnectionCallback = function(this: AlephScriptConfigNode, callback: (connected: boolean) => void) {
        this.connectionCallbacks.delete(callback);
    };
    
    function cleanup(this: AlephScriptConfigNode) {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = undefined;
        }
        this.connectionCallbacks.clear();
    }
    
    RED.nodes.registerType("alephscript-config", AlephScriptConfigNode);
};
