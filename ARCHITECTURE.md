# Architecture Guide - Node-RED AlephScript SDK

Complete architectural documentation for the Node-RED AlephScript SDK system.

## 🏗️ System Overview

The Node-RED AlephScript SDK is a dual-library integration platform that bridges Node-RED flows with AlephScript's multi-channel bot orchestration system.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Node-RED AlephScript SDK                     │
├─────────────────────────────────────────────────────────────────┤
│  📦 node-red-contrib-alephscript (Node-RED Contrib Package)    │
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
│  🎨 node-red-gamify-ui (Angular UI Package)                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ GamificationUI Extension + Node-RED Discovery Service      │  │
│  │ • AlephScriptWebUI Class (extends GamificationUI)         │  │
│  │ • Multi-Instance Manager (iframe routing)                 │  │
│  │ • 3-Channel Integration Layer (App/Sys/UI routing)        │  │
│  │ • PostInstall Distribution (→ public_templates)           │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Core Concepts

### 1. Three-Channel Architecture

The AlephScript protocol defines three specialized communication channels:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   App Channel   │    │   Sys Channel   │    │   UI Channel    │
│                 │    │                 │    │                 │
│ • State Mgmt    │    │ • Health Checks │    │ • Notifications │
│ • Transitions   │    │ • Error Reports │    │ • Phase Changes │
│ • Action Req    │    │ • Monitoring    │    │ • User Actions  │
│ • Data Updates  │    │ • Alerts        │    │ • Display Upd   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Orchestrator   │
                    │                 │
                    │ • RxJS Pipeline │
                    │ • Cross-Channel │
                    │ • Message Route │
                    │ • Hub Coordination │
                    └─────────────────┘
```

### 2. Bot Registration Protocol

```sequence
Bot Node -> AlephScript Server: CLIENT_REGISTER(botName)
AlephScript Server -> Bot Node: ROOM_ASSIGNED(roomId)
Bot Node -> Room: JOIN_ROOM(roomId)
Bot Node -> Channels: SUBSCRIBE_CHANNELS(app, sys, ui)
```

### 3. Message Flow Architecture

```
┌──────────────┐    ┌────────────────┐    ┌──────────────────┐
│  Node-RED    │    │  AlephScript   │    │  Other Clients   │
│   Flows      │    │    Server      │    │   (Proserpina,   │
│              │    │                │    │   Orfeo, etc.)   │
│ ┌──────────┐ │    │ ┌────────────┐ │    │ ┌──────────────┐ │
│ │Bot Node  │◄┼────┼►│Socket.IO   │◄┼────┼►│AlephScript   │ │
│ │          │ │    │ │Server      │ │    │ │Clients       │ │
│ └──────────┘ │    │ │            │ │    │ └──────────────┘ │
│ ┌──────────┐ │    │ │ Rooms:     │ │    │                  │
│ │Channels  │◄┼────┼►│ • /runtime │ │    │                  │
│ │(App/Sys/ │ │    │ │ • /app     │ │    │                  │
│ │UI)       │ │    │ │ • /sys     │ │    │                  │
│ └──────────┘ │    │ │ • /ui      │ │    │                  │
│              │    │ └────────────┘ │    │                  │
└──────────────┘    └────────────────┘    └──────────────────┘
```

## 📦 Package Architecture

### node-red-contrib-alephscript

TypeScript-based Node-RED contrib package with 13 nodes:

```
packages/node-red-contrib-alephscript/
├── src/
│   ├── nodes/           # Node implementations
│   │   ├── bot-node.ts
│   │   ├── enhanced-bot-node.ts
│   │   ├── app-channel-node.ts
│   │   ├── sys-channel-node.ts
│   │   ├── ui-channel-node.ts
│   │   ├── orchestrator-node.ts
│   │   ├── format-nodes.ts (3 nodes)
│   │   ├── dashboard-nodes.ts (3 nodes)
│   │   └── config-node.ts
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Shared utilities
│   └── templates/       # HTML templates
├── dist/                # Built JavaScript + HTML
├── package.json
└── README.md
```

### node-red-gamify-ui

Angular-based UI application with GamificationUI pattern:

```
packages/node-red-gamify-ui/
├── src/
│   ├── app/
│   │   ├── components/      # Angular components
│   │   │   ├── discovery/   # Node-RED discovery
│   │   │   ├── iframe/      # IFrame management
│   │   │   └── dashboard/   # Dashboard integration
│   │   ├── services/        # Angular services
│   │   │   ├── discovery.service.ts
│   │   │   ├── alephscript.service.ts
│   │   │   └── ui-manager.service.ts
│   │   └── models/          # Data models
│   ├── assets/              # Static assets
│   └── environments/        # Environment configs
├── dist/                    # Built Angular app
├── scripts/
│   └── postinstall.cjs     # Distribution automation
├── package.json
└── angular.json
```

## 🔧 Technical Architecture

### 1. Node-RED Integration

#### Node Lifecycle

```typescript
// Node Registration
RED.nodes.registerType("alephscript-bot", {
    category: 'alephscript',
    color: '#a6bbcf',
    defaults: {
        name: { value: "" },
        serverUrl: { value: "http://localhost:3000" },
        namespace: { value: "/runtime" },
        botName: { value: "NodeRedBot" }
    },
    inputs: 1,
    outputs: 1,
    icon: "bridge.png",
    label: function() { return this.name || "AlephScript Bot"; }
});
```

#### Runtime Implementation

```typescript
// Node Runtime
function AlephScriptBotNode(config) {
    RED.nodes.createNode(this, config);
    
    // Socket.IO client setup
    this.client = io(config.serverUrl + config.namespace);
    
    // CLIENT_REGISTER protocol
    this.client.emit('CLIENT_REGISTER', {
        clientType: 'node-red-bot',
        botName: config.botName
    });
    
    // Message handling
    this.on('input', (msg) => {
        this.client.emit('message', msg.payload);
    });
}
```

### 2. AlephScript Protocol Integration

#### Socket.IO Communication

```typescript
interface AlephScriptProtocol {
    CLIENT_REGISTER: {
        clientType: string;
        botName: string;
        features?: string[];
    };
    
