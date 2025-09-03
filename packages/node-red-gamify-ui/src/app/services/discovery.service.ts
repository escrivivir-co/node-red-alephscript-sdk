import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, interval, of } from 'rxjs';
import { catchError, map, switchMap, distinctUntilChanged, timeout } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NodeRedInstance } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class DiscoveryService {
  private instancesSubject = new BehaviorSubject<NodeRedInstance[]>([]);
  public instances$ = this.instancesSubject.asObservable();
  
  private scanInProgress = false;
  
  // Puertos favoritos - los más comunes y probables de tener Node-RED
  private readonly favoritePorts = [1880, 1881, 1882]; // Puerto estándar Node-RED y variantes
  
  // Puertos adicionales para scan completo
  private readonly additionalPorts = [1883, 1884, 1885, 1886, 1887, 1888, 1889, 1890];
  
  // Todos los puertos combinados
  private readonly allPorts = [...this.favoritePorts, ...this.additionalPorts];

  constructor(private http: HttpClient) {
    console.log('🚀 DiscoveryService initialized - starting Node-RED network discovery');
    console.log(`⭐ Favorite ports: ${this.favoritePorts.join(', ')}`);
    console.log(`📋 Additional ports: ${this.additionalPorts.join(', ')}`);
    
    // Debug current instances
    this.instances$.subscribe(instances => {
      console.log(`📱 Instances updated: ${instances.length} total`, instances.map(i => `${i.id} (${i.status})`));
    });
    
    // Fast scan of favorite ports every 15 seconds
    interval(15000).subscribe(() => {
      console.log('⚡ Fast auto-discovery scan (favorites only)');
      this.quickScanFavorites();
    });
    
    // Full scan every 60 seconds
    interval(60000).subscribe(() => {
      console.log('🔍 Full auto-discovery scan triggered');
      this.scanNetwork();
    });
    
    // Initial quick scan after a brief delay
    setTimeout(() => {
      console.log('🚀 Starting initial quick scan (favorite ports)...');
      this.quickScanFavorites();
    }, 500);
    
    // Initial full scan after 5 seconds
    setTimeout(() => {
      console.log('🔍 Starting initial full network scan...');
      this.scanNetwork();
    }, 5000);
  }

  /**
   * Scan rápido solo de puertos favoritos - más frecuente y eficiente
   */
  async quickScanFavorites(): Promise<void> {
    if (this.scanInProgress) {
      console.log('🚫 Scan already in progress, skipping quick scan...');
      return;
    }
    
    this.scanInProgress = true;
    console.log('⚡ Quick scan: favorite ports only');
    
    const discovered: NodeRedInstance[] = [];
    
    // Scan localhost favorite ports
    console.log(`⭐ Scanning localhost favorites: ${this.favoritePorts.join(', ')}`);
    for (const port of this.favoritePorts) {
      try {
        const instance = await this.checkInstance('localhost', port);
        if (instance) {
          console.log(`✅ Quick find: localhost:${port}`);
          discovered.push(instance);
        }
      } catch (error) {
        console.log(`❌ Quick check failed localhost:${port}`);
      }
    }
    
    // Also check 127.0.0.1 for favorites
    console.log(`⭐ Scanning 127.0.0.1 favorites: ${this.favoritePorts.join(', ')}`);
    for (const port of this.favoritePorts) {
      if (!discovered.find(d => d.port === port && (d.host === 'localhost' || d.host === '127.0.0.1'))) {
        try {
          const instance = await this.checkInstance('127.0.0.1', port);
          if (instance) {
            console.log(`✅ Quick find: 127.0.0.1:${port}`);
            discovered.push(instance);
          }
        } catch (error) {
          console.log(`❌ Quick check failed 127.0.0.1:${port}`);
        }
      }
    }
    
    // Update instances (merge with existing)
    if (discovered.length > 0) {
      this.updateInstances(discovered);
    }
    
    this.scanInProgress = false;
    console.log(`⚡ Quick scan complete. Found ${discovered.length} instances.`);
  }

  /**
   * Scan completo de todos los puertos - menos frecuente pero exhaustivo
   */
  async scanNetwork(): Promise<void> {
    if (this.scanInProgress) {
      console.log('🚫 Scan already in progress, skipping...');
      return;
    }
    
    this.scanInProgress = true;
    console.log('🔍 Starting FULL Node-RED network discovery...');
    
    const discovered: NodeRedInstance[] = [];
    
    // 1. PRIORITY: Scan favorite ports first (fastest response for common cases)
    console.log(`⭐ PRIORITY: localhost favorites: ${this.favoritePorts.join(', ')}`);
    for (const port of this.favoritePorts) {
      try {
        const instance = await this.checkInstance('localhost', port);
        if (instance) {
          console.log(`✅ PRIORITY found: localhost:${port}`);
          discovered.push(instance);
        }
      } catch (error) {
        console.log(`❌ Priority check failed localhost:${port}`);
      }
    }
    
    // 2. PRIORITY: 127.0.0.1 favorites
    console.log(`⭐ PRIORITY: 127.0.0.1 favorites: ${this.favoritePorts.join(', ')}`);
    for (const port of this.favoritePorts) {
      if (!discovered.find(d => d.port === port && (d.host === 'localhost' || d.host === '127.0.0.1'))) {
        try {
          const instance = await this.checkInstance('127.0.0.1', port);
          if (instance) {
            console.log(`✅ PRIORITY found: 127.0.0.1:${port}`);
            discovered.push(instance);
          }
        } catch (error) {
          console.log(`❌ Priority check failed 127.0.0.1:${port}`);
        }
      }
    }
    
    // 3. ADDITIONAL: Scan additional ports on localhost
    console.log(`📋 ADDITIONAL: localhost ports: ${this.additionalPorts.join(', ')}`);
    for (const port of this.additionalPorts) {
      try {
        const instance = await this.checkInstance('localhost', port);
        if (instance) {
          console.log(`✅ Additional found: localhost:${port}`);
          discovered.push(instance);
        }
      } catch (error) {
        console.log(`❌ Additional check failed localhost:${port}`);
      }
    }
    
    // 4. ADDITIONAL: 127.0.0.1 additional ports
    console.log(`📋 ADDITIONAL: 127.0.0.1 ports: ${this.additionalPorts.join(', ')}`);
    for (const port of this.additionalPorts) {
      if (!discovered.find(d => d.port === port && (d.host === 'localhost' || d.host === '127.0.0.1'))) {
        try {
          const instance = await this.checkInstance('127.0.0.1', port);
          if (instance) {
            console.log(`✅ Additional found: 127.0.0.1:${port}`);
            discovered.push(instance);
          }
        } catch (error) {
          console.log(`❌ Additional check failed 127.0.0.1:${port}`);
        }
      }
    }
    
    // 5. NETWORK: Scan common local IPs (only favorite ports to avoid being too slow)
    const localIp = await this.getLocalIP();
    const subnet = localIp.substring(0, localIp.lastIndexOf('.'));
    console.log(`🌐 NETWORK: Local subnet scan: ${subnet}.x (favorites only)`);
    
    // Scan common local IPs in parallel (faster)
    const commonIPs = ['192.168.1.1', '192.168.0.1', '10.0.0.1'];
    const scanPromises: Promise<NodeRedInstance | null>[] = [];
    
    for (const ip of commonIPs) {
      for (const port of this.favoritePorts) { // Only scan favorite ports for network IPs
        scanPromises.push(this.checkInstance(ip, port));
      }
    }
    
    // Wait for network scans with timeout
    try {
      const networkResults = await Promise.allSettled(scanPromises);
      networkResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`✅ Added network instance: ${result.value.id}`);
          discovered.push(result.value);
        }
      });
    } catch (error) {
      console.log('⚠️ Network scan had some failures:', error);
    }
    
    // Update instances
    this.updateInstances(discovered);
    this.scanInProgress = false;
    console.log(`✅ Discovery complete. Found ${discovered.length} Node-RED instances.`);
  }

  private async checkInstance(host: string, port: number): Promise<NodeRedInstance | null> {
    try {
      const url = `http://${host}:${port}`;
      const settingsUrl = `${url}/settings`;
      
      console.log(`🔍 Checking ${host}:${port} for Node-RED...`);
      
      // Try to fetch Node-RED settings
      const settings = await this.http.get(settingsUrl, { 
        headers: { 'Accept': 'application/json' }
      }).pipe(
        timeout(3000),
        catchError((error) => {
          console.log(`❌ Failed to connect to ${host}:${port} - ${error.message || 'Connection failed'}`);
          return of(null);
        })
      ).toPromise();
      
      if (settings && (settings as any).version) {
        console.log(`✅ Found Node-RED ${(settings as any).version} at ${host}:${port}`);
        
        const instance: NodeRedInstance = {
          id: `${host}:${port}`,
          name: (settings as any).editorTheme?.page?.title || `Node-RED ${host}:${port}`,
          host,
          port,
          url,
          status: 'online',
          version: (settings as any).version,
          lastSeen: new Date(),
          hasUI: await this.checkUIAvailability(url),
          flows: 0, // Will be updated separately
          nodes: 0   // Will be updated separately
        };
        
        console.log(`📊 Instance details:`, instance);
        return instance;
      }
    } catch (error) {
      console.log(`❌ Exception checking ${host}:${port}:`, error);
    }
    
    return null;
  }
  
  private async checkUIAvailability(baseUrl: string): Promise<boolean> {
    try {
      const response = await this.http.get(`${baseUrl}/ui`, { 
        responseType: 'text' as 'json'
      }).pipe(
        timeout(2000),
        catchError(() => of(null))
      ).toPromise();
      return !!response;
    } catch {
      return false;
    }
  }
  
  private async getLocalIP(): Promise<string> {
    // Simplified - in real implementation would use WebRTC or similar
    return '192.168.1.100';
  }
  
  private updateInstances(newInstances: NodeRedInstance[]): void {
    const current = this.instancesSubject.value;
    console.log(`📊 Updating instances. Current: ${current.length}, New: ${newInstances.length}`);
    
    // Create a comprehensive update
    const allInstances = new Map<string, NodeRedInstance>();
    
    // First, add all current instances (preserving existing state)
    current.forEach(instance => {
      allInstances.set(instance.id, { ...instance });
    });
    
    // Then update with new findings
    newInstances.forEach(newInstance => {
      const existing = allInstances.get(newInstance.id);
      if (existing) {
        // Update existing instance with new data
        allInstances.set(newInstance.id, {
          ...existing,
          ...newInstance,
          status: 'online' as const,
          lastSeen: new Date()
        });
        console.log(`🔄 Updated existing instance: ${newInstance.id}`);
      } else {
        // Add new instance
        allInstances.set(newInstance.id, {
          ...newInstance,
          status: 'online' as const,
          lastSeen: new Date()
        });
        console.log(`➕ Added new instance: ${newInstance.id}`);
      }
    });
    
    // Mark instances as offline if they weren't found in this scan
    const foundIds = new Set(newInstances.map(i => i.id));
    allInstances.forEach((instance, id) => {
      if (!foundIds.has(id)) {
        // Only mark as offline if last seen was more than 1 minute ago
        const lastSeenTime = instance.lastSeen.getTime();
        const now = new Date().getTime();
        if (now - lastSeenTime > 60000) { // 1 minute
          allInstances.set(id, { ...instance, status: 'offline' as const });
          console.log(`🔴 Marked instance offline: ${id}`);
        }
      }
    });
    
    const finalInstances = Array.from(allInstances.values());
    console.log(`✅ Final instance count: ${finalInstances.length}`);
    this.instancesSubject.next(finalInstances);
  }
  
  refreshInstance(instanceId: string): Observable<NodeRedInstance | null> {
    const instance = this.instancesSubject.value.find(i => i.id === instanceId);
    if (!instance) return of(null);
    
    return this.checkInstanceObservable(instance.host, instance.port);
  }
  
  private checkInstanceObservable(host: string, port: number): Observable<NodeRedInstance | null> {
    const url = `http://${host}:${port}`;
    const settingsUrl = `${url}/settings`;
    
    return this.http.get(settingsUrl).pipe(
      timeout(3000),
      map((settings: any) => {
        if (settings && settings.version) {
          return {
            id: `${host}:${port}`,
            name: settings.editorTheme?.page?.title || `Node-RED ${host}:${port}`,
            host,
            port,
            url,
            status: 'online' as const,
            version: settings.version,
            lastSeen: new Date(),
            hasUI: true, // Assume true for observable version
            flows: 0,
            nodes: 0
          };
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }
  
  getInstances(): NodeRedInstance[] {
    return this.instancesSubject.value;
  }
}
