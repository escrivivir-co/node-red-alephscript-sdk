# Node-RED AlephScript SDK

A comprehensive Node-RED integration system for the AlephScript ecosystem featuring contrib nodes and Angular UI components with real-time Socket.IO orchestration.

## Project Overview

Node-RED AlephScript SDK is a dual-library integration platform that bridges Node-RED flows with AlephScript's multi-channel bot orchestration system. The SDK features:

- **Node-RED Contrib Nodes**: Custom nodes for Bot, App Channel, Sys Channel, UI Channel, and Orchestrator integration
- **Real-time Communication**: Socket.IO client integration with AlephScript protocol (CLIENT_REGISTER, rooms, namespaces)
- **3-Channel Architecture**: Specialized nodes for app, sys, and ui channels with state management
- **Angular UI Components**: Dashboard 2.0 management panel and GamificationUI extensions
- **State Management**: Comprehensive state tracking, transitions, and action coordination
- **Multi-Bot Support**: Room-based communication with cross-bot messaging capabilities

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

```bash
# Clone the repository
git clone https://github.com/escrivivir-co/node-red-alephscript-sdk.git
cd node-red-alephscript-sdk

# Install root dependencies (monorepo management)
npm install

# Install package dependencies
npm run install:all

# Build all packages with HTML asset copying
npm run build:all
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

1. **Install the contrib package:**
   ```bash
   cd ~/.node-red
   npm install path/to/node-red-alephscript-sdk/packages/node-red-contrib-alephscript
   ```

2. **Start Node-RED and find AlephScript nodes in the palette**

3. **Configure a Bot Node:**
   - Server URL: `http://localhost:3000` (AlephScript server)
   - Namespace: `/runtime`
   - Bot Name: `MyNodeRedBot`
   - Auto-connect: ✅

4. **Add App Channel Node for state management:**
   - Connect to same server
   - Configure state filters: `['initial', 'running', 'completed']`
   - Configure action filters: `['get_state', 'reset_state']`

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
