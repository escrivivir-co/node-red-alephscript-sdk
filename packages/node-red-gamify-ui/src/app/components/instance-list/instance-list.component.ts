import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DiscoveryService } from '../../services/discovery.service';
import { AlephScriptService } from '../../services/aleph-script.service';
import { NodeRedInstance, ConnectionStatus } from '../../models/interfaces';
import { IframeViewerComponent } from '../iframe-viewer/iframe-viewer.component';

@Component({
  selector: 'app-instance-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    IframeViewerComponent
  ],
  template: `
    <div class="instance-list-container">
      <!-- Header with discovery controls -->
      <mat-card class="discovery-header">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>router</mat-icon>
            Node-RED Discovery
          </mat-card-title>
          <mat-card-subtitle>
            Found {{ instances.length }} instances
          </mat-card-subtitle>
          <div class="header-actions">
            <button mat-button 
                    color="accent" 
                    (click)="quickScan()"
                    [disabled]="isScanning">
              <mat-icon>flash_on</mat-icon>
              {{ isScanning ? 'Scanning...' : 'Quick Scan' }}
            </button>
            <button mat-button 
                    color="primary" 
                    (click)="refreshDiscovery()"
                    [disabled]="isScanning">
              <mat-icon>refresh</mat-icon>
              {{ isScanning ? 'Scanning...' : 'Full Scan' }}
            </button>
            <button mat-button 
                    color="accent" 
                    (click)="testNodeRedConnection()">
              <mat-icon>network_check</mat-icon>
              Test Connection
            </button>
            <mat-slide-toggle 
              [(ngModel)]="autoDiscovery"
              (change)="toggleAutoDiscovery($event)"
              color="primary">
              Auto Discovery
            </mat-slide-toggle>
          </div>
        </mat-card-header>
      </mat-card>

      <!-- AlephScript Connection Status -->
      <mat-card class="connection-status" *ngIf="alephScriptStatus !== 'disconnected'">
        <mat-card-content>
          <div class="status-indicator">
            <mat-icon [color]="getStatusColor()">{{ getStatusIcon() }}</mat-icon>
            <span>AlephScript {{ alephScriptStatus }}</span>
            <button mat-button 
                    size="small" 
                    (click)="toggleAlephScript()"
                    [color]="alephScriptStatus === 'connected' ? 'warn' : 'primary'">
              {{ alephScriptStatus === 'connected' ? 'Disconnect' : 'Connect' }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Instance grid -->
      <div class="instances-grid" *ngIf="instances.length > 0">
        <mat-card 
          *ngFor="let instance of instances" 
          class="instance-card"
          [class.online]="instance.status === 'online'"
          [class.offline]="instance.status === 'offline'"
          [class.checking]="instance.status === 'checking'">
          
          <mat-card-header>
            <mat-icon mat-card-avatar [color]="instance.status === 'online' ? 'primary' : 'warn'">
              {{ instance.status === 'online' ? 'router' : 'router_outlined' }}
            </mat-icon>
            <mat-card-title>{{ instance.name }}</mat-card-title>
            <mat-card-subtitle>
              {{ instance.host }}:{{ instance.port }}
              <div class="status-chips">
                <span class="chip" [class]="instance.status === 'online' ? 'chip-primary' : 'chip-warn'">
                  {{ instance.status }}
                </span>
                <span *ngIf="instance.version" class="chip chip-accent">
                  v{{ instance.version }}
                </span>
                <span *ngIf="instance.hasUI" class="chip chip-primary">
                  Dashboard
                </span>
              </div>
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <div class="instance-info">
              <div class="info-row" *ngIf="instance.lastSeen">
                <mat-icon>schedule</mat-icon>
                <span>Last seen: {{ instance.lastSeen | date:'short' }}</span>
              </div>
              <div class="info-row" *ngIf="instance.flows !== undefined">
                <mat-icon>account_tree</mat-icon>
                <span>{{ instance.flows }} flows</span>
              </div>
              <div class="info-row" *ngIf="instance.nodes !== undefined">
                <mat-icon>circle</mat-icon>
                <span>{{ instance.nodes }} nodes</span>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions align="end">
            <button mat-button 
                    (click)="openEditor(instance)"
                    [disabled]="instance.status !== 'online'"
                    color="primary">
              <mat-icon>edit</mat-icon>
              Editor
            </button>
            <button mat-button 
                    (click)="openDashboard(instance)"
                    [disabled]="instance.status !== 'online' || !instance.hasUI"
                    color="accent">
              <mat-icon>dashboard</mat-icon>
              Dashboard
            </button>
            <button mat-icon-button 
                    (click)="refreshInstance(instance)"
                    [disabled]="instance.status === 'checking'"
                    matTooltip="Refresh status">
              <mat-icon>refresh</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Empty state -->
      <mat-card class="empty-state" *ngIf="instances.length === 0 && !isScanning">
        <mat-card-content>
          <mat-icon>search_off</mat-icon>
          <h3>No Node-RED instances found</h3>
          <p>Make sure Node-RED is running on your local network and try refreshing discovery.</p>
          <button mat-raised-button color="primary" (click)="refreshDiscovery()">
            <mat-icon>refresh</mat-icon>
            Start Discovery
          </button>
        </mat-card-content>
      </mat-card>

      <!-- Selected instance viewer -->
      <app-iframe-viewer 
        *ngIf="selectedInstance"
        [instance]="selectedInstance"
        [viewType]="selectedViewType"
        (close)="closeViewer()"
        (viewChange)="onViewChange($event)">
      </app-iframe-viewer>
    </div>
  `,
  styles: [`
    .instance-list-container {
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .discovery-header {
      margin-bottom: 16px;
    }

    .discovery-header mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .connection-status {
      margin-bottom: 16px;
      background: #f5f5f5;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .instances-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .instance-card {
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .instance-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.12);
    }

    .instance-card.online {
      border-left: 4px solid #4caf50;
    }

    .instance-card.offline {
      border-left: 4px solid #f44336;
      opacity: 0.7;
    }

    .instance-card.checking {
      border-left: 4px solid #ff9800;
    }

    .status-chips {
      margin-top: 8px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .chip-primary {
      background: #1976d2;
      color: white;
    }

    .chip-accent {
      background: #ff4081;
      color: white;
    }

    .chip-warn {
      background: #f44336;
      color: white;
    }

    .instance-info {
      margin: 8px 0;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
      font-size: 0.9rem;
      color: #666;
    }

    .info-row mat-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      margin-top: 32px;
    }

    .empty-state mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 16px 0 8px 0;
      color: #666;
    }

    .empty-state p {
      color: #999;
      margin-bottom: 24px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class InstanceListComponent implements OnInit, OnDestroy {
  instances: NodeRedInstance[] = [];
  selectedInstance: NodeRedInstance | null = null;
  selectedViewType: 'editor' | 'ui' = 'editor';
  isScanning = false;
  autoDiscovery = true;
  alephScriptStatus: ConnectionStatus = 'disconnected';
  
  private destroy$ = new Subject<void>();

  constructor(
    private discoveryService: DiscoveryService,
    private alephScriptService: AlephScriptService
  ) {}

  ngOnInit(): void {
    console.log('🎮 InstanceListComponent initialized');
    
    // Subscribe to discovered instances
    this.discoveryService.instances$
      .pipe(takeUntil(this.destroy$))
      .subscribe(instances => {
        console.log('📡 Received instances update:', instances.length, 'instances');
        console.log('📋 Instance details:', instances.map(i => `${i.id} (${i.status}) v${i.version}`));
        this.instances = [...instances]; // Create new array reference for change detection
        this.notifyAlephScript(instances);
      });
    
    // Subscribe to AlephScript connection status
    this.alephScriptService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('🔌 AlephScript status changed:', status);
        this.alephScriptStatus = status;
      });

    // Listen for AlephScript events
    this.setupAlephScriptListeners();

    // Auto-connect to AlephScript
    setTimeout(() => {
      this.alephScriptService.connect();
    }, 1000);
    
    // Force initial discovery after component loads
    setTimeout(() => {
      console.log('🚀 Triggering initial quick scan from component');
      this.discoveryService.quickScanFavorites();
    }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAlephScriptListeners(): void {
    // Listen for external focus requests
    window.addEventListener('aleph:focus-instance', (event: any) => {
      const instanceId = event.detail.instanceId;
      const instance = this.instances.find(i => i.id === instanceId);
      if (instance) {
        this.openEditor(instance);
      }
    });

    // Listen for refresh requests
    window.addEventListener('aleph:refresh-discovery', () => {
      this.refreshDiscovery();
    });

    // Listen for view toggle requests
    window.addEventListener('aleph:toggle-view', (event: any) => {
      if (this.selectedInstance) {
        this.selectedViewType = event.detail.view === 'ui' ? 'ui' : 'editor';
      }
    });
  }

  private notifyAlephScript(instances: NodeRedInstance[]): void {
    // Notify AlephScript about discovered instances
    instances.forEach(instance => {
      if (instance.status === 'online') {
        this.alephScriptService.notifyInstanceDiscovered(instance);
      } else if (instance.status === 'offline') {
        this.alephScriptService.notifyInstanceOffline(instance.id);
      }
    });
  }

  quickScan(): void {
    console.log('⚡ Manual quick scan triggered');
    this.isScanning = true;
    
    this.discoveryService.quickScanFavorites()
      .then(() => {
        console.log('✅ Quick scan completed');
        this.isScanning = false;
      })
      .catch((error) => {
        console.error('❌ Quick scan failed:', error);
        this.isScanning = false;
      });
  }

  refreshDiscovery(): void {
    console.log('🔄 Manual refresh discovery triggered');
    this.isScanning = true;
    
    // Primero hacer un quick scan de favoritos para respuesta rápida
    console.log('⚡ Starting quick scan for immediate feedback...');
    
    this.discoveryService.quickScanFavorites()
      .then(() => {
        console.log('✅ Quick scan completed, starting full scan...');
        // Luego hacer el scan completo
        return this.discoveryService.scanNetwork();
      })
      .then(() => {
        console.log('✅ Full discovery scan completed');
        this.isScanning = false;
      })
      .catch((error) => {
        console.error('❌ Discovery scan failed:', error);
        this.isScanning = false;
      });
  }

  testNodeRedConnection(): void {
    console.log('🧪 Testing direct Node-RED connection...');
    
    // Test direct connection to known Node-RED instance
    const testUrl = 'http://127.0.0.1:1880/settings';
    
    fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(response => {
      console.log('✅ Direct fetch response:', response);
      return response.json();
    })
    .then(data => {
      console.log('✅ Node-RED settings data:', data);
      alert(`✅ Connection successful! Node-RED version: ${data.version}`);
    })
    .catch(error => {
      console.error('❌ Direct fetch failed:', error);
      alert(`❌ Connection failed: ${error.message}`);
    });
  }

  toggleAutoDiscovery(event: any): void {
    this.autoDiscovery = event.checked;
    // Could implement auto-discovery intervals here
  }

  refreshInstance(instance: NodeRedInstance): void {
    this.discoveryService.refreshInstance(instance.id).subscribe(
      refreshed => {
        if (refreshed) {
          console.log('Instance refreshed:', refreshed);
        }
      }
    );
  }

  openEditor(instance: NodeRedInstance): void {
    this.selectedInstance = instance;
    this.selectedViewType = 'editor';
    this.alephScriptService.notifyInstanceFocused(instance.id, 'editor');
  }

  openDashboard(instance: NodeRedInstance): void {
    this.selectedInstance = instance;
    this.selectedViewType = 'ui';
    this.alephScriptService.notifyInstanceFocused(instance.id, 'ui');
  }

  closeViewer(): void {
    this.selectedInstance = null;
  }

  onViewChange(viewType: 'editor' | 'ui'): void {
    this.selectedViewType = viewType;
    if (this.selectedInstance) {
      this.alephScriptService.notifyInstanceFocused(this.selectedInstance.id, viewType);
    }
  }

  toggleAlephScript(): void {
    if (this.alephScriptStatus === 'connected') {
      this.alephScriptService.disconnect();
    } else {
      this.alephScriptService.connect();
    }
  }

  getStatusColor(): string {
    switch (this.alephScriptStatus) {
      case 'connected': return 'primary';
      case 'connecting': case 'reconnecting': return 'accent';
      case 'error': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(): string {
    switch (this.alephScriptStatus) {
      case 'connected': return 'wifi';
      case 'connecting': case 'reconnecting': return 'wifi_tethering';
      case 'error': return 'wifi_off';
      default: return 'portable_wifi_off';
    }
  }
}
