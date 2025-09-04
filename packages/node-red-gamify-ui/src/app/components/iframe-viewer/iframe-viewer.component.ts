import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NodeRedInstance } from '../../models/interfaces';

@Component({
  selector: 'app-iframe-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="iframe-container" [class.fullscreen]="isFullscreen">
      <mat-card class="viewer-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>{{ getViewIcon() }}</mat-icon>
            {{ instance.name }} - {{ viewType === 'editor' ? 'Editor' : 'Dashboard' }}
          </mat-card-title>
          <mat-card-subtitle>
            {{ instance.url }}{{ viewType === 'ui' ? '/dashboard' : '' }}
          </mat-card-subtitle>
          <div class="header-actions">
            <button mat-icon-button 
                    (click)="toggleView()" 
                    [disabled]="!instance.hasUI"
                    matTooltip="Toggle between Editor and Dashboard">
              <mat-icon>{{ viewType === 'editor' ? 'dashboard' : 'edit' }}</mat-icon>
            </button>
            <button mat-icon-button 
                    (click)="refreshFrame()"
                    matTooltip="Refresh">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button 
                    (click)="openInNewTab()"
                    matTooltip="Open in new tab">
              <mat-icon>open_in_new</mat-icon>
            </button>
            <button mat-icon-button 
                    (click)="toggleFullscreen()"
                    matTooltip="Toggle fullscreen">
              <mat-icon>{{ isFullscreen ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
            </button>
            <button mat-icon-button 
                    (click)="close.emit()"
                    matTooltip="Close">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </mat-card-header>
        
        <mat-card-content class="iframe-content">
          <div class="loading-indicator" *ngIf="isLoading">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading {{ instance.name }}...</p>
          </div>
          
          <div class="error-message" *ngIf="hasError">
            <mat-icon color="warn">error</mat-icon>
            <h3>Failed to load {{ instance.name }}</h3>
            <p>{{ errorMessage }}</p>
            <button mat-button color="primary" (click)="refreshFrame()">
              <mat-icon>refresh</mat-icon>
              Try Again
            </button>
          </div>
          
          <iframe 
            #nodeRedFrame
            [src]="safeUrl" 
            [style.display]="(isLoading || hasError) ? 'none' : 'block'"
            (load)="onFrameLoad()"
            (error)="onFrameError($event)"
            frameborder="0"
            class="node-red-iframe">
          </iframe>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .iframe-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
    }
    
    .iframe-container.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      background: white;
    }
    
    .viewer-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      margin: 0;
    }
    
    .viewer-card mat-card-header {
      flex-shrink: 0;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
    }
    
    .iframe-content {
      flex: 1;
      padding: 0 !important;
      position: relative;
      overflow: hidden;
    }
    
    .node-red-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }
    
    .loading-indicator,
    .error-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      z-index: 10;
    }
    
    .loading-indicator p {
      margin-top: 16px;
      color: #666;
    }
    
    .error-message {
      max-width: 400px;
      padding: 24px;
    }
    
    .error-message mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    
    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    mat-card-title mat-icon {
      color: #1976d2;
    }
  `]
})
export class IframeViewerComponent implements OnInit, OnDestroy {
  @Input() instance!: NodeRedInstance;
  @Input() viewType: 'editor' | 'ui' = 'editor';
  @Output() close = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<'editor' | 'ui'>();
  
  @ViewChild('nodeRedFrame') iframeRef!: ElementRef<HTMLIFrameElement>;
  
  safeUrl!: SafeResourceUrl;
  isLoading = true;
  hasError = false;
  errorMessage = '';
  isFullscreen = false;
  
  private loadTimeout?: number;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.updateUrl();
    this.setupLoadTimeout();
  }

  ngOnDestroy(): void {
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  }

  private updateUrl(): void {
    const url = this.viewType === 'ui' ? `${this.instance.url}/ui` : this.instance.url;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isLoading = true;
    this.hasError = false;
  }

  private setupLoadTimeout(): void {
    this.loadTimeout = window.setTimeout(() => {
      if (this.isLoading) {
        this.hasError = true;
        this.isLoading = false;
        this.errorMessage = 'Connection timeout - Node-RED instance may be unavailable';
      }
    }, 10000); // 10 second timeout
  }

  onFrameLoad(): void {
    this.isLoading = false;
    this.hasError = false;
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
    
    // Try to detect if the frame actually loaded Node-RED content
    try {
      const iframe = this.iframeRef.nativeElement;
      if (iframe.contentDocument) {
        const title = iframe.contentDocument.title;
        if (title && title.toLowerCase().includes('node-red')) {
          console.log(`✅ Successfully loaded ${this.instance.name} ${this.viewType}`);
        }
      }
    } catch (e) {
      // Cross-origin restrictions prevent access, but that's normal
      console.log(`📱 Frame loaded for ${this.instance.name} ${this.viewType}`);
    }
  }

  onFrameError(event: any): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = `Failed to load ${this.viewType === 'ui' ? 'dashboard' : 'editor'} - Check if Node-RED is running`;
    console.error('Frame error:', event);
  }

  toggleView(): void {
    if (!this.instance.hasUI && this.viewType === 'editor') {
      return; // Can't switch to UI if it doesn't exist
    }
    
    const newViewType = this.viewType === 'editor' ? 'ui' : 'editor';
    this.viewType = newViewType;
    this.updateUrl();
    this.setupLoadTimeout();
    this.viewChange.emit(newViewType);
  }

  refreshFrame(): void {
    this.updateUrl();
    this.setupLoadTimeout();
    
    // Force iframe reload
    if (this.iframeRef) {
      const iframe = this.iframeRef.nativeElement;
      iframe.src = iframe.src;
    }
  }

  openInNewTab(): void {
    const url = this.viewType === 'ui' ? `${this.instance.url}/ui` : this.instance.url;
    window.open(url, '_blank');
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  getViewIcon(): string {
    return this.viewType === 'editor' ? 'edit' : 'dashboard';
  }
}
