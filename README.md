# Node-RED AlephScript SDK

A comprehensive Node-RED integration system for the AlephScript ecosystem featuring contrib nodes and Angular UI components with real-time Socket.IO orchestration.

## Project Overview

Node-RED AlephScript SDK is a dual-library integration platform that bridges Node-RED flows with AlephScript's multi-channel bot orchestration system. The SDK features:

- **13 Node-RED Contrib Nodes**: Complete suite including Bot, App Channel, Sys Channel, UI Channel, Orchestrator, Dashboard widgets, and testing tools
- **Real-time Communication**: Socket.IO client integration with AlephScript protocol (CLIENT_REGISTER, rooms, namespaces)
- **3-Channel Architecture**: Specialized nodes for app, sys, and ui channels with state management
- **Angular UI Components**: Dashboard 2.0 management panel and GamificationUI extensions
- **State Management**: Comprehensive state tracking, transitions, and action coordination
- **Multi-Bot Support**: Room-based communication with cross-bot messaging capabilities
- **Automated Installation**: One-command setup with `npm run install:node-red-auto`
- **Production Ready**: Comprehensive examples and documentation for enterprise deployment

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Node-RED AlephScript SDK                     │
├─────────────────────────────────────────────────────────────────┤
│  node-red-contrib-alephscript (Node-RED Contrib Package)       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Bot Node    │  │ App Channel │  │ Orchestrator Node       │  │
│  │ SocketIO    │  │ State Mgmt  │  │ RxJS Pipeline Hub       │  │
│  │ CLIENT_REG  │  │ Transitions │  │ Cross-Channel Routing   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Sys Channel │  │ UI Channel  │  │ Dashboard 2.0 Widgets   │  │
│  │ Health Mon  │  │ Notifications│  │ Bot Registry + Monitor  │  │
│  │ Error Report│  │ Phase Changes│  │ Room Cross-Comm Tester  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  node-red-gamify-ui (Angular UI Package)                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ GamificationUI Extension + Node-RED Discovery Service      │  │
│  │ • AlephScriptWebUI Class (extends GamificationUI)         │  │
│  │ • Multi-Instance Manager (iframe routing)                 │  │
│  │ • 3-Channel Integration Layer (App/Sys/UI routing)        │  │
│  │ • PostInstall Distribution (→ public_templates)           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Package Details

### node-red-contrib-alephscript

A Node-RED contrib package providing native integration with AlephScript's Socket.IO orchestration system.

**Key Features:**
- **Bot Node**: Full AlephScript client with CLIENT_REGISTER protocol
- **App Channel Node**: State management and action coordination  
- **Sys Channel Node**: Health monitoring and system events
- **UI Channel Node**: User interface notifications and phase changes
- **Orchestrator Node**: Central hub for cross-channel message routing
- **Dashboard 2.0 Widgets**: Bot registry, room tester, stream monitor

**Technical Stack:**
- TypeScript + CommonJS compilation for Node-RED compatibility
- Socket.IO client 4.7.2 with AlephScript protocol support
- RxJS for reactive stream processing
- Jest testing framework with Node-RED mocks
- ESLint + TypeScript strict mode

### node-red-gamify-ui

An Angular application extending the GamificationUI pattern for Node-RED management and AlephScript integration.

**Key Features:**
- **GamificationUI Extension**: AlephScriptWebUI class with postinstall distribution
- **Node-RED Discovery**: Multi-instance detection and iframe management
- **3-Channel Integration**: App/Sys/UI channel routing and visualization
- **Dashboard Integration**: Editor/Dashboard mode switching
- **Configuration Management**: xplus1-config.json integration patterns

**Technical Stack:**
- Angular 17+ with standalone components
- Socket.IO client integration
- PostInstall automation (build → public_templates)
- IFrame communication protocols
- AlephScript ecosystem integration

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 8+ or yarn 1.22+
- Git Bash (Windows) or compatible shell
- AlephScript server running (socket-gym/ws-server)

### Installation

#### Quick Installation (Recommended)

```bash
# Clone the repository
git clone https://github.com/escrivivir-co/node-red-alephscript-sdk.git
cd node-red-alephscript-sdk

# Install dependencies and build
npm install

# Install automatically to Node-RED (Windows/Linux/macOS)
npm run install:node-red-auto
```

