# Iteración 1: Análisis y plan inicial del SDK Node-RED AlephScript

## Estado del Progreso
- [x] Fase 1: De dónde venimos
- [x] Fase 2: Dónde queremos ir
- [x] Fase 3: Opciones para ir
- [x] Fase 4: Vamos (Ejecución)
- [x] Fase 5: A dónde hemos llegado

---## Fase 1: De dónde venimos
- Contexto previo
  - Objetivo: crear un paquete monorepo `node-red-alephscript-sdk` con 2 librerías:
    1) `node-red-contrib-alephscript` (nodos Node-RED: Bot, App/Sys/UI Channels, Orchestrator, Dashboard2.0 widgets)
    2) `node-red-gamify-ui` (webapp Angular tipo GamificationUI para gestionar instancias Node-RED por red local)
  - Patrón técnico base: AlephScript core y orquestación multic canal (app/sys/ui) implmetando el patrón del AlephScriptClient (como por ejemplo Proserpina bot, OrfeoBot o Euridice bot para la room, Socket.IO.
  - Distribución: seguir patrón de postinstall y `public_templates` visto en UIs existentes.
- Mapa de carpetas relevantes y su rol
  - state-machine-mcp-driver/: core runtime y APIs
    - src/orchestration/channel/: app-channel-agent.ts, sys-channel-agent.ts, ui-channel-agent.ts
    - src/orchestration/orchestrator.ts: hub de streams/mensajería
    - src/ui/MultiUIGameManager.ts: integración Multi-UI; referencia para clase GamificationUI
  - socket-gym/: servidor Socket.IO y gym de ejemplos (ws-server/, alephscript/)
  - threejs-gamify-ui/: referencia de app Angular + patrón de distribución (postinstall → public_templates)
  - web-rtc-gamify-ui/: otra referencia de UI Angular y postinstall
  - aleph-unity-bot/: cliente Unity (bots Proserpina/Orfeo/Eurídice) como inspiración de AlephScriptClient
  - node-red-alephscript-sdk/: monorepo objetivo (tiene `package.json` con workspaces "packages/*"; subcarpetas `projects/` aún sin package.json)
- Limitaciones identificadas
  - Mismatch de rutas de workspaces: `package.json` apunta a `packages/*` pero existen `projects/` en el repo; no hay manifests internos aún.
  - Falta esqueleto de Node-RED contrib y de Angular app.
  - Necesario definir protocolo exacto Socket.IO (registro, rooms) basándonos en `socket-gym` y el cliente AlephScript existente.
  - Dashboard 2.0: decidir set de widgets mínimos (registro bots, cross-room tester, stream monitor).
- Fundamentos
  - Reusar Channel Agents (app/sys/ui) y Orchestrator como contratos para nodos.
  - Reusar patrón de GamificationUI + postinstall para la app web.

## Fase 2: Dónde queremos ir
- Objetivo principal
  - Cerrar el plan de implementación consensuado y preparar el terreno para Iteración 2 (scaffolding de proyectos y toolchain).
- Criterios de éxito
  - Documento de plan y checklist publicado (este archivo + README de paquete).
  - MASTER_CHECKLIST enlaza esta iteración y marca “Fase de búsqueda” completada.
  - Alcance técnico delimitado: nodos requeridos, UI requerida y referencias claras.
- Impacto esperado
  - Acelerar implementación en Iteración 2 sin ambigüedades.

## Fase 3: Opciones para ir
- Estructura de monorepo
  - Opción A: workspaces en `packages/*` (estándar npm/yarn) → Decisión: A.
  - Opción B: mantener `projects/*` y ajustar `package.json` → Requiere más cambios colaterales.
- Nodos Node-RED
  - Opción A: TypeScript + build a CommonJS para Node-RED → Decisión: A.
  - Opción B: JavaScript puro → menos tipos y mantenibilidad.
- UI Angular
  - Opción A: clonar patrón de `threejs-gamify-ui` con postinstall → Decisión: A.
  - Opción B: webapp mínima sin distribución automatizada.

## Fase 4: Vamos (Ejecución)
- Pasos técnicos previstos para Iteración 2 (sin ejecutar ahora)
  1) Normalizar workspaces a `packages/*` y crear:
     - packages/node-red-contrib-alephscript/
     - packages/node-red-gamify-ui/
  2) Tooling TS: tsconfig base, build y jest en contrib.
  3) Scaffolding Angular para UI y preparar script postinstall.
  4) Esqueleto de nodos: Bot, App/Sys/UI, Orchestrator (interfaces + pruebas mínimas).
