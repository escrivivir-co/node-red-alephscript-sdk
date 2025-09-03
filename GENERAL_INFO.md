# node-red-alephscript-sdk

SDK monorepo containing Node-RED contrib nodes and Angular UI for AlephScript ecosystem integration.

## 📦 Package Structure

```
node-red-alephscript-sdk/
├── packages/
│   ├── node-red-contrib-alephscript/    # Node-RED contrib nodes (✅ Bot + App Channel)
│   └── node-red-gamify-ui/              # Angular UI application
├── vibecoding/                          # Development documentation
└── package.json                         # Monorepo build scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Git Bash (Windows) or compatible shell

### Installation & Build

```bash
# Clone the repository
git clone <repository-url>
cd node-red-alephscript-sdk

# Install dependencies for all packages
npm install
cd packages/node-red-contrib-alephscript && npm install
cd ../node-red-gamify-ui && npm install

# Build all packages
npm run build

# Development mode (watch)
npm run dev
```

## 🔧 Build Scripts

### Root Level Scripts
```bash
# Build all packages (TypeScript + HTML copy)
npm run build

# Build only Node-RED contrib
npm run build:contrib

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
