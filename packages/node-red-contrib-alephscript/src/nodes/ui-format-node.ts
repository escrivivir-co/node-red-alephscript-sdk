import { Node, NodeDef, NodeInitializer, NodeMessage } from 'node-red';

interface UIFormatNodeDef extends NodeDef {
  messageType: 'user_input' | 'display_update' | 'notification' | 'ui_event' | 'phase_change' | 'render_request';
  // User input fields
  input: string;
  command: string;
  args: string; // JSON array string
  // Display update / notification fields
  displayType: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  component: string;
  // Phase change fields
  phase: string;
  uiState: string; // JSON string
  // Render request fields
  renderData: string; // JSON string
  // UI event fields
  eventData: string; // JSON string
  // Source configuration
  sourceId: string;
}

interface UIFormatNode extends Node {
  messageType: 'user_input' | 'display_update' | 'notification' | 'ui_event' | 'phase_change' | 'render_request';
  input: string;
  command: string;
  args: string;
  displayType: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  component: string;
  phase: string;
  uiState: string;
  renderData: string;
  eventData: string;
  sourceId: string;
  parseJsonField(field: string): any;
}

interface UIMessage {
  id: string;
  timestamp: number;
  source: string;
  type: 'user_input' | 'display_update' | 'notification' | 'ui_event' | 'phase_change' | 'render_request';
  payload: {
    input?: string;
    command?: string;
    args?: string[];
    displayType?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    message?: string;
    component?: string;
    phase?: string;
    uiState?: any;
    renderData?: any;
  };
  metadata?: Record<string, any>;
}

const UIFormatNodeInitializer: NodeInitializer = (RED) => {
  function UIFormatNodeConstructor(this: UIFormatNode, config: UIFormatNodeDef) {
    RED.nodes.createNode(this, config);
    
    this.messageType = config.messageType || 'notification';
    this.input = config.input || '';
    this.command = config.command || '';
    this.args = config.args || '[]';
    this.displayType = config.displayType || 'info';
    this.title = config.title || '';
    this.message = config.message || '';
    this.component = config.component || '';
    this.phase = config.phase || '';
    this.uiState = config.uiState || '{}';
    this.renderData = config.renderData || '{}';
    this.eventData = config.eventData || '{}';
    this.sourceId = config.sourceId || this.id;

    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        // Generate unique message ID
        const messageId = `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Cast payload to any for flexible access
        const inputPayload = msg.payload as any;
        
        // Build payload based on message type
        let payload: any = {};
        
        switch (this.messageType) {
          case 'user_input':
            payload = {
              input: this.input || inputPayload?.input || '',
              command: this.command || inputPayload?.command || '',
              args: this.parseJsonField(this.args) || inputPayload?.args || []
            };
            break;
            
          case 'display_update':
            payload = {
              component: this.component || inputPayload?.component || 'default',
              displayType: this.displayType || inputPayload?.displayType || 'info',
              message: this.message || inputPayload?.message || 'Display update'
            };
            break;
            
          case 'notification':
            payload = {
              title: this.title || inputPayload?.title || 'Notification',
              message: this.message || inputPayload?.message || 'Notification message',
              displayType: this.displayType || inputPayload?.displayType || 'info'
            };
            break;
            
          case 'ui_event':
            payload = {
              eventData: this.parseJsonField(this.eventData) || inputPayload?.eventData || inputPayload || {}
            };
            break;
            
          case 'phase_change':
            payload = {
              phase: this.phase || inputPayload?.phase || 'unknown',
              uiState: this.parseJsonField(this.uiState) || inputPayload?.uiState || {}
            };
            break;
            
          case 'render_request':
            payload = {
              component: this.component || inputPayload?.component || 'default',
              renderData: this.parseJsonField(this.renderData) || inputPayload?.renderData || {}
            };
            break;
            
          default:
            payload = {
              message: this.message || inputPayload?.message || JSON.stringify(inputPayload) || 'UI message'
            };
            break;
        }

        // Create formatted UIMessage
        const uiMessage: UIMessage = {
          id: messageId,
          timestamp: Date.now(),
          source: this.sourceId,
          type: this.messageType,
          payload: payload,
          metadata: {
            originalTopic: msg.topic,
            formattedBy: 'ui-format-node',
            nodeId: this.id,
            nodeName: this.name || 'UI Format Node'
          }
        };

        // Send formatted message
        send({
          ...msg,
          payload: uiMessage,
          topic: 'ui-channel-formatted',
          uiMessageType: this.messageType,
          displayType: payload.displayType || this.displayType
        });
        
        // Update status with appropriate color based on message type and display type
        const getStatusColor = () => {
          if (this.messageType === 'notification' || this.messageType === 'display_update') {
            switch (payload.displayType || this.displayType) {
              case 'success': return 'green';
              case 'warning': return 'yellow'; 
              case 'error': return 'red';
              case 'info':
              default: return 'blue';
            }
          } else if (this.messageType === 'user_input') {
            return 'green';
          } else if (this.messageType === 'phase_change') {
            return 'blue';
          } else {
            return 'grey';
          }
        };
        
        this.status({ 
          fill: getStatusColor() as any,
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
  UIFormatNodeConstructor.prototype.parseJsonField = function(this: UIFormatNode, field: string): any {
    if (!field || field.trim() === '') return null;
    try {
      return JSON.parse(field);
    } catch {
      return field; // Return as string if not valid JSON
    }
  };

  RED.nodes.registerType('alephscript-ui-format', UIFormatNodeConstructor);
};

export = UIFormatNodeInitializer;