**✅ Installation verified successfully on Windows Git Bash!**

#### Manual Installation

```bash
# Install root dependencies (monorepo management)
npm install

# Install package dependencies
npm run install:all

# Build all packages with HTML asset copying
npm run build:all

# Manual installation to Node-RED
cd ~/.node-red
npm install path/to/node-red-alephscript-sdk/packages/node-red-contrib-alephscript
```

#### Available Scripts

```bash
# Automated installation (detects Node-RED directory)
npm run install:node-red-auto

# Individual builds
npm run build:contrib        # node-red-contrib-alephscript only
npm run build:ui            # node-red-gamify-ui only
npm run build:all           # Build all packages

# Development with hot reload
npm run dev
```

### Development Setup

```bash
# Development mode with watch (TypeScript + HTML auto-copy)
npm run dev

# Build individual packages
npm run build:contrib        # node-red-contrib-alephscript only
npm run build:ui            # node-red-gamify-ui only

# Run tests
npm run test:all            # All packages
npm run test:contrib        # Contrib nodes only

# Linting and formatting
npm run lint:all
npm run lint:fix:all
```

### Usage in Node-RED

**✅ After successful installation, restart Node-RED to see the 13 AlephScript nodes in the palette!**

#### Available Nodes:
- **alephscript-bot** - Basic bot with Socket.IO integration
- **alephscript-enhanced-bot** - Advanced bot with features array
- **alephscript-app-channel** - Application state management
- **alephscript-sys-channel** - System health monitoring  
- **alephscript-ui-channel** - User interface notifications
- **alephscript-orchestrator** - Central message hub
- **alephscript-config** - Configuration node
- **Format nodes** - Data formatting for each channel (3 nodes)
- **Dashboard widgets** - Bot registry, room tester, stream monitor (3 nodes)

#### Quick Start Configuration:

1. **Basic Bot Setup:**
   - Server URL: `http://localhost:3000` (AlephScript ws-server)
   - Namespace: `/runtime`  
   - Bot Name: `MyNodeRedBot`
   - Auto-connect: ✅

2. **Add App Channel for state management:**
   - Connect to same server
   - State filters: `['initial', 'running', 'completed']`
   - Action filters: `['get_state', 'reset_state']`

## 📁 Flow Examples

The `examples/flows/` directory contains 6 comprehensive flow demonstrations:

1. **[Basic Bot Connection](examples/flows/01-basic-bot-connection.json)** - Simple client-server connection
2. **[Multi-Channel Bot](examples/flows/02-multi-channel-bot.json)** - App/Sys/UI channel integration
3. **[Orchestrator Pipeline](examples/flows/03-orchestrator-pipeline.json)** - Message routing and processing
4. **[Cross-Room Communication](examples/flows/04-cross-room-communication.json)** - Multi-bot room messaging
5. **[Dashboard Monitoring](examples/flows/05-dashboard-monitoring.json)** - Real-time monitoring widgets
6. **[Complete System Demo](examples/flows/06-complete-system-demo.json)** - Full production scenario

### Quick Import

1. Open Node-RED editor (`http://localhost:1880`)
2. Go to Menu → Import
3. Select any flow JSON from `examples/flows/`
4. Deploy and test!

**📖 See [examples/README.md](examples/README.md) for detailed documentation and setup instructions.**

## 🚀 Example Flows

### Flow 1: Basic Bot Registration

```json
[
  {
    "id": "basic-bot-flow",
    "type": "tab",
    "label": "Basic AlephScript Bot",
    "disabled": false,
    "info": ""
  },
  {
    "id": "aleph-bot-1",
    "type": "alephscript-bot",
    "z": "basic-bot-flow",
    "name": "Demo Bot",
    "serverUrl": "http://localhost:3000",
    "namespace": "/runtime",
    "botName": "NodeRedDemoBot",
    "autoConnect": true,
    "features": ["messaging", "state-sync"],
    "x": 200,
    "y": 200,
    "wires": [["debug-output"]]
  },
  {
    "id": "debug-output",
    "type": "debug",
    "z": "basic-bot-flow",
    "name": "Bot Events",
    "active": true,
    "tosidebar": true,
    "console": false,
    "tostatus": false,
    "complete": "payload",
    "targetType": "msg",
    "x": 400,
    "y": 200,
    "wires": []
  }
]
```

