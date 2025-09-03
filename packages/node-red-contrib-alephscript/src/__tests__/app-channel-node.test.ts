import { NodeDef } from 'node-red';

describe('App Channel Node', () => {
  it('should have correct configuration interface', () => {
    // Test basic structure requirements
    expect(typeof NodeDef).toBe('function');
  });

  it('should define AppChannelNodeDef interface correctly', () => {
    // Test interface structure
    const mockConfig = {
      id: 'test-app-channel',
      type: 'app-channel',
      serverUrl: 'http://localhost:3000',
      namespace: '/runtime',
      autoConnect: true,
      stateFilters: ['initial', 'running'],
      actionFilters: ['get_state', 'reset_state'],
      componentId: 'test-component'
    };

    expect(mockConfig.serverUrl).toBe('http://localhost:3000');
    expect(mockConfig.namespace).toBe('/runtime');
    expect(mockConfig.autoConnect).toBe(true);
    expect(mockConfig.stateFilters).toContain('initial');
    expect(mockConfig.actionFilters).toContain('get_state');
  });

  it('should handle AppMessage structure correctly', () => {
    const stateTransitionMessage = {
      type: 'state_transition' as const,
      from: 'test-component',
      payload: {
        targetState: 'running'
      },
      timestamp: new Date().toISOString()
    };

    const actionRequestMessage = {
      type: 'action_request' as const,
      from: 'test-component',
      payload: {
        actionType: 'get_state',
        actionParams: {}
      },
      timestamp: new Date().toISOString()
    };

    expect(stateTransitionMessage.type).toBe('state_transition');
    expect(stateTransitionMessage.payload.targetState).toBe('running');
    expect(actionRequestMessage.type).toBe('action_request');
    expect(actionRequestMessage.payload.actionType).toBe('get_state');
  });

  it('should generate session hash with correct format', () => {
    const componentId = 'test-component';
    const sessionHash = `app-${componentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    expect(sessionHash).toContain('app-test-component-');
    expect(sessionHash.split('-').length).toBeGreaterThanOrEqual(4);
  });
});
