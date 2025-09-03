import { Node, NodeDef, NodeInitializer, NodeMessage } from 'node-red';

interface SysFormatNodeDef extends NodeDef {
  messageType: 'health_check' | 'error' | 'warning' | 'info' | 'config_change' | 'service_status';
  // Common fields
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  serviceId: string;
  // Health check fields
  health: boolean;
  // Service status fields
  status: 'online' | 'offline' | 'degraded';
  // Config change fields
  configKey: string;
  configValue: string; // JSON string
  // Error fields
  errorMessage: string;
  // Source configuration
  sourceId: string;
}

interface SysFormatNode extends Node {
  messageType: 'health_check' | 'error' | 'warning' | 'info' | 'config_change' | 'service_status';
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  serviceId: string;
  health: boolean;
  serviceStatus: 'online' | 'offline' | 'degraded'; // Renamed to avoid conflict
  configKey: string;
  configValue: string;
  errorMessage: string;
  sourceId: string;
  parseJsonField(field: string): any;
}

interface SysMessage {
  id: string;
  timestamp: number;
  source: string;
  type: 'health_check' | 'error' | 'warning' | 'info' | 'config_change' | 'service_status';
  payload: {
    level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message?: string;
    error?: Error;
    serviceId?: string;
    status?: 'online' | 'offline' | 'degraded';
    health?: boolean;
    configKey?: string;
    configValue?: any;
  };
  metadata?: Record<string, any>;
}

const SysFormatNodeInitializer: NodeInitializer = (RED) => {
  function SysFormatNodeConstructor(this: SysFormatNode, config: SysFormatNodeDef) {
    RED.nodes.createNode(this, config);
    
    this.messageType = config.messageType || 'info';
    this.level = config.level || 'info';
    this.message = config.message || '';
    this.serviceId = config.serviceId || '';
    this.health = config.health !== false;
    this.serviceStatus = config.status || 'online';
    this.configKey = config.configKey || '';
    this.configValue = config.configValue || '{}';
    this.errorMessage = config.errorMessage || '';
    this.sourceId = config.sourceId || this.id;

    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        // Generate unique message ID
        const messageId = `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Cast payload to any for flexible access
        const inputPayload = msg.payload as any;
        
        // Build payload based on message type
        let payload: any = {};
        
        switch (this.messageType) {
          case 'health_check':
            payload = {
              serviceId: this.serviceId || inputPayload?.serviceId || 'unknown',
              health: this.health !== undefined ? this.health : (inputPayload?.health !== undefined ? inputPayload.health : true),
              message: this.message || inputPayload?.message || 'Health check'
            };
            break;
            
          case 'error':
            const errorMsg = this.errorMessage || inputPayload?.error?.message || inputPayload?.message || 'Unknown error';
            payload = {
              level: this.level || 'error',
              message: this.message || errorMsg,
              error: inputPayload?.error || new Error(errorMsg),
              serviceId: this.serviceId || inputPayload?.serviceId
            };
            break;
            
          case 'warning':
            payload = {
              level: this.level || 'warn',
              message: this.message || inputPayload?.message || 'Warning message',
              serviceId: this.serviceId || inputPayload?.serviceId
            };
            break;
            
          case 'info':
            payload = {
              level: this.level || 'info',
              message: this.message || inputPayload?.message || 'Info message',
              serviceId: this.serviceId || inputPayload?.serviceId
            };
            break;
            
          case 'config_change':
            payload = {
              configKey: this.configKey || inputPayload?.configKey || 'unknown',
              configValue: this.parseJsonField(this.configValue) || inputPayload?.configValue || {},
              message: this.message || inputPayload?.message || `Config changed: ${this.configKey}`,
              serviceId: this.serviceId || inputPayload?.serviceId
            };
            break;
            
          case 'service_status':
            payload = {
              serviceId: this.serviceId || inputPayload?.serviceId || 'unknown',
              status: this.serviceStatus || inputPayload?.status || 'online',
              message: this.message || inputPayload?.message || `Service status: ${this.serviceStatus}`
            };
            break;
            
          default:
            payload = {
              level: this.level || 'info',
              message: this.message || inputPayload?.message || JSON.stringify(inputPayload) || 'System message'
            };
            break;
        }

        // Create formatted SysMessage
        const sysMessage: SysMessage = {
          id: messageId,
          timestamp: Date.now(),
          source: this.sourceId,
          type: this.messageType,
          payload: payload,
          metadata: {
            originalTopic: msg.topic,
            formattedBy: 'sys-format-node',
            nodeId: this.id,
            nodeName: this.name || 'Sys Format Node'
          }
        };

        // Send formatted message
        send({
          ...msg,
          payload: sysMessage,
          topic: 'sys-channel-formatted',
          sysMessageType: this.messageType,
          level: payload.level || this.level
        });
        
        // Update status with appropriate color based on message type
        const statusFill = this.messageType === 'service_status' 
          ? (this.serviceStatus === 'online' ? 'green' : this.serviceStatus === 'degraded' ? 'yellow' : 'red')
          : this.messageType === 'health_check' ? 'green'
          : this.messageType === 'error' ? 'red'
          : this.messageType === 'warning' ? 'yellow'
          : 'blue';
        
        this.status({ 
          fill: statusFill as any,
          shape: 'dot', 
          text: `${this.messageType} formatted` 
        });
        
        done();
        
      } catch (error) {
        this.status({ 
          fill: 'red', 
          shape: 'ring', 
          text: 'format error' 
        });
        done(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  // Helper method to parse JSON fields safely
  SysFormatNodeConstructor.prototype.parseJsonField = function(this: SysFormatNode, field: string): any {
    if (!field || field.trim() === '') return null;
    try {
      return JSON.parse(field);
    } catch {
      return field; // Return as string if not valid JSON
    }
  };

  RED.nodes.registerType('alephscript-sys-format', SysFormatNodeConstructor);
};

export = SysFormatNodeInitializer;
