import { Node, NodeAPI, NodeDef, NodeMessage } from "node-red";

interface AlephScriptConfigNode extends Node {
    getSocket(): any;
    addConnectionCallback(callback: (connected: boolean) => void): void;
    removeConnectionCallback(callback: (connected: boolean) => void): void;
}

interface BotRegistryWidgetDef extends NodeDef {
    config: string; // AlephScript config node ID
    group: string;  // Dashboard 2.0 group
    width: number;
    height: number;
    format: string; // HTML template
    maxBots: number;
}

interface BotRegistryWidget extends Node {
    config: AlephScriptConfigNode;
    maxBots: number;
    registeredBots: Map<string, BotInfo>;
    connectionCallback?: (connected: boolean) => void;
}

interface BotInfo {
    id: string;
    name: string;
    room: string;
    status: 'registered' | 'connected' | 'disconnected';
    registeredAt: number;
}

interface BotRegistrationMessage {
    command: 'register' | 'unregister' | 'status';
    botName?: string;
    room?: string;
    payload?: any;
}

export = function(RED: NodeAPI) {
    function BotRegistryWidget(this: BotRegistryWidget, config: BotRegistryWidgetDef) {
        RED.nodes.createNode(this, config);
        
        this.maxBots = config.maxBots || 2;
        this.registeredBots = new Map();
        
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
        
        // Handle input messages from dashboard
        this.on('input', (msg: NodeMessage) => {
            handleInputMessage.call(this, msg);
        });
        
        // Handle node shutdown
        this.on('close', () => {
            cleanup.call(this);
        });
        
        // Send initial status
        sendBotListUpdate.call(this);
    }
    
    function handleInputMessage(this: BotRegistryWidget, msg: NodeMessage) {
        try {
            const input = msg.payload as BotRegistrationMessage;
            
            switch (input.command) {
                case 'register':
                    registerBot.call(this, input.botName!, input.room);
                    break;
                case 'unregister':
                    unregisterBot.call(this, input.botName!);
                    break;
                case 'status':
                    sendBotListUpdate.call(this);
                    break;
                default:
                    this.warn("Unknown command: " + input.command);
            }
        } catch (error) {
            this.error("Error handling input: " + (error as Error).message);
        }
    }
    
    function registerBot(this: BotRegistryWidget, botName: string, room?: string) {
        // Check max bots limit
        if (this.registeredBots.size >= this.maxBots) {
            this.warn(`Cannot register bot '${botName}': maximum ${this.maxBots} bots allowed`);
            this.send({
                topic: "registration_error",
                payload: { 
                    error: `Maximum ${this.maxBots} bots allowed`,
                    botName,
                    currentCount: this.registeredBots.size
                }
            });
            return;
        }
        
        // Check if bot already registered
        if (this.registeredBots.has(botName)) {
            this.warn(`Bot '${botName}' is already registered`);
            this.send({
                topic: "registration_error",
                payload: { 
                    error: "Bot already registered",
                    botName
                }
            });
            return;
        }
        
        // Auto-assign room if not provided
        const assignedRoom = room || `room_${botName.toLowerCase()}`;
        
        const botInfo: BotInfo = {
            id: this.id + "_" + botName,
            name: botName,
            room: assignedRoom,
            status: 'registered',
            registeredAt: Date.now()
        };
        
        this.registeredBots.set(botName, botInfo);
        
        // Register bot with AlephScript server
        const socket = this.config.getSocket();
        if (socket && socket.connected) {
            socket.emit('CLIENT_REGISTER', {
                usuario: botName,
                room: assignedRoom
            });
            
            botInfo.status = 'connected';
        }
        
        this.log(`Registered bot '${botName}' in room '${assignedRoom}'`);
        sendBotListUpdate.call(this);
        
        this.send({
            topic: "bot_registered",
            payload: { botInfo }
        });
    }
    
    function unregisterBot(this: BotRegistryWidget, botName: string) {
        const botInfo = this.registeredBots.get(botName);
        if (!botInfo) {
            this.warn(`Bot '${botName}' not found`);
            return;
        }
        
        // Unregister from AlephScript server
        const socket = this.config.getSocket();
        if (socket && socket.connected) {
            socket.emit('CLIENT_DISCONNECT', {
                usuario: botName,
                room: botInfo.room
            });
        }
        
        this.registeredBots.delete(botName);
        this.log(`Unregistered bot '${botName}'`);
        sendBotListUpdate.call(this);
        
        this.send({
            topic: "bot_unregistered",
            payload: { botName, botInfo }
        });
    }
    
    function sendBotListUpdate(this: BotRegistryWidget) {
        const botList = Array.from(this.registeredBots.values());
        this.send({
            topic: "bot_list",
            payload: {
                bots: botList,
                count: botList.length,
                maxBots: this.maxBots,
                canRegisterMore: botList.length < this.maxBots
            }
        });
    }
    
    function cleanup(this: BotRegistryWidget) {
        if (this.config && this.connectionCallback) {
            this.config.removeConnectionCallback(this.connectionCallback);
            
            // Remove all bots
            this.registeredBots.forEach((botInfo, botName) => {
                unregisterBot.call(this, botName);
            });
        }
    }
    
    RED.nodes.registerType("alephscript-bot-registry", BotRegistryWidget);
};