### Flow 2: 3-Channel Orchestration

```json
[
  {
    "id": "orchestration-flow",
    "type": "tab",
    "label": "3-Channel AlephScript System",
    "disabled": false,
    "info": ""
  },
  {
    "id": "orchestrator-hub",
    "type": "alephscript-orchestrator",
    "z": "orchestration-flow",
    "name": "Central Hub",
    "serverUrl": "http://localhost:3000",
    "namespace": "/runtime",
    "enableCrossChannel": true,
    "x": 300,
    "y": 200,
    "wires": [["app-channel"], ["sys-channel"], ["ui-channel"]]
  },
  {
    "id": "app-channel",
    "type": "alephscript-app-channel",
    "z": "orchestration-flow",
    "name": "App Channel",
    "serverUrl": "http://localhost:3000",
    "namespace": "/app",
    "stateFilters": ["initial", "running", "completed"],
    "actionFilters": ["get_state", "set_state", "reset_state"],
    "x": 150,
    "y": 300,
    "wires": [["app-debug"]]
  },
  {
    "id": "sys-channel",
    "type": "alephscript-sys-channel",
    "z": "orchestration-flow",
    "name": "System Channel",
    "serverUrl": "http://localhost:3000",
    "namespace": "/sys",
    "healthMonitoring": true,
    "errorReporting": true,
    "x": 300,
    "y": 300,
    "wires": [["sys-debug"]]
  },
  {
    "id": "ui-channel",
    "type": "alephscript-ui-channel",
    "z": "orchestration-flow",
    "name": "UI Channel",
    "serverUrl": "http://localhost:3000",
    "namespace": "/ui",
    "notificationTypes": ["info", "warning", "error"],
    "phaseChangeTracking": true,
    "x": 450,
    "y": 300,
    "wires": [["ui-debug"]]
  },
  {
    "id": "app-debug",
    "type": "debug",
    "z": "orchestration-flow",
    "name": "App Events",
    "x": 150,
    "y": 400,
    "wires": []
  },
  {
    "id": "sys-debug",
    "type": "debug",
    "z": "orchestration-flow",
    "name": "Sys Events",
    "x": 300,
    "y": 400,
    "wires": []
  },
  {
    "id": "ui-debug",
    "type": "debug",
    "z": "orchestration-flow",
    "name": "UI Events",
    "x": 450,
    "y": 400,
    "wires": []
  }
]
```

### Flow 3: Multi-Bot Room Communication

```json
[
  {
    "id": "multi-bot-flow",
    "type": "tab",
    "label": "Multi-Bot Room System",
    "disabled": false,
    "info": ""
  },
  {
    "id": "bot-manager-1",
    "type": "alephscript-enhanced-bot",
    "z": "multi-bot-flow",
    "name": "Manager Bot",
    "serverUrl": "http://localhost:3000",
    "namespace": "/runtime",
    "botName": "ManagerBot",
    "autoConnect": true,
    "features": ["room-management", "cross-bot-messaging", "state-coordination"],
    "roomId": "demo-room-001",
    "x": 200,
    "y": 150,
    "wires": [["room-tester"]]
  },
  {
    "id": "bot-worker-1",
    "type": "alephscript-enhanced-bot",
    "z": "multi-bot-flow",
    "name": "Worker Bot 1",
    "serverUrl": "http://localhost:3000",
    "namespace": "/runtime",
    "botName": "WorkerBot1",
    "autoConnect": true,
    "features": ["task-execution", "status-reporting"],
    "roomId": "demo-room-001",
    "x": 200,
    "y": 250,
    "wires": [["room-tester"]]
  },
  {
    "id": "bot-worker-2",
    "type": "alephscript-enhanced-bot",
    "z": "multi-bot-flow",
    "name": "Worker Bot 2",
    "serverUrl": "http://localhost:3000",
    "namespace": "/runtime",
    "botName": "WorkerBot2",
    "autoConnect": true,
    "features": ["task-execution", "status-reporting"],
    "roomId": "demo-room-001",
    "x": 200,
    "y": 350,
    "wires": [["room-tester"]]
  },
  {
    "id": "room-tester",
    "type": "alephscript-room-tester",
    "z": "multi-bot-flow",
    "name": "Room Communication Tester",
    "serverUrl": "http://localhost:3000",
    "namespace": "/runtime",
    "roomId": "demo-room-001",
    "testInterval": 5000,
    "crossBotMessages": true,
    "x": 450,
    "y": 250,
    "wires": [["stream-monitor"]]
  },
  {
    "id": "stream-monitor",
    "type": "alephscript-stream-monitor",
    "z": "multi-bot-flow",
    "name": "Activity Monitor",
    "serverUrl": "http://localhost:3000",
    "monitorChannels": ["app", "sys", "ui"],
    "bufferSize": 100,
    "realTimeUpdates": true,
    "x": 700,
    "y": 250,
    "wires": [["activity-debug"]]
  },
  {
    "id": "activity-debug",
    "type": "debug",
    "z": "multi-bot-flow",
    "name": "Room Activity",
    "x": 900,
    "y": 250,
    "wires": []
  }
]
```

