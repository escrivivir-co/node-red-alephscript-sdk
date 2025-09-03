import { Node, NodeDef, NodeInitializer, NodeMessage } from 'node-red';

interface AppFormatNodeDef extends NodeDef {
  messageType: 'state_transition' | 'action_request' | 'action_result' | 'app_event' | 'agent_command';
  // Fields for state_transition
  stateId: string;
  targetState: string;
  // Fields for action_request/action_result
  actionType: string;
  actionParams: string; // JSON string
  result: string; // JSON string
  success: boolean;
  // Fields for agent_command
  agentId: string;
  command: string; // JSON string
  // Fields for app_event
  data: string; // JSON string
  // Source configuration
  sourceId: string;
}

interface AppFormatNode extends Node {
  messageType: 'state_transition' | 'action_request' | 'action_result' | 'app_event' | 'agent_command';
  stateId: string;
  targetState: string;
  actionType: string;
  actionParams: string;
  result: string;
  success: boolean;
  agentId: string;
  command: string;
  data: string;
  sourceId: string;
  parseJsonField(field: string): any;
}

interface AppMessage {
  id: string;
  timestamp: number;
  source: string;
  type: 'state_transition' | 'action_request' | 'action_result' | 'app_event' | 'agent_command';
  payload: {
    stateId?: string;
    targetState?: string;
    actionType?: string;
    actionParams?: any;
    result?: any;
    success?: boolean;
    agentId?: string;
    command?: any;
    data?: any;
  };
  metadata?: Record<string, any>;
}

const AppFormatNodeInitializer: NodeInitializer = (RED) => {
  function AppFormatNodeConstructor(this: AppFormatNode, config: AppFormatNodeDef) {
    RED.nodes.createNode(this, config);
    
    this.messageType = config.messageType || 'app_event';
    this.stateId = config.stateId || '';
    this.targetState = config.targetState || '';
    this.actionType = config.actionType || '';
    this.actionParams = config.actionParams || '{}';
    this.result = config.result || '{}';
    this.success = config.success !== false;
    this.agentId = config.agentId || '';
    this.command = config.command || '{}';
    this.data = config.data || '{}';
    this.sourceId = config.sourceId || this.id;

    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        // Generate unique message ID
        const messageId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Cast payload to any for flexible access
        const inputPayload = msg.payload as any;
        
        // Build payload based on message type
        let payload: any = {};
        
        switch (this.messageType) {
          case 'state_transition':
            payload = {
              stateId: this.stateId || inputPayload?.stateId || 'unknown',
              targetState: this.targetState || inputPayload?.targetState || 'unknown'
            };
            break;
            
          case 'action_request':
            payload = {
              actionType: this.actionType || inputPayload?.actionType || 'unknown',
              actionParams: this.parseJsonField(this.actionParams) || inputPayload?.actionParams || {}
            };
            break;
            
          case 'action_result':
            payload = {
              actionType: this.actionType || inputPayload?.actionType || 'unknown',
              result: this.parseJsonField(this.result) || inputPayload?.result || {},
              success: this.success !== undefined ? this.success : (inputPayload?.success !== undefined ? inputPayload.success : true)
            };
            break;
            
          case 'agent_command':
            payload = {
              agentId: this.agentId || inputPayload?.agentId || 'unknown',
              command: this.parseJsonField(this.command) || inputPayload?.command || {}
            };
            break;
            
          case 'app_event':
          default:
            payload = {
              data: this.parseJsonField(this.data) || inputPayload?.data || inputPayload || {}
            };
            break;
        }

        // Create formatted AppMessage
        const appMessage: AppMessage = {
          id: messageId,
          timestamp: Date.now(),
          source: this.sourceId,
          type: this.messageType,
          payload: payload,
          metadata: {
            originalTopic: msg.topic,
            formattedBy: 'app-format-node',
            nodeId: this.id,
            nodeName: this.name || 'App Format Node'
          }
        };

        // Send formatted message
        send({
          ...msg,
          payload: appMessage,
          topic: 'app-channel-formatted',
          appMessageType: this.messageType
        });
        
        // Update status
        this.status({ 
          fill: 'green', 
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
  AppFormatNodeConstructor.prototype.parseJsonField = function(this: AppFormatNode, field: string): any {
    if (!field || field.trim() === '') return null;
    try {
      return JSON.parse(field);
    } catch {
      return field; // Return as string if not valid JSON
    }
  };

  RED.nodes.registerType('alephscript-app-format', AppFormatNodeConstructor);
};

export = AppFormatNodeInitializer;
