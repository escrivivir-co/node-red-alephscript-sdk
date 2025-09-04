# Node Reference - AlephScript Nodes

Complete reference documentation for all 13 Node-RED AlephScript nodes.

## 📋 Node Categories

### 🤖 Bot Nodes
- [alephscript-bot](#alephscript-bot) - Basic AlephScript bot
- [alephscript-enhanced-bot](#alephscript-enhanced-bot) - Enhanced bot with advanced features

### 📡 Channel Nodes
- [alephscript-app-channel](#alephscript-app-channel) - Application channel
- [alephscript-sys-channel](#alephscript-sys-channel) - System channel
- [alephscript-ui-channel](#alephscript-ui-channel) - User interface channel

### 🔄 Format Nodes
- [alephscript-app-format](#alephscript-app-format) - App message formatter
- [alephscript-sys-format](#alephscript-sys-format) - System message formatter
- [alephscript-ui-format](#alephscript-ui-format) - UI message formatter

### 🎛️ Orchestration Nodes
- [alephscript-orchestrator](#alephscript-orchestrator) - Message orchestrator
- [alephscript-config](#alephscript-config) - Configuration node

### 📊 Dashboard Nodes
- [alephscript-bot-registry](#alephscript-bot-registry) - Bot registry widget
- [alephscript-room-tester](#alephscript-room-tester) - Room testing widget
- [alephscript-stream-monitor](#alephscript-stream-monitor) - Stream monitoring widget

---

## 🤖 Bot Nodes

### alephscript-bot

Basic AlephScript bot node that connects to the AlephScript server.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Namespace** | string | `"/runtime"` | Socket.IO namespace |
| **Bot Name** | string | `"NodeRedBot"` | Unique bot identifier |
| **Auto Connect** | boolean | `true` | Connect automatically on deploy |

#### Inputs

- **msg.payload**: Any message to send to the server
- **msg.topic**: Optional message topic
- **msg.room**: Target room (optional, uses bot's default room if not specified)

#### Outputs

- **Output 1**: Server responses and connection events

#### Usage Example

```javascript
// Send a message
msg.payload = {
    type: "test_message",
    data: "Hello AlephScript!"
};
return msg;
```

#### Connection Protocol

The bot automatically:
1. Connects to the specified server
2. Sends `CLIENT_REGISTER` with bot name
3. Receives room assignment
4. Maintains connection with heartbeat

---

### alephscript-enhanced-bot

Advanced bot with multiple output channels and enhanced features.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Bot Name** | string | `"EnhancedBot"` | Unique bot identifier |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Namespace** | string | `"/runtime"` | Socket.IO namespace |
| **Auto Connect** | boolean | `true` | Connect automatically on deploy |
| **Features** | array | `["CLIENT_REGISTER"]` | Bot feature set |

#### Features Options

- `CLIENT_REGISTER` - Basic registration
- `ROOM_MANAGEMENT` - Room join/leave capabilities
- `CROSS_ROOM_COMM` - Cross-room communication
- `ORCHESTRATION` - Advanced orchestration features
- `MONITORING` - Performance monitoring

#### Inputs

- **msg.payload**: Message data
- **msg.channel**: Target channel (`app`, `sys`, `ui`, or `debug`)
- **msg.room**: Target room (optional)

#### Outputs

- **Output 1**: App channel messages
- **Output 2**: Sys channel messages  
- **Output 3**: UI channel messages
- **Output 4**: Debug and connection events

#### Usage Example

```javascript
// Send to specific channel
msg.channel = "app";
msg.payload = {
    type: "state_transition",
    from: "idle",
    to: "running"
};
return msg;
```

---

## 📡 Channel Nodes

### alephscript-app-channel

Handles application-level messages and state management.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Namespace** | string | `"/app"` | App channel namespace |
| **State Filters** | array | `["*"]` | Allowed state types |
| **Action Filters** | array | `["*"]` | Allowed action types |

#### State Filters Options

- `initial` - Initial state
- `running` - Running state
- `completed` - Completed state
- `error` - Error state
- `paused` - Paused state
- `*` - All states

#### Action Filters Options

- `get_state` - Get current state
- `set_state` - Set new state
- `reset_state` - Reset to initial
- `transition` - State transition
- `*` - All actions

#### Inputs

- **msg.payload**: App message data
- **msg.appState**: State information
- **msg.appAction**: Action to perform

#### Outputs

- **Output 1**: Processed app messages
- **Output 2**: State change notifications
- **Output 3**: Action responses

#### Message Format

```javascript
// App Message Structure
{
    type: "state_transition",
    appState: "running",
    appAction: "start_process",
    data: {
        processId: "proc_001",
        parameters: {...}
    },
    timestamp: "2025-09-04T10:30:00Z"
}
```

---

### alephscript-sys-channel

Handles system-level messages, health monitoring, and error reporting.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Namespace** | string | `"/sys"` | System channel namespace |
| **Health Monitoring** | boolean | `true` | Enable health checks |
| **Error Reporting** | boolean | `true` | Enable error reporting |
| **Monitor Services** | array | `["*"]` | Services to monitor |

#### Inputs

- **msg.payload**: System message data
- **msg.serviceId**: Service identifier
- **msg.severity**: Error severity (`low`, `medium`, `high`, `critical`)

#### Outputs

- **Output 1**: System messages
- **Output 2**: Health status updates
- **Output 3**: Error reports

#### Health Monitoring

Automatically monitors:
- Memory usage
- CPU usage
- Uptime
- Connection status
- Service health

#### Message Format

```javascript
// System Message Structure
{
    type: "health_check",
    serviceId: "database",
    status: "healthy",
    metrics: {
        cpu: 25.5,
        memory: 512,
        uptime: 3600
    },
    timestamp: "2025-09-04T10:30:00Z"
}
```

---

### alephscript-ui-channel

Handles user interface messages, notifications, and phase changes.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Namespace** | string | `"/ui"` | UI channel namespace |
| **Notification Types** | array | `["*"]` | Allowed notification types |
| **Phase Tracking** | boolean | `true` | Enable phase change tracking |

#### Notification Types Options

- `info` - Information messages
- `warning` - Warning messages
- `error` - Error messages
- `success` - Success messages
- `progress` - Progress updates
- `*` - All types

#### Inputs

- **msg.payload**: UI message data
- **msg.component**: UI component identifier
- **msg.displayType**: How to display the message

#### Outputs

- **Output 1**: UI messages
- **Output 2**: Notification events
- **Output 3**: Phase change events

#### Message Format

```javascript
// UI Message Structure
{
    type: "notification",
    notificationType: "info",
    component: "main_dashboard", 
    displayType: "toast",
    message: "Process completed successfully",
    duration: 5000,
    timestamp: "2025-09-04T10:30:00Z"
}
```

---

## 🔄 Format Nodes

### alephscript-app-format

Formats messages for the app channel with predefined templates.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Message Type** | select | `"state_transition"` | Message template type |
| **Custom Template** | boolean | `false` | Use custom template |

#### Message Types

- `state_transition` - State change messages
- `action_request` - Action request messages
- `data_update` - Data update messages
- `custom` - Custom message format

#### Inputs

- **msg.payload**: Data to format
- **msg.template**: Override template (if custom enabled)

#### Outputs

- **Output 1**: Formatted app message

---

### alephscript-sys-format

Formats messages for the system channel with health and error templates.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Message Type** | select | `"health_check"` | Message template type |
| **Auto Timestamp** | boolean | `true` | Add automatic timestamp |

#### Message Types

- `health_check` - Health status messages
- `error` - Error report messages
- `warning` - Warning messages
- `metric` - Performance metric messages

---

### alephscript-ui-format

Formats messages for the UI channel with notification and display templates.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Message Type** | select | `"notification"` | Message template type |
| **Default Duration** | number | `5000` | Default notification duration |

#### Message Types

- `notification` - User notifications
- `display_update` - UI updates
- `phase_change` - Phase transitions
- `user_action` - User interaction events

---

## 🎛️ Orchestration Nodes

### alephscript-orchestrator

Central message routing and orchestration hub.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Display name for the node |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Namespace** | string | `"/runtime"` | Socket.IO namespace |
| **Enable Pipeline** | boolean | `true` | Enable RxJS pipeline |
| **Cross Channel** | boolean | `true` | Enable cross-channel routing |
| **Routing Rules** | array | `[]` | Message routing rules |

#### Routing Rules Format

```javascript
{
    from: "app",           // Source channel
    to: "sys",            // Target channel  
    condition: "error",   // Routing condition
    transform: "..."      // Optional transform function
}
```

#### Inputs

- **msg.payload**: Message to route
- **msg.channel**: Source channel
- **msg.route**: Override routing rules

#### Outputs

- **Output 1**: Routed messages
- **Output 2**: Routing metadata
- **Output 3**: Pipeline statistics

#### Pipeline Features

- **RxJS Streams**: Reactive message processing
- **Message Transformation**: Format conversion
- **Conditional Routing**: Rule-based routing
- **Performance Metrics**: Processing statistics

---

### alephscript-config

Shared configuration node for connection settings.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Configuration name |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Connection Timeout** | number | `5000` | Connection timeout (ms) |
| **Reconnect** | boolean | `true` | Auto-reconnect on disconnect |
| **Max Reconnects** | number | `5` | Maximum reconnection attempts |

#### Usage

Other nodes can reference this config node to share connection settings.

---

## 📊 Dashboard Nodes

### alephscript-bot-registry

Dashboard widget for bot registration and monitoring.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Widget name |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Refresh Interval** | number | `5000` | Update interval (ms) |
| **Show Offline** | boolean | `true` | Show offline bots |
| **Enable Control** | boolean | `true` | Enable bot control |

#### Features

- Real-time bot status monitoring
- Bot registration/deregistration
- Connection status indicators
- Performance metrics display

#### Outputs

- **Output 1**: Bot registry events
- **Output 2**: Status changes
- **Output 3**: Control actions

---

### alephscript-room-tester

Dashboard widget for testing room operations and cross-communication.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Widget name |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Monitor Rooms** | array | `[]` | Rooms to monitor |
| **Enable Cross Room** | boolean | `true` | Enable cross-room features |

#### Features

- Room join/leave testing
- Cross-room message testing
- Room activity monitoring
- Message flow visualization

#### Outputs

- **Output 1**: Room events
- **Output 2**: Cross-room messages
- **Output 3**: Activity metrics

---

### alephscript-stream-monitor

Dashboard widget for real-time stream monitoring.

#### Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Name** | string | `""` | Widget name |
| **Server URL** | string | `"http://localhost:3000"` | AlephScript server URL |
| **Monitor Types** | array | `["all"]` | Message types to monitor |
| **Max Messages** | number | `100` | Maximum messages to display |
| **Auto Cleanup** | boolean | `true` | Auto-cleanup old messages |

#### Features

- Real-time message stream display
- Message filtering by type/channel
- Performance analytics
- Stream health monitoring

#### Outputs

- **Output 1**: Stream messages
- **Output 2**: Analytics data
- **Output 3**: Health metrics

---

## 🔧 Common Patterns

### Basic Bot Setup

```javascript
// 1. Deploy alephscript-bot node
// 2. Configure server URL: http://localhost:3000
// 3. Set bot name: "MyBot"
// 4. Connect debug node to output
// 5. Deploy and test
```

### Multi-Channel Flow

```javascript
// 1. Deploy enhanced-bot node
// 2. Connect app-channel to output 1
// 3. Connect sys-channel to output 2  
// 4. Connect ui-channel to output 3
// 5. Connect debug to output 4
```

### Dashboard Monitoring

```javascript
// 1. Deploy bot-registry widget
// 2. Deploy room-tester widget
// 3. Deploy stream-monitor widget
// 4. Configure all to same server
// 5. View dashboard at /dashboard
```

### Message Formatting

```javascript
// 1. Use inject node with payload
// 2. Connect to format node (app/sys/ui)
// 3. Connect format output to channel node
// 4. Configure message type in format node
```

---

## 🐛 Troubleshooting

### Node Not Connecting

1. Check server URL configuration
2. Verify AlephScript server is running
3. Check network connectivity
4. Review Node-RED logs

### Messages Not Routing

1. Verify channel configuration
2. Check message format
3. Review routing rules
4. Monitor debug output

### Dashboard Not Loading

1. Install Dashboard 2.0: `npm install @flowfuse/node-red-dashboard`
2. Restart Node-RED
3. Check dashboard URL: `/dashboard`
4. Verify widget configuration

---

## 📚 Additional Resources

- **Installation Guide**: [INSTALLATION.md](INSTALLATION.md)
- **Examples**: [examples/README.md](examples/README.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **AlephScript Protocol**: See socket-gym documentation

---

**Complete node reference for Node-RED AlephScript SDK! 🎯**