    ROOM_ASSIGNED: {
        roomId: string;
        namespace: string;
    };
    
    MESSAGE: {
        type: string;
        channel: 'app' | 'sys' | 'ui';
        data: any;
        timestamp: string;
    };
}
```

#### Channel Message Types

```typescript
// App Channel Messages
interface AppMessage {
    type: 'state_transition' | 'action_request' | 'data_update';
    appState?: string;
    appAction?: string;
    data: any;
}

// Sys Channel Messages  
interface SysMessage {
    type: 'health_check' | 'error' | 'warning' | 'metric';
    serviceId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metrics?: object;
}

// UI Channel Messages
interface UIMessage {
    type: 'notification' | 'display_update' | 'phase_change';
    component?: string;
    displayType?: string;
    notificationType?: 'info' | 'warning' | 'error' | 'success';
}
```

### 3. Dashboard 2.0 Integration

#### Widget Architecture

```typescript
// Dashboard Widget Registration
RED.nodes.registerType("alephscript-bot-registry", {
    category: 'dashboard',
    defaults: {
        name: { value: "" },
        group: { type: "ui-group", required: true },
        serverUrl: { value: "http://localhost:3000" }
    },
    oneditprepare: function() {
        // Dashboard 2.0 configuration UI
    }
});
```

#### Real-time Updates

```typescript
// Dashboard data flow
class BotRegistryWidget {
    constructor(config) {
        this.client = io(config.serverUrl);
        this.setupDashboard();
    }
    
    setupDashboard() {
        // Send data to Dashboard 2.0
        this.node.send({
            payload: this.botData,
            ui_update: {
                chart: 'bot-status',
                data: this.formatChartData()
            }
        });
    }
}
```

### 4. Angular UI Architecture

#### GamificationUI Pattern

```typescript
export class AlephScriptWebUI extends GamificationUI {
    constructor() {
        super();
        this.initializeNodeRedDiscovery();
        this.setupMultiInstanceManager();
    }
    
    // Implement GamificationUI interface
    async initialize(config: any): Promise<void> {
        await this.discoverNodeRedInstances();
        this.setupIFrameManagement();
    }
    
    async start(): Promise<void> {
        this.startUIManager();
    }
}
```

#### Discovery Service

```typescript
@Injectable()
export class DiscoveryService {
    // Priority-based port scanning
    priorityPorts = [1880, 1881, 1882, 1883, 1884];
    
    async discoverInstances(): Promise<NodeRedInstance[]> {
        const instances = [];
        
        // Quick scan of priority ports
        for (const port of this.priorityPorts) {
            const instance = await this.testPort(port);
            if (instance) instances.push(instance);
        }
        
        return instances;
    }
}
```

### 5. Distribution Architecture

#### PostInstall Pattern

```javascript
// scripts/postinstall.cjs
const fs = require('fs');
const path = require('path');

// Copy built Angular app to public_templates
const source = path.join(__dirname, '../dist');
const target = path.join(__dirname, '../../../public_templates/node-red-gamify-ui');

function copyRecursive(src, dest) {
    // Implementation follows threejs-gamify-ui pattern
}

copyRecursive(source, target);
console.log('✅ node-red-gamify-ui distributed to public_templates');
```

#### Integration with MultiUIGameManager

```typescript
// Integration point
class MultiUIGameManager {
    constructor() {
        this.registerUI('node-red-alephscript', {
            path: 'public_templates/node-red-gamify-ui',
            main: 'index.html',
            type: 'angular'
        });
    }
}
```

## 🔄 Message Flow Patterns

### 1. Basic Bot Communication

```
[Inject] → [Bot Node] → AlephScript Server → [Other Clients]
    ↓
[Debug Output]
```

### 2. Multi-Channel Orchestration

```
[Enhanced Bot] → [Orchestrator] → [Channel Router]
      ↓               ↓                ↓
  [App Format]   [Sys Format]   [UI Format]
      ↓               ↓                ↓
  [App Channel]  [Sys Channel]  [UI Channel]
      ↓               ↓                ↓
    [App DB]      [Monitor]      [UI Update]
