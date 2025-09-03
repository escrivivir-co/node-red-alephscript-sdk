# Iteración 9: Angular UI Application Development (`node-red-gamify-ui`)

## 📋 ESTADO DEL PROGRESO  
- [ ] Fase 1: De dónde venimos
- [ ] Fase 2: Dónde queremos ir
- [ ] Fase 3: Opciones para ir
- [ ] Fase 4: Vamos (Ejecución)
- [ ] Fase 5: A dónde hemos llegado

---

## Fase 1: De dónde venimos
- **Dashboard 2.0 Management Panel** completo con 3 widgets especializados (`node-red-contrib-alephscript`)
- **Socket.IO integration** funcionando con protocolo CLIENT_REGISTER/SUSCRIBE
- **Channel system** (App/Sys/UI) totalmente integrado en Node-RED
- **Pattern de distribución** analizado desde threejs-gamify-ui (postinstall → public_templates)
- **Necesidad identificada** de Angular UI application (`node-red-gamify-ui`) para gestión Node-RED instances

## Fase 2: Dónde queremos ir
- **Angular application** (`node-red-gamify-ui`) para gestión múltiples Node-RED instances
- **Discovery automático** de instancias en red local  
- **Iframe management** para editor y dashboard modes con routing
- **AlephScript ecosystem integration** completa con 3-channel routing
- **Package distribution** siguiendo pattern: build → postinstall → public_templates → serving

## Fase 3: Opciones para ir
- **Opción A**: Angular standalone app (Recomendada para `node-red-gamify-ui`)
- **Opción B**: Extension del Dashboard 2.0 via integration
- **Opción C**: Electron desktop application

## Fase 4: Vamos (Ejecución)

### 4.1 Angular Application Setup (`node-red-gamify-ui`)
- [ ] Angular CLI project initialization en projects/node-red-gamify-ui
- [ ] Architecture design (services, components, routing)
- [ ] UI framework selection (Angular Material, etc.)
- [ ] State management setup (NgRx optional)

### 4.2 Node-RED Discovery Service
- [ ] Network scanning para Node-RED instances
- [ ] HTTP probing y endpoint detection
- [ ] Service registration y health checking
- [ ] Configuration persistence

### 4.3 Package Distribution Setup (critical requirement)
- [ ] Setup scripts/postinstall.cjs basado en threejs-gamify-ui pattern
- [ ] Configuration de files array en package.json para dist inclusion
- [ ] Build process: Angular build → dist/node-red-gamify-ui/
- [ ] PostInstall: dist/node-red-gamify-ui/ → consumer's public_templates/node-red-gamify-ui/
- [ ] Integration con MultiUIGameManager.ts para nuevo UI type

### 4.4 AlephScript Web UI Integration (GamificationUI pattern)
- [ ] Crear AlephScriptWebUI class extending GamificationUI
- [ ] Implementation de los 3 canales (App/Sys/UI) en Angular service
- [ ] Socket.IO client integration con protocolo AlephScript
- [ ] Dashboard 2.0 widgets embedding dentro de Angular components
- [ ] Real-time synchronization entre Angular UI y Node-RED flows

### 4.5 Configuration Integration (xplus1-config.json pattern)
- [ ] Add new UI type "node-red-gamify-ui" a UIFactory
- [ ] Configuration options: provideTemplate, staticDir, port, etc.
- [ ] Example configuration entry para xplus1-config.json:
```json
{
  "id": "node-red-gamify-ui-interface",
  "name": "AlephScript Web Management UI",
  "type": "node-red-gamify-ui",
  "enabled": true,
  "config": {
    "port": 8081,
    "staticDir": "./public_templates/node-red-gamify-ui",
    "provideTemplate": true,
    "gameTitle": "Node-RED AlephScript Manager",
    "enablePostulations": true,
    "debugMode": true
  }
}
```
- [ ] Seamless integration con existing MultiUIGameManager workflow

### 4.6 Node-RED Discovery & Multi-Instance Management  
- [ ] Network scanning para Node-RED instances (local network discovery)
- [ ] HTTP probing y endpoint detection (port scanning + API verification)
- [ ] Service registration y health checking (active monitoring)
- [ ] Instance list management con connection status
- [ ] Configuration sync across instances

### 4.7 Iframe Router Implementation & Security
- [ ] Dynamic iframe creation y management per Node-RED instance
- [ ] Editor mode routing (Node-RED flow editor embedding)
- [ ] Dashboard mode routing (Dashboard 2.0 UI embedding)
- [ ] Context switching y state preservation between instances
- [ ] Security y sandboxing (CORS, CSP, iframe security policies)

## Fase 5: A dónde hemos llegado
*[Por completar tras la ejecución]*

---

## Metadatos
- **Fecha Inicio**: TBD
- **Fecha Fin**: TBD  
- **Responsable**: Agente AI
- **Estado**: Planificado → Arquitectura Definida
- **Confianza**: 6/10 → 8/10 (proceso de distribución clarificado)
- **Tiempo Estimado**: 3-4 días (increased para package distribution complexity)
- **Dependencias**: Iteration 8 completada, pattern threejs-gamify-ui analizado
- **Confianza**: 8/10
