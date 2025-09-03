export interface NodeRedInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  url: string;
  status: 'online' | 'offline' | 'checking';
  version?: string;
  lastSeen: Date;
  hasUI?: boolean;
  flows?: number;
  nodes?: number;
}

export interface AlephScriptConfig {
  serverUrl: string;
  autoReconnect: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'reconnecting';