```

### 3. Dashboard Monitoring

```
[Bot Registry] → [Real-time Data] → [Dashboard 2.0]
      ↓
[Room Tester] → [Cross-room Test] → [Results]
      ↓
[Stream Monitor] → [Message Flow] → [Analytics]
```

### 4. Cross-Room Communication

```
Bot A (Room Alpha) → [Room Tester] → Bot B (Room Beta)
        ↓                              ↓
   [Stream Monitor] ← Message Flow ← [Stream Monitor]
```

## 🏗️ Build Architecture

### TypeScript Compilation

```typescript
// tsconfig.json strategy
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}
```

### HTML Template Processing

```javascript
// Build process copies HTML templates
const htmlFiles = glob.sync('src/**/*.html');
htmlFiles.forEach(file => {
    const dest = file.replace('src/', 'dist/');
    fs.copyFileSync(file, dest);
});
```

### Angular Build Integration

```json
{
    "build": {
        "builder": "@angular-devkit/build-angular:browser",
        "options": {
            "outputPath": "dist",
            "baseHref": "/ui/",
            "deployUrl": "/ui/"
        }
    }
}
```

## 🔐 Security Architecture

### 1. Socket.IO Security

```typescript
// Server-side validation
io.use((socket, next) => {
    // Validate CLIENT_REGISTER
    if (socket.handshake.auth.clientType !== 'node-red-bot') {
        return next(new Error('Invalid client type'));
    }
    next();
});
```

### 2. Node-RED Security

```typescript
// Node validation
RED.nodes.registerType("alephscript-bot", {
    credentials: {
        serverToken: { type: "password" }
    }
});
```

### 3. Angular Security

```typescript
// CSP and CORS handling
const securityHeaders = {
    'Content-Security-Policy': "default-src 'self'",
    'X-Frame-Options': 'SAMEORIGIN'
};
```

## 📊 Performance Architecture

### 1. Connection Pooling

```typescript
class ConnectionManager {
    private pools = new Map<string, SocketPool>();
    
    getConnection(serverUrl: string): Socket {
        if (!this.pools.has(serverUrl)) {
            this.pools.set(serverUrl, new SocketPool(serverUrl));
        }
        return this.pools.get(serverUrl).getSocket();
    }
}
```

### 2. Message Batching

```typescript
class MessageBatcher {
    private queue: Message[] = [];
    private timer: NodeJS.Timeout;
    
    addMessage(msg: Message) {
        this.queue.push(msg);
        if (this.queue.length >= 10) {
            this.flush();
        }
    }
}
```

### 3. RxJS Stream Processing

```typescript
// Orchestrator pipeline
const messageStream = from(this.socketConnection)
    .pipe(
        bufferTime(100),
        map(messages => this.processeBatch(messages)),
        filter(result => result.length > 0),
        mergeMap(results => this.routeMessages(results))
    );
```

## 🔧 Development Architecture

### Hot Reload System

```javascript
// Development watching
const watcher = chokidar.watch('src/**/*.ts');
watcher.on('change', () => {
    console.log('🔄 Recompiling...');
    exec('npm run build:contrib', (error, stdout) => {
        if (!error) {
            console.log('✅ Build complete');
            exec('npm run install:node-red-auto');
        }
    });
});
```

### Testing Architecture

```typescript
// Jest testing setup
describe('AlephScript Bot Node', () => {
    let testNode: TestNode;
    let mockSocket: MockSocket;
    
    beforeEach(() => {
        testNode = new TestNode();
        mockSocket = new MockSocket();
    });
    
    it('should register with server', async () => {
        testNode.emit('input', { payload: 'test' });
        expect(mockSocket.emitted('CLIENT_REGISTER')).toBeTruthy();
    });
});
```

## 📋 Deployment Architecture

### Production Deployment

```bash
# Production build
npm run build:all

# Install to Node-RED
npm run install:node-red-auto

# Start services
npm run start:server  # AlephScript server
node-red             # Node-RED runtime
```

### Monitoring

```typescript
// Health monitoring
class SystemMonitor {
    checkHealth(): HealthStatus {
        return {
            nodeRed: this.checkNodeRed(),
            alephScript: this.checkAlephScriptServer(),
            connections: this.checkConnections(),
            performance: this.getPerformanceMetrics()
        };
    }
}
```

---

## 🎯 Architecture Summary

The Node-RED AlephScript SDK implements a **dual-library architecture** that:

1. **Extends Node-RED** with 13 specialized nodes for AlephScript integration
2. **Provides Angular UI** following the GamificationUI pattern for management
3. **Implements 3-channel protocol** (App/Sys/UI) for structured communication
4. **Enables real-time orchestration** through RxJS pipelines and Socket.IO
5. **Supports Dashboard 2.0** with monitoring and testing widgets
6. **Follows enterprise patterns** for scalability, security, and maintainability

The architecture enables seamless integration between Node-RED flows and the AlephScript ecosystem while maintaining separation of concerns and extensibility for future enhancements.

**Architecture documentation complete! 🏗️**