### Flow 4: State Machine Integration

```json
[
  {
    "id": "state-machine-flow",
    "type": "tab",
    "label": "AlephScript + State Machine",
    "disabled": false,
    "info": ""
  },
  {
    "id": "config-node",
    "type": "alephscript-config",
    "serverUrl": "http://localhost:3000",
    "globalNamespace": "/runtime",
    "autoReconnect": true,
    "reconnectDelay": 1000
  },
  {
    "id": "state-bot",
    "type": "alephscript-enhanced-bot",
    "z": "state-machine-flow",
    "name": "State Machine Bot",
    "config": "config-node",
    "botName": "StateMachineBot",
    "features": ["state-transitions", "event-handling", "phase-management"],
    "x": 200,
    "y": 200,
    "wires": [["app-formatter"]]
  },
  {
    "id": "app-formatter",
    "type": "alephscript-app-format",
    "z": "state-machine-flow",
    "name": "State Formatter",
    "stateTransformations": {
      "initial": "ready",
      "running": "executing",
      "completed": "finished",
      "error": "failed"
    },
    "x": 400,
    "y": 200,
    "wires": [["app-channel-state"]]
  },
  {
    "id": "app-channel-state",
    "type": "alephscript-app-channel",
    "z": "state-machine-flow",
    "name": "State Manager",
    "config": "config-node",
    "stateFilters": ["ready", "executing", "finished", "failed"],
    "actionFilters": ["transition", "rollback", "reset"],
    "x": 600,
    "y": 200,
    "wires": [["state-debug"], ["ui-formatter"]]
  },
  {
    "id": "ui-formatter",
    "type": "alephscript-ui-format",
    "z": "state-machine-flow",
    "name": "UI Formatter",
    "notificationTemplates": {
      "ready": "System is ready for operation",
      "executing": "Processing request...",
      "finished": "Operation completed successfully",
      "failed": "Operation failed - check logs"
    },
    "x": 400,
    "y": 300,
    "wires": [["ui-channel-notify"]]
  },
  {
    "id": "ui-channel-notify",
    "type": "alephscript-ui-channel",
    "z": "state-machine-flow",
    "name": "UI Notifications",
    "config": "config-node",
    "notificationTypes": ["info", "success", "warning", "error"],
    "x": 600,
    "y": 300,
    "wires": [["ui-debug"]]
  },
  {
    "id": "state-debug",
    "type": "debug",
    "z": "state-machine-flow",
    "name": "State Changes",
    "x": 800,
    "y": 200,
    "wires": []
  },
  {
    "id": "ui-debug",
    "type": "debug",
    "z": "state-machine-flow",
    "name": "UI Events",
    "x": 800,
    "y": 300,
    "wires": []
  }
]
```

## 📊 Dashboard 2.0 Integration

The SDK includes Dashboard 2.0 widgets for comprehensive monitoring:

### Bot Registry Widget
- Real-time bot registration tracking
- Connection status monitoring
- Feature capability overview

### Room Communication Tester
- Cross-bot message testing
- Room-based communication verification
- Performance metrics

### Stream Monitor
- Multi-channel activity visualization
- Real-time event streaming
- Buffer management and replay

### Integration with X+1 Demo
The Node-RED AlephScript integration works seamlessly with the existing X+1 demo configuration in `state-machine-mcp-driver`.

