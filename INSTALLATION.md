# Installation Guide - Node-RED AlephScript SDK

Complete installation guide for the Node-RED AlephScript SDK, including troubleshooting and setup verification.

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 8+ or yarn 1.22+
- **Node-RED**: Installed and running
- **AlephScript Server**: `socket-gym/ws-server` running on port 3000

### One-Command Installation

```bash
# Clone and install everything automatically
git clone https://github.com/escrivivir-co/node-red-alephscript-sdk.git
cd node-red-alephscript-sdk
npm install
npm run install:node-red-auto
```

**✅ This will automatically detect your Node-RED directory and install all 13 AlephScript nodes!**

---

## 📋 Detailed Installation Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/escrivivir-co/node-red-alephscript-sdk.git
cd node-red-alephscript-sdk
```

### Step 2: Install Dependencies

```bash
# Install root dependencies and build all packages
npm install

# This automatically runs:
# - npm run install:all (installs package dependencies)
# - npm run build:all (builds both contrib and UI packages)
```

### Step 3: Install to Node-RED

#### Option A: Automatic Detection (Recommended)

```bash
npm run install:node-red-auto
```

This script:
1. Builds the contrib package
2. Detects your Node-RED directory (`~/.node-red`)
3. Installs the package automatically
4. Shows success/error messages

#### Option B: Manual Installation

```bash
# Build the contrib package
npm run build:contrib

# Install to Node-RED manually
cd ~/.node-red
npm install /path/to/node-red-alephscript-sdk/packages/node-red-contrib-alephscript
```

#### Option C: Windows-Specific

```bash
npm run install:node-red-win
```

### Step 4: Restart Node-RED

```bash
# Stop Node-RED (Ctrl+C if running in terminal)
# Then restart
node-red
```

### Step 5: Verify Installation

1. Open Node-RED editor: `http://localhost:1880`
2. Check the node palette - you should see **13 AlephScript nodes**:
   - Bot nodes (2)
   - Channel nodes (3) 
   - Format nodes (3)
   - Orchestrator (1)
   - Dashboard widgets (3)
   - Config node (1)

---

## 🛠️ Development Installation

For development and contribution:

```bash
# Clone repository
git clone https://github.com/escrivivir-co/node-red-alephscript-sdk.git
cd node-red-alephscript-sdk

# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build and install changes
npm run build:contrib && npm run install:node-red-auto
```

### Development Scripts

```bash
# Individual package development
npm run dev:contrib          # Node-RED contrib package
npm run dev:ui              # Angular UI package

# Building
npm run build:all           # Build both packages
npm run build:contrib       # Build only contrib package
npm run build:ui            # Build only UI package

# Testing
npm run test:all            # Run all tests
npm run test:contrib        # Test contrib package
npm run test:ui             # Test UI package

# Linting
npm run lint:all            # Lint all packages
npm run lint:fix:all        # Auto-fix linting issues

# Cleaning
npm run clean:all           # Clean all build directories
```

---

## 🔧 AlephScript Server Setup

The Node-RED nodes require an AlephScript server to connect to:

### Option 1: Use socket-gym (Recommended)

```bash
# In a separate terminal
cd /path/to/socket-gym
npm install
npm start

# Server will be available at http://localhost:3000
```

### Option 2: Use your own AlephScript server

Ensure your server:
- Runs on port 3000 (or configure nodes with different URL)
- Supports Socket.IO with namespace `/runtime`
- Implements AlephScript protocol (CLIENT_REGISTER, rooms, etc.)

---

## 🧪 Testing Your Installation

### 1. Import Example Flow

1. Open Node-RED editor (`http://localhost:1880`)
2. Go to Menu → Import
3. Select `examples/flows/01-basic-bot-connection.json`
4. Click Deploy

### 2. Test Basic Connection

1. Ensure AlephScript server is running on port 3000
2. Click the "Connect Bot" inject button
3. Check debug output - you should see connection messages

### 3. Test Dashboard Widgets

1. Import `examples/flows/05-dashboard-monitoring.json`
2. Deploy the flow
3. Go to `http://localhost:1880/dashboard`
4. You should see real-time monitoring widgets

---

## 🐛 Troubleshooting

### Common Issues

#### "AlephScript nodes not appearing in palette"

**Solution:**
```bash
# Verify installation
cd ~/.node-red
npm list | grep alephscript

# If not found, reinstall
cd /path/to/node-red-alephscript-sdk
npm run install:node-red-auto

# Restart Node-RED
```

#### "Connection failed to AlephScript server"

**Solution:**
1. Verify AlephScript server is running: `curl http://localhost:3000`
2. Check server logs for errors
3. Verify port 3000 is not blocked by firewall
4. Try different server URL in node configuration

#### "Build errors during installation"

**Solution:**
```bash
# Clean and rebuild
npm run clean:all
npm install
npm run build:all

# Check Node.js version
node --version  # Should be 18+
```

#### "Permission errors on Windows"

**Solution:**
```bash
# Run as administrator or use:
npm config set prefix C:\\Users\\%USERNAME%\\AppData\\Roaming\\npm
```

#### "Dashboard widgets not working"

**Solution:**
```bash
# Install Dashboard 2.0 if not installed
cd ~/.node-red
npm install @flowfuse/node-red-dashboard

# Restart Node-RED
```

### Debug Information

To get debug information:

```bash
# Check installation status
cd ~/.node-red
npm list node-red-contrib-alephscript

# Check Node-RED logs
# Look in Node-RED console output for errors

# Check package build
cd /path/to/node-red-alephscript-sdk
npm run build:contrib 2>&1 | tee build.log
```

### Getting Help

1. **Check examples**: Review `examples/flows/` and `examples/README.md`
2. **Check logs**: Node-RED console output often shows the issue
3. **Verify server**: Ensure AlephScript server is running and accessible
4. **Clean install**: Delete `node_modules` and reinstall if issues persist

---

## 🔄 Uninstallation

To remove the AlephScript nodes:

```bash
cd ~/.node-red
npm uninstall node-red-contrib-alephscript

# Restart Node-RED to remove nodes from palette
```

---

## 📦 Package Information

- **Main Package**: `node-red-alephscript-sdk`
- **Contrib Package**: `packages/node-red-contrib-alephscript`
- **UI Package**: `packages/node-red-gamify-ui`
- **Node Count**: 13 total nodes
- **Dependencies**: Socket.IO client, TypeScript, Angular 17+

## 🔗 Additional Resources

- **Examples**: [examples/README.md](examples/README.md)
- **Node Reference**: [NODE_REFERENCE.md](NODE_REFERENCE.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Installation complete! Start building your AlephScript flows! 🎉**
