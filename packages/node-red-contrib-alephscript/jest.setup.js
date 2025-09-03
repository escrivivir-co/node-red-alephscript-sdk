// Jest setup file for Node-RED contrib tests
// Mock Node-RED runtime for testing
global.RED = {
  nodes: {
    createNode: jest.fn(),
    registerType: jest.fn()
  }
};

// Mock Socket.IO client for testing
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false
  }))
}));