## Build Scripts Documentation

### Root Package Scripts

```json
{
  "scripts": {
    "build:all": "npm run build:contrib && npm run build:ui",
    "build:contrib": "cd packages/node-red-contrib-alephscript && npm run build:full",
    "build:ui": "cd packages/node-red-gamify-ui && npm run build",
    "dev": "concurrently \"npm run dev:contrib\" \"npm run dev:ui\"",
    "dev:contrib": "cd packages/node-red-contrib-alephscript && npm run dev",
    "test:all": "npm run test:contrib && npm run test:ui",
    "install:all": "cd packages/node-red-contrib-alephscript && npm install && cd ../node-red-gamify-ui && npm install"
  }
}
```

### Contrib Package Scripts (with HTML Copy)

```json
{
  "scripts": {
    "build": "tsc",
    "build:full": "npm run build && npm run copy:html",
    "copy:html": "cp src/nodes/*.html dist/nodes/",
    "dev": "concurrently \"tsc --watch\" \"npm run watch:html\"",
    "watch:html": "chokidar \"src/nodes/*.html\" -c \"npm run copy:html\"",
    "test": "jest"
  }
}
```

## Project Structure

```
node-red-alephscript-sdk/
├── package.json                         # Monorepo build scripts
├── packages/
│   ├── node-red-contrib-alephscript/     # Node-RED contrib package
│   │   ├── src/
│   │   │   ├── nodes/
│   │   │   │   ├── bot-node.ts           # ✅ Bot integration
│   │   │   │   ├── bot-node.html         # UI configuration
│   │   │   │   ├── app-channel-node.ts   # ✅ App channel (Iteration 4)
│   │   │   │   ├── app-channel-node.html # State management UI
│   │   │   │   ├── sys-channel-node.ts   # 🚧 Sys channel (Iteration 5)
│   │   │   │   ├── ui-channel-node.ts    # 🚧 UI channel (Iteration 6)
│   │   │   │   └── orchestrator-node.ts  # 🚧 Central hub (Iteration 7)
│   │   │   ├── __tests__/                # Jest test suites
│   │   │   └── index.ts                  # Package entry point
│   │   ├── dist/                         # Compiled JS + HTML
│   │   ├── package.json                  # Node-RED node definitions
│   │   └── tsconfig.json                 # TypeScript config
│   └── node-red-gamify-ui/               # Angular UI package
│       ├── src/app/                      # Angular application
│       ├── scripts/postinstall.cjs       # Distribution automation
│       └── package.json                  # Angular build config
├── vibecoding/                           # Development documentation
│   ├── docs/                             # Iteration documentation
│   │   ├── iteration_01.md               # ✅ Analysis & Planning
│   │   ├── iteration_02.md               # ✅ Foundation & Setup
│   │   ├── iteration_03.md               # ✅ Bot Node Implementation
│   │   ├── iteration_04.md               # 🚧 App Channel Node (Current)
│   │   └── iteration_05-10.md            # 📋 Remaining iterations
│   └── MASTER_CHECKLIST.md               # Progress tracking
└── README.md                             # This file
```

## Development Progress

### ✅ Completed Iterations

- **Iteration 1**: Analysis & Planning (AlephScript ecosystem mapping)
- **Iteration 2**: Foundation & Setup (TypeScript, Jest, build system)  
- **Iteration 3**: Bot Node Implementation (Socket.IO, CLIENT_REGISTER)
- **Iteration 4**: App Channel Node Implementation (State management) 🚧

### 📋 Upcoming Iterations

- **Iteration 5**: Sys Channel Node (Health monitoring, error reporting)
- **Iteration 6**: UI Channel Node (Notifications, phase changes)
- **Iteration 7**: Orchestrator Node (RxJS pipeline, cross-channel routing)
- **Iteration 8**: Dashboard 2.0 Widgets (Bot registry, room tester)
- **Iteration 9**: Angular UI Application (GamificationUI extension)
- **Iteration 10**: Distribution & Release (npm publish, documentation)

## Contributing

This project follows a structured iterative development approach documented in `vibecoding/docs/`. Each iteration includes:

1. **F1**: Analysis (where we come from)
2. **F2**: Objectives (where we want to go)  
3. **F3**: Options (how to get there)
4. **F4**: Execution (implementation)
5. **F5**: Results (where we arrived)

