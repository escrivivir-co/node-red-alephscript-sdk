// Node-RED Contrib AlephScript - Main Entry Point
// Note: bot-node uses module.exports so we can't use export *

// Export types and interfaces
export interface AlephScriptConfig {
  botName: string;
  serverUrl: string;
  namespace: string;
  autoConnect: boolean;
}

// Export version info
export const VERSION = '0.1.0';
