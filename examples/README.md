# Node-RED AlephScript Examples

This directory contains comprehensive examples demonstrating the capabilities of the Node-RED AlephScript SDK.

## 📁 Flow Examples

### 1. **Basic Bot Connection** (`01-basic-bot-connection.json`)
**Difficulty:** Beginner
**Components:** Bot Node, Debug, Inject

Simple bot connection demonstrating:
- Basic AlephScript client setup
- Server connection (localhost:3000)
- Message sending and receiving
- Debug output monitoring

**Setup:**
1. Ensure AlephScript server is running on port 3000
2. Import the flow into Node-RED
3. Deploy and check debug messages
4. Use inject button to send test messages

---

### 2. **Multi-Channel Bot** (`02-multi-channel-bot.json`)
**Difficulty:** Intermediate
**Components:** Enhanced Bot, App/Sys/UI Channels, Format Nodes

Multi-channel architecture demonstrating:
- Enhanced bot with multiple features
- Separate App, Sys, and UI channels
- Format nodes for each channel type
- Independent message processing

**Features:**
- **App Channel**: State management (initial, running, completed)
- **Sys Channel**: Health monitoring and error reporting
- **UI Channel**: User notifications and phase tracking

---

### 3. **Orchestrator Pipeline** (`03-orchestrator-pipeline.json`)
**Difficulty:** Advanced
**Components:** Orchestrator, Pipeline Processing, Routing

Message orchestration demonstrating:
- Central message routing hub
- Cross-channel message processing
- Pipeline transformations and rules
- Metrics collection and monitoring

**Routing Rules:**
- App errors → Sys channel
- Sys status updates → UI channel
- Priority-based message processing

---

### 4. **Cross-Room Communication** (`04-cross-room-communication.json`)
**Difficulty:** Advanced
**Components:** Multiple Bots, Room Tester, Stream Monitor

Multi-room bot communication demonstrating:
- Bot Alpha (room: "alpha")
- Bot Beta (room: "beta")
- Cross-room message routing
- Room join/leave operations
- Communication monitoring

**Use Cases:**
- Multi-environment coordination
- Service-to-service communication
- Distributed system messaging

---

### 5. **Dashboard Monitoring** (`05-dashboard-monitoring.json`)
**Difficulty:** Intermediate
**Components:** Dashboard 2.0 Widgets, Analytics

Real-time monitoring dashboard demonstrating:
- Bot registry with live status
- Room activity monitoring
- Stream analytics and charts
- Configuration management
- Data simulation for testing

**Dashboard Features:**
- Real-time bot status charts
- Room activity visualization
- Message stream analytics
- Performance metrics

---

### 6. **Complete System Demo** (`06-complete-system-demo.json`)
**Difficulty:** Expert
**Components:** All Node Types, Full System Integration

Comprehensive production scenario demonstrating:
- **Production Bot**: Monitoring production environment
- **Development Bot**: Managing development workflow
- **UI Management Bot**: Handling user interface
- **System Orchestrator**: Central coordination
- **Cross-room coordination**: Multi-environment messaging
- **Alert processing**: Urgent notification handling
- **Bot health monitoring**: Performance and status tracking

**Production Scenarios:**
- 🚨 Production alerts and escalation
- 🚀 Development to production deployment
- 👤 User actions and emergency procedures
- 🔄 Cross-room coordination and messaging

## 🚀 Quick Start Guide

### Prerequisites
1. **AlephScript Server**: Running on `http://localhost:3000`
2. **Node-RED**: With AlephScript nodes installed
3. **Dashboard 2.0**: For dashboard examples (flows 5-6)

### Installation Steps
1. **Install AlephScript Nodes**:
   ```bash
   cd /path/to/node-red-alephscript-sdk
   npm run install:node-red-auto
   ```

2. **Start AlephScript Server**:
   ```bash
   cd /path/to/socket-gym
   npm start
   ```

3. **Import Flows**:
   - Open Node-RED editor (usually http://localhost:1880)
   - Go to Menu → Import
   - Select the desired flow JSON file
   - Deploy the flow

### Testing Order (Recommended)
1. Start with **Basic Bot Connection** to verify setup
2. Progress to **Multi-Channel Bot** for channel understanding
3. Explore **Dashboard Monitoring** for visualization
4. Try **Cross-Room Communication** for multi-bot scenarios
5. Experiment with **Orchestrator Pipeline** for advanced routing
6. Finally, run **Complete System Demo** for full integration

## 🔧 Configuration

### Server Configuration
All examples use default AlephScript server settings:
- **URL**: `http://localhost:3000`
- **Namespace**: `/runtime`
- **Auto-connect**: Enabled

### Room Configuration
Examples use these rooms:
- `alpha`, `beta` - Basic communication rooms
- `production` - Production environment room
- `development` - Development environment room
- `ui-management` - UI coordination room
- `monitoring` - System monitoring room

### Channel Configuration
- **App Channel**: States: initial, running, completed, error
- **Sys Channel**: Health monitoring, error reporting enabled
- **UI Channel**: All notification types, phase change tracking

## 🐛 Troubleshooting

### Common Issues

1. **"Connection failed" errors**:
   - Verify AlephScript server is running on port 3000
   - Check server logs for errors
   - Ensure no firewall blocking connections

2. **Nodes not appearing in palette**:
   - Verify installation: `npm run install:node-red-auto`
   - Restart Node-RED after installation
   - Check Node-RED logs for installation errors

3. **Dashboard widgets not working**:
   - Install Dashboard 2.0: `npm install @flowfuse/node-red-dashboard`
   - Restart Node-RED
   - Check dashboard UI is accessible

4. **Cross-room messages not routing**:
   - Verify both bots are connected
   - Check room names match exactly
   - Monitor debug output for routing information

### Debug Tips

1. **Enable debug nodes**: All examples include debug nodes for monitoring
2. **Check server logs**: AlephScript server logs show connection status
3. **Monitor room activity**: Use Stream Monitor for real-time tracking
4. **Verify bot registry**: Check Bot Registry for bot status

## 📊 Understanding the Output

### Debug Message Types
- **Connection Status**: Bot connection/disconnection events
- **Channel Messages**: App/Sys/UI channel specific messages
- **Room Events**: Join/leave and cross-room communications
- **Analytics Data**: Performance metrics and statistics
- **Alert Messages**: System alerts and notifications

### Message Format
AlephScript messages follow this structure:
```json
{
  "type": "message_type",
  "timestamp": "2025-09-04T02:00:00Z",
  "source": "bot_name",
  "channel": "app|sys|ui",
  "data": { /* message payload */ }
}
```

## 🎯 Next Steps

After exploring these examples:

1. **Customize for your use case**: Modify flows to match your requirements
2. **Create your own flows**: Combine nodes in new ways
3. **Integrate with existing systems**: Connect to databases, APIs, etc.
4. **Scale the system**: Add more bots and rooms as needed
5. **Monitor in production**: Use dashboard widgets for live monitoring

## 📚 Additional Resources

- **Node Reference**: See `NODE_REFERENCE.md` for detailed node documentation
- **Architecture Guide**: See `ARCHITECTURE.md` for system design
- **Installation Guide**: See `INSTALLATION.md` for setup instructions
- **API Documentation**: Check AlephScript server documentation

---

Happy flowing with Node-RED AlephScript! 🎉
