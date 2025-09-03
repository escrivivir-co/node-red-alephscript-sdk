import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AlephScriptConfig, ConnectionStatus } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AlephScriptService {
  private socket: Socket | null = null;
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus>('disconnected');
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  
  private config: AlephScriptConfig = {
    serverUrl: 'http://localhost:3000',
    autoReconnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000
  };

  constructor() {}

  connect(config?: Partial<AlephScriptConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.connectionStatusSubject.next('connecting');
    
    this.socket = io(this.config.serverUrl, {
      autoConnect: true,
      reconnection: this.config.autoReconnect,
      reconnectionAttempts: this.config.reconnectAttempts,
      reconnectionDelay: this.config.reconnectDelay,
      timeout: 5000
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next('disconnected');
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ AlephScript Socket.IO connected');
      this.connectionStatusSubject.next('connected');
      
      // Register as UI wrapper
      this.emit('ui:register', {
        type: 'node-red-wrapper',
        capabilities: ['iframe-embedding', 'network-discovery', 'instance-management'],
        version: '1.0.0'
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ AlephScript Socket.IO disconnected:', reason);
      this.connectionStatusSubject.next('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 AlephScript Socket.IO connection error:', error);
      this.connectionStatusSubject.next('error');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 AlephScript Socket.IO reconnected after ${attemptNumber} attempts`);
      this.connectionStatusSubject.next('connected');
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔴 AlephScript Socket.IO reconnection error:', error);
      this.connectionStatusSubject.next('error');
    });

    // AlephScript protocol handlers
    this.socket.on('ui:command', (data) => {
      this.handleUICommand(data);
    });

    this.socket.on('wrapper:focus-instance', (data) => {
      this.handleFocusInstance(data);
    });

    this.socket.on('wrapper:refresh-discovery', () => {
      this.handleRefreshDiscovery();
    });
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, handler: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  off(event: string, handler?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  private handleUICommand(data: any): void {
    console.log('📨 Received UI command:', data);
    
    switch (data.command) {
      case 'show-instance':
        this.broadcastInstanceFocus(data.instanceId);
        break;
      case 'refresh-instances':
        this.broadcastRefreshRequest();
        break;
      case 'toggle-view':
        this.broadcastViewToggle(data.view);
        break;
      default:
        console.warn('Unknown UI command:', data.command);
    }
  }

  private handleFocusInstance(data: any): void {
    console.log('🎯 Focus instance request:', data);
    this.broadcastInstanceFocus(data.instanceId);
  }

  private handleRefreshDiscovery(): void {
    console.log('🔄 Refresh discovery request');
    this.broadcastRefreshRequest();
  }

  // UI wrapper specific methods
  notifyInstanceDiscovered(instance: any): void {
    this.emit('wrapper:instance-discovered', {
      instance,
      timestamp: new Date().toISOString()
    });
  }

  notifyInstanceOffline(instanceId: string): void {
    this.emit('wrapper:instance-offline', {
      instanceId,
      timestamp: new Date().toISOString()
    });
  }

  notifyInstanceFocused(instanceId: string, view: 'editor' | 'ui'): void {
    this.emit('wrapper:instance-focused', {
      instanceId,
      view,
      timestamp: new Date().toISOString()
    });
  }

  requestGameUI(gameId: string): void {
    this.emit('game:request-ui', {
      gameId,
      wrapperType: 'node-red',
      timestamp: new Date().toISOString()
    });
  }

  // Event broadcasting for internal communication
  private broadcastInstanceFocus(instanceId: string): void {
    // This would be handled by a component listening service
    window.dispatchEvent(new CustomEvent('aleph:focus-instance', {
      detail: { instanceId }
    }));
  }

  private broadcastRefreshRequest(): void {
    window.dispatchEvent(new CustomEvent('aleph:refresh-discovery'));
  }

  private broadcastViewToggle(view: string): void {
    window.dispatchEvent(new CustomEvent('aleph:toggle-view', {
      detail: { view }
    }));
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatusSubject.value;
  }

  isConnected(): boolean {
    return this.socket?.connected === true;
  }

  getCurrentConfig(): AlephScriptConfig {
    return { ...this.config };
  }
}
