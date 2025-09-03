import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <header>
        <h1>Node-RED AlephScript Manager</h1>
        <p>Angular UI for managing Node-RED instances with AlephScript integration</p>
      </header>
      
      <main>
        <div class="discovery-section">
          <h2>Node-RED Discovery</h2>
          <p>Scanning local network for Node-RED instances...</p>
          <!-- Future: Node-RED instance list -->
        </div>
        
        <div class="iframe-section">
          <h2>Node-RED Interface</h2>
          <p>Select a Node-RED instance to load its editor or dashboard</p>
          <!-- Future: IFrame container -->
        </div>
        
        <div class="alephscript-section">
          <h2>AlephScript Integration</h2>
          <p>Channel status and bot management</p>
          <!-- Future: Channel status, bot registry -->
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    header {
      border-bottom: 1px solid #ccc;
      margin-bottom: 20px;
      padding-bottom: 10px;
    }
    
    .discovery-section,
    .iframe-section,
    .alephscript-section {
      margin-bottom: 30px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    
    h1 {
      color: #333;
      margin: 0 0 10px 0;
    }
    
    h2 {
      color: #555;
      margin: 0 0 10px 0;
    }
  `]
})
export class AppComponent {
  title = 'node-red-gamify-ui';
}