- Pruebas rápidas previstas
  - Lint/build vacíos pasan. E2E con socket-gym en iteraciones siguientes.

## Fase 5: A dónde hemos llegado
- Resultados
  - Mapa de codebase y roles documentado.
  - Plan y checklist publicados.
  - Riesgos conocidos anotados (workspaces, Dashboard2.0, protocolo Socket.IO).
- Limitaciones
  - Sin código implementado aún (decisión consciente para consensuar plan).
- Próximos pasos
  - Aprobación del plan y arranque de Iteración 2 (scaffolding + toolchain).

---

## Metadatos
- Fecha Inicio: 2025-09-03
- Fecha Fin: 2025-09-03
- Responsable: Agente
- Estado: Completada
- Confianza: 8/10
# Iteración 1: Análisis y Planificación del SDK Node-RED AlephScript

## Estado del Progreso
 - [ ] Fase 1: De dónde venimos
 - [ ] Fase 2: Dónde queremos ir
 - [ ] Fase 3: Opciones para ir
 - [ ] Fase 4: Vamos (Ejecución)
 - [ ] Fase 5: A dónde hemos llegado

---

## Fase 1: De dónde venimos

### Contexto del Ecosistema AlephScript

**Arquitectura Actual:**
- **Core Principal**: `state-machine-mcp-driver` con sistema de orquestación RxJS
- **Servidor Socket.IO**: `socket-gym/ws-server` para comunicaciones en tiempo real
- **Clientes Existentes**: ProserpinaBot, OrfeoBot, EuridiceBot basados en AlephScriptClient
- **UIs Gamificadas**: ThreeJSGamificationUI, WebRTCGamificationUI con patrón de distribución via postinstall

**Componentes Identificados:**

1. **AlephScriptClient** (`state-machine-mcp-driver/src/clients/alephscript-client.ts`)
   - Cliente Socket.IO base para comunicación con el servidor
   - Protocolo de registro automático y gestión de rooms
   - Integración con sistema de canales (sys, app, ui)

2. **Channel Agents** (`state-machine-mcp-driver/src/orchestration/channel/`)
   - `app-channel-agent.ts`: Gestión de acciones y transiciones de estado
   - `sys-channel-agent.ts`: Eventos de sistema, salud y monitoreo
   - `ui-channel-agent.ts`: Notificaciones, fases y eventos de interfaz

3. **Orchestrator** (`state-machine-mcp-driver/src/orchestration/orchestrator.ts`)
   - Hub central de comunicación RxJS con 3 canales
   - Pipeline de streams para coordinación entre componentes
   - Gestión de componentes registrados y routing de mensajes

4. **GamificationUI Pattern**
   - Patrón de distribución: build → dist → postinstall → public_templates
   - Integración con Express servers para servir assets Angular
   - Ejemplos: `threejs-gamify-ui`, `web-rtc-gamify-ui`

### Limitaciones Identificadas
- No existe integración nativa con Node-RED
- Los bots están limitados a aplicaciones TypeScript/JavaScript
- Las UIs gamificadas requieren desarrollo Angular específico
- Falta de nodos Node-RED para el ecosistema AlephScript

---

## Fase 2: Dónde queremos ir

### Objetivo Principal
Crear `node-red-alephscript-sdk` como paquete dual que facilite la integración completa del ecosistema AlephScript con Node-RED.

### Componentes a Desarrollar

#### 1. **node-red-contrib-alephscript** (Librería Node-RED)
**Nodos a implementar:**
- **Bot Node**: Representa un AlephScriptClient con registro automático y gestión de rooms
- **App Channel Node**: Interfaz para `app-channel-agent` (acciones, estados)
- **Sys Channel Node**: Interfaz para `sys-channel-agent` (sistema, salud)  
- **UI Channel Node**: Interfaz para `ui-channel-agent` (notificaciones, fases)
- **Orchestrator Node**: Pipeline de streams Socket.IO como el original

**Dashboard 2.0 Integration:**
- Panel simple para registrar dos bots
- Gestión de rooms y comunicación entre bots
- Testing de entrada/salida de rooms con visualización de streams

#### 2. **node-red-gamify-ui** (Aplicación Angular)
**Funcionalidades:**
- UI moderna para gestionar nodos Node-RED de la red local
- Modo editor: Cargar y visualizar flujos Node-RED
- Modo Dashboard 2.0: Ejecutar interfaces de usuario
- Gestión de iframes para múltiples instancias Node-RED
- Integración con AlephScript para coordinación entre instancias

### Criterios de Éxito
- [ ] Nodos Node-RED funcionales para todos los componentes AlephScript
- [ ] Aplicación Angular que puede cargar cualquier Node-RED local
- [ ] Distribución automática via postinstall siguiendo el patrón existente
- [ ] Documentación completa con ejemplos de uso
- [ ] Compatibilidad con Dashboard 2.0 de Node-RED

### Impacto Esperado
- Democratización del ecosistema AlephScript via Node-RED
- Facilitar prototipado rápido de aplicaciones bot
- Interfaz unificada para gestionar múltiples instancias Node-RED
- Extensión del alcance a usuarios no-programadores

---

## Fase 3: Opciones para ir

### Opción A: Desarrollo Secuencial (Recomendada)
**Ventajas:**
- Menor complejidad inicial
- Validación incremental de cada componente
- Posibilidad de testear la librería contrib antes de la UI

**Plan de desarrollo:**
1. **Sprint 1**: node-red-contrib-alephscript (nodos básicos)
2. **Sprint 2**: Integración con Dashboard 2.0
3. **Sprint 3**: node-red-gamify-ui (aplicación Angular)
4. **Sprint 4**: Sistema de distribución y documentación

**Riesgos:**
- Dependencias entre componentes pueden crear bloqueos
- Cambios en la arquitectura pueden afectar trabajo anterior

### Opción B: Desarrollo Paralelo
**Ventajas:**
- Mayor velocidad de desarrollo
- Validación simultánea de ambos componentes

**Plan de desarrollo:**
1. **Tracks paralelos**: contrib + web-ui simultáneamente
2. **Integración intermedia**: Testing de compatibilidad
3. **Refinamiento**: Ajustes basados en feedback cruzado

**Riesgos:**
- Mayor complejidad de coordinación
- Posibles incompatibilidades arquitectónicas
- Mayor carga de trabajo inicial

### Opción C: MVP + Iteración Rápida
**Ventajas:**
- Feedback temprano del mercado
- Validación de conceptos rápida

**Plan de desarrollo:**
1. **MVP**: Solo Bot Node + UI básica
2. **Iteración 1**: Agregar Channel Nodes
3. **Iteración 2**: Orchestrator + Dashboard 2.0
4. **Iteración 3**: Aplicación Angular completa

**Riesgos:**
- MVP puede ser demasiado limitado
- Refactoring constante puede ralentizar desarrollo

### Decisión Final
**Seleccionada: Opción A - Desarrollo Secuencial**

**Justificación:**
- Permite validar cada pieza del ecosistema independientemente
- Menor riesgo de arquitectura incompatible
- Facilita debugging y testing incremental
- Se alinea con el patrón establecido en otros proyectos del ecosistema

---

## Fase 4: Vamos (Ejecución)

### Sprint 1: Foundation & Bot Node (Semana 1)

#### 4.1 Setup del Proyecto
- [x] Estructura base de directorios
- [ ] Configuración package.json para ambos sub-paquetes
- [ ] Setup build system (TypeScript + Angular CLI)
- [ ] Configuración de testing framework

#### 4.2 Bot Node Development
- [ ] Análisis del AlephScriptClient base
- [ ] Adaptación para Node-RED (node properties, config UI)
- [ ] Implementación del protocolo de registro automático
- [ ] Testing con socket-gym/ws-server

#### 4.3 Basic Integration Testing
- [ ] Verificar conexión Bot Node ↔ AlephScript Server
- [ ] Validar gestión de rooms
- [ ] Documentación básica del Bot Node

### Sprint 2: Channel Nodes (Semana 2)

#### 4.4 App Channel Node
- [ ] Estudio de app-channel-agent.ts
- [ ] UI de configuración para acciones y estados
- [ ] Implementación de emisión/recepción de eventos
- [ ] Testing de transiciones de estado

#### 4.5 Sys Channel Node  
- [ ] Estudio de sys-channel-agent.ts
- [ ] UI para eventos de sistema y salud
- [ ] Implementación de monitoreo y alertas
- [ ] Testing con orchestrator

#### 4.6 UI Channel Node
- [ ] Estudio de ui-channel-agent.ts
- [ ] UI para notificaciones y cambios de fase
- [ ] Implementación de eventos de interfaz
- [ ] Testing de notificaciones

### Sprint 3: Orchestrator & Dashboard 2.0 (Semana 3)

#### 4.7 Orchestrator Node
- [ ] Análisis del orchestrator.ts original
- [ ] Implementación de pipeline de streams en Node-RED
- [ ] Configuración de routing entre canales
- [ ] Testing de comunicación multi-canal

#### 4.8 Dashboard 2.0 Integration
- [ ] Panel para registro de bots
- [ ] Gestión visual de rooms
- [ ] Testing de comunicación entre bots
- [ ] Visualización de streams en tiempo real

### Sprint 4: Angular UI & Distribution (Semana 4)

#### 4.9 Angular Application Base
- [ ] Setup proyecto Angular en node-red-gamify-ui
- [ ] Arquitectura de componentes base
- [ ] Servicios para comunicación con Node-RED APIs
- [ ] Routing y navegación básica

#### 4.10 Node-RED Integration Features
- [ ] Descubrimiento de instancias Node-RED locales
- [ ] Carga de flujos en modo editor (iframe)
- [ ] Carga de Dashboard 2.0 UIs (iframe)
- [ ] Gestión de múltiples instancias simultáneas

#### 4.11 Distribution System
- [ ] Scripts postinstall siguiendo patrón existente
- [ ] Configuración build para dist → public_templates
- [ ] Testing de instalación automática
- [ ] Documentación de instalación

### Pruebas Rápidas por Sprint
- **Sprint 1**: Conectar Bot Node a socket-gym, verificar registro
- **Sprint 2**: Flujo completo de eventos entre todos los channel nodes
- **Sprint 3**: Orchestrator coordinando múltiples bots en Dashboard 2.0
- **Sprint 4**: Aplicación Angular cargando Node-RED real en iframe

---

## Fase 5: A dónde hemos llegado

*[Esta sección se completará al finalizar la ejecución]*

### Resultados
*Por completar tras la implementación*

### Limitaciones Encontradas
*Por documentar durante el desarrollo*

### Próximos Pasos
*Roadmap futuro basado en resultados*

---

## Metadatos
- **Fecha Inicio**: 2025-01-03
- **Fecha Fin**: *En progreso*
- **Responsable**: Agente AI GitHub Copilot
- **Estado**: En Progreso - Fase 3 completada
- **Confianza**: 8/10

## Referencias Técnicas Clave

### AlephScript Core
- `state-machine-mcp-driver/src/clients/alephscript-client.ts`
- `state-machine-mcp-driver/src/orchestration/orchestrator.ts`
- `state-machine-mcp-driver/src/orchestration/channel/`

### Socket.IO Server
- `socket-gym/ws-server/src/alephscript/socket-server.ts`

### Patrones GamificationUI
- `threejs-gamify-ui/scripts/postinstall.cjs`
- `web-rtc-gamify-ui/projects/webrtc-ui-lib/src/lib/integration/`

### Node-RED Existente
- `socket-gym/node-red/` (instancia de referencia)
- `socket-gym/alephscript/src/as-framework/as-admin-desktop/node-red-server/`
