import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red';

type CoreChannel = 'app' | 'sys' | 'ui' | 'room';

interface CoreFormatNodeDef extends NodeDef {
  channel: CoreChannel;
  messageType: string;
  sourceId: string;
  room: string;
  event: string;
  payloadTemplate: string;
}

interface CoreFormatNode extends Node {
  channel: CoreChannel;
  messageType: string;
  sourceId: string;
  room: string;
  event: string;
  payloadTemplate: string;
}

function parseTemplate(value: string, fallback: unknown): unknown {
  if (!value || !value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export = function (RED: NodeAPI) {
  function CoreFormatNode(this: CoreFormatNode, config: CoreFormatNodeDef) {
    RED.nodes.createNode(this, config);

    this.channel = config.channel || 'room';
    this.messageType = config.messageType || 'message';
    this.sourceId = config.sourceId || this.id;
    this.room = config.room || 'ENGINE_THREADS';
    this.event = config.event || 'NODE_RED_MESSAGE';
    this.payloadTemplate = config.payloadTemplate || '';

    this.on('input', (msg: NodeMessage, send, done) => {
      try {
        const body = parseTemplate(this.payloadTemplate, msg.payload);
        const payload = {
          id: `${this.channel}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          channel: this.channel,
          type: this.messageType,
          source: this.sourceId,
          timestamp: Date.now(),
          room: this.channel === 'room' ? this.room : undefined,
          event: this.channel === 'room' ? this.event : undefined,
          payload: body
        };

        send({
          ...msg,
          topic: this.channel === 'room' ? 'room_message' : `${this.channel}-channel-formatted`,
          payload
        });
        this.status({ fill: 'green', shape: 'dot', text: `${this.channel}:${this.messageType}` });
        done();
      } catch (error) {
        this.status({ fill: 'red', shape: 'ring', text: 'format error' });
        done(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  RED.nodes.registerType('alephscript-core-format', CoreFormatNode);
};