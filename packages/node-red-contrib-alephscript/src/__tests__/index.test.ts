import { describe, test, expect } from '@jest/globals';

describe('Node-RED Contrib AlephScript', () => {
  test('package should have correct version', () => {
    const pkg = require('../../package.json');
    expect(pkg.version).toBe('0.1.0');
  });

  test('package should define Node-RED nodes', () => {
    const pkg = require('../../package.json');
    expect(pkg['node-red']).toBeDefined();
    expect(pkg['node-red'].nodes).toBeDefined();
    expect(pkg['node-red'].nodes['alephscript-bot']).toBe('dist/nodes/bot-node.js');
  });

  test('should export basic types', () => {
    // This will test the index.ts file once it's properly built
    expect(true).toBe(true); // Placeholder
  });
});
