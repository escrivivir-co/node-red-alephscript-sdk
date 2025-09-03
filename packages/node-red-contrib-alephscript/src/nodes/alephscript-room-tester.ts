import { Node, NodeAPI, NodeDef, NodeMessage } from "node-red";

interface AlephScriptConfigNode extends Node {
    getSocket(): any;
    addConnectionCallback(callback: (connected: boolean) => void): void;
    removeConnectionCallback(callback: (connected: boolean) => void): void;
}

interface RoomTesterWidgetDef extends NodeDef {
    config: string; // AlephScript config node ID
    group: string;  // Dashboard 2.0 group
    width: number;
    height: number;
    format: string; // HTML template
}

interface RoomTesterWidget extends Node {
    config: AlephScriptConfigNode;
    connectionCallback?: (connected: boolean) => void;
    currentBot?: string;
    currentRoom?: string;
    targetBot?: string;
    targetRoom?: string;
    isInTargetRoom: boolean;
}

interface RoomTestMessage {
    command: 'join_room' | 'leave_room' | 'get_status' | 'send_test_message';
    currentBot?: string;
    targetBot?: string;
    targetRoom?: string;
    testMessage?: string;
}

export = function(RED: NodeAPI) {
    function RoomTesterWidget(this: RoomTesterWidget, config: RoomTesterWidgetDef) {
        RED.nodes.createNode(this, config);
        
        this.isInTargetRoom = false;
        
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
                text: connected ? "connected" : "disconnected"
            });
            
            // Send connection status to dashboard
            this.send({
                topic: "connection",
                payload: { connected, timestamp: Date.now() }
            });
        };
        
        this.config.addConnectionCallback(this.connectionCallback);
        
        // Listen for room events from socket
        const socket = this.config.getSocket();
        if (socket) {
            socket.on('room_joined', (data: any) => {
                this.send({
                    topic: "room_joined",
                    payload: data
                });
            });
            
            socket.on('room_left', (data: any) => {
                this.send({
                    topic: "room_left", 
                    payload: data
                });
            });
            
            socket.on('message', (data: any) => {
                this.send({
                    topic: "message_received",
                    payload: data
                });
            });
        }
        
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
    
    function sendStatus(this: RoomTesterWidget) {
        this.send({
            topic: "status",
            payload: {
                isInTargetRoom: this.isInTargetRoom,
                currentBot: this.currentBot,
                targetRoom: this.targetRoom,
                connected: this.config.getSocket()?.connected || false,
                timestamp: Date.now()
            }
        });
    }
    
    function handleInputMessage(this: RoomTesterWidget, msg: NodeMessage) {
        try {
            const input = msg.payload as RoomTestMessage;
            
            switch (input.command) {
                case 'join_room':
                    joinTargetRoom.call(this, input.currentBot!, input.targetRoom!);
                    break;
                case 'leave_room':
                    leaveTargetRoom.call(this);
                    break;
                case 'send_test_message':
                    sendTestMessage.call(this, input.testMessage!);
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
    
    function joinTargetRoom(this: RoomTesterWidget, currentBot: string, targetRoom: string) {
        const socket = this.config.getSocket();
        if (!socket || !socket.connected) {
            this.warn("Not connected to AlephScript server");
            this.send({
                topic: "join_error",
                payload: { error: "Not connected to server" }
            });
            return;
        }
        
        // Store current state
        this.currentBot = currentBot;
        this.targetRoom = targetRoom;
        
        // Join the target room
        socket.emit('join_room', {
            usuario: currentBot,
            room: targetRoom
        });
        
        this.isInTargetRoom = true;
        this.log(`Bot '${currentBot}' attempting to join room '${targetRoom}'`);
        
        this.send({
            topic: "join_attempt",
            payload: { 
                currentBot,
                targetRoom,
                timestamp: Date.now()
            }
        });
        
        sendStatus.call(this);
    }
    
    function leaveTargetRoom(this: RoomTesterWidget) {
        if (!this.isInTargetRoom || !this.currentBot || !this.targetRoom) {
            this.warn("Not currently in a target room");
            return;
        }
        
        const socket = this.config.getSocket();
        if (!socket || !socket.connected) {
            this.warn("Not connected to AlephScript server");
            return;
        }
        
        // Leave the target room
        socket.emit('leave_room', {
            usuario: this.currentBot,
            room: this.targetRoom
        });
        
        this.log(`Bot '${this.currentBot}' leaving room '${this.targetRoom}'`);
        
        this.send({
            topic: "leave_attempt",
            payload: {
                currentBot: this.currentBot,
                targetRoom: this.targetRoom,
                timestamp: Date.now()
            }
        });
        
        // Clear state
        this.isInTargetRoom = false;
        this.currentBot = undefined;
        this.targetRoom = undefined;
        
        sendStatus.call(this);
    }
    
    function sendTestMessage(this: RoomTesterWidget, testMessage: string) {
        if (!this.isInTargetRoom || !this.targetRoom) {
            this.warn("Not in target room - cannot send test message");
            this.send({
                topic: "send_error",
                payload: { error: "Not in target room" }
            });
            return;
        }
        
        const socket = this.config.getSocket();
        if (!socket || !socket.connected) {
            this.warn("Not connected to AlephScript server");
            return;
        }
        
        // Send test message to the room
        const messagePayload = {
            room: this.targetRoom,
            from: this.currentBot,
            message: testMessage,
            timestamp: Date.now(),
            type: 'test_message'
        };
        
        socket.emit('send_message', messagePayload);
        
        this.log(`Sent test message to room '${this.targetRoom}': ${testMessage}`);
        
        this.send({
            topic: "message_sent",
            payload: messagePayload
        });
    }
    
    function cleanup(this: RoomTesterWidget) {
        if (this.config && this.connectionCallback) {
            this.config.removeConnectionCallback(this.connectionCallback);
        }
        
        // Leave target room if currently in one
        if (this.isInTargetRoom) {
            leaveTargetRoom.call(this);
        }
    }
    
    RED.nodes.registerType("alephscript-room-tester", RoomTesterWidget);
};