### Development Workflow

1. Check current iteration progress in `vibecoding/MASTER_CHECKLIST.md`
2. Follow iteration documentation in `vibecoding/docs/iteration_XX.md`
3. Implement features with comprehensive testing
4. Update documentation and mark checkpoints
5. Ensure all builds pass before moving to next iteration

## Testing

```bash
# Run all tests
npm run test:all

# Test specific package
cd packages/node-red-contrib-alephscript
npm test

# Integration testing with AlephScript server
npm run test:integration
```

## AlephScript Protocol Integration

### Bot Registration Flow

```typescript
// 1. Connect to AlephScript server
socket = io('http://localhost:3000/runtime');

// 2. Register as client (follows AlephScript protocol)
socket.emit('CLIENT_REGISTER', {
  usuario: 'MyNodeRedBot',
  sesion: generateSessionHash(),
  type: 'NodeRedBot',
  features: ['messaging', 'node-red-integration']
});

// 3. Subscribe to rooms
socket.emit('CLIENT_SUSCRIBE', { 
  room: 'ENGINE_THREADS' 
});
```

### 3-Channel Architecture

- **App Channel**: Application state management, action coordination
- **Sys Channel**: System health, error reporting, monitoring  
- **UI Channel**: User interface events, notifications, phase changes

## License

MIT License - see LICENSE file for details.

## Links

- [AlephScript Ecosystem](../socket-gym/)
- [Node-RED Documentation](https://nodered.org/docs/)
- [Development Progress](vibecoding/MASTER_CHECKLIST.md)

# Build only Angular UI
npm run build:ui

# Development mode (TypeScript watch)
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Package-specific Scripts

#### node-red-contrib-alephscript
```bash
cd packages/node-red-contrib-alephscript

# Full build (TypeScript + HTML copy)
npm run build

# TypeScript compilation only
npm run build:ts

# Copy HTML files to dist/nodes/
npm run copy-html

# Development mode
npm run dev

# Run tests
npm test
```

## 📝 Build Process Details

### TypeScript Compilation
- **Source**: `src/**/*.ts`
- **Target**: `dist/**/*.js` + `dist/**/*.d.ts`
- **Config**: `tsconfig.json` (ES2020 → CommonJS)

### HTML File Handling
Node-RED requires HTML files alongside JavaScript for node configuration UI:

1. **Source**: `src/nodes/*.html` (Node-RED UI definitions)
2. **Destination**: `dist/nodes/*.html` (copied after TypeScript compilation)
3. **Process**: Automatic copy via `npm run copy-html`

**Example**:
```
src/nodes/
├── bot-node.ts          → dist/nodes/bot-node.js
├── bot-node.html        → dist/nodes/bot-node.html
├── app-channel-node.ts  → dist/nodes/app-channel-node.js
└── app-channel-node.html → dist/nodes/app-channel-node.html
```

## 📚 Available Nodes

### 1. AlephScript Bot Node ✅
- **Type**: `alephscript-bot`
- **Purpose**: Connect Node-RED to AlephScript server as a bot
- **Features**: Socket.IO client, CLIENT_REGISTER protocol, room subscription

### 2. AlephScript App Channel Node ✅
- **Type**: `alephscript-app-channel`
- **Purpose**: Handle state transitions and action requests
- **Features**: State filtering, action routing, dual outputs

## Estado del Proyecto

### ✅ **COMPLETADAS**
- [x] **Iteración 1** - Análisis y Planificación
- [x] **Iteración 2** - Foundation & Setup del Proyecto  
- [x] **Iteración 3** - Bot Node Implementation
- [x] **Iteración 4** - App Channel Node Implementation (En progreso)

### 📋 **PRÓXIMA ITERACIÓN**
- [ ] **Iteración 5** - Sys Channel Node Implementation

## Referencias clave
- Core y Orquestación: `../state-machine-mcp-driver/`
- Servidor Socket.IO y gym: `../socket-gym/`
- UIs de referencia: `../threejs-gamify-ui/`, `../web-rtc-gamify-ui/`, `../aleph-unity-bot/`
- Documentación detallada: `vibecoding/docs/` y `vibecoding/MASTER_CHECKLIST.md`
