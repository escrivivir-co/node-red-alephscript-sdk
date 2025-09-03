import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { InstanceListComponent } from './components/instance-list/instance-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    InstanceListComponent
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary">
        <mat-icon>router</mat-icon>
        <span>Node-RED AlephScript Manager</span>
        <span class="toolbar-spacer"></span>
        <mat-icon>settings</mat-icon>
      </mat-toolbar>
      
      <main class="main-content">
        <app-instance-list></app-instance-list>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .toolbar-spacer {
      flex: 1 1 auto;
    }
    
    .main-content {
      flex: 1;
      overflow: auto;
      background: #f5f5f5;
    }
    
    mat-toolbar {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    mat-toolbar span {
      margin-left: 8px;
    }
  `]
})
export class AppComponent {
  title = 'Node-RED AlephScript Manager';
}
