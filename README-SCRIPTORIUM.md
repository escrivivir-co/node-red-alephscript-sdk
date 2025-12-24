# Integración con ALEPH Scriptorium

**Submódulo**: `node-red-alephscript-sdk`  
**Plugin objetivo**: `wire-editor` v1.0.0  
**Rama de integración**: `integration/beta/scriptorium`

---

## Arquitectura del Submódulo

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        Node-RED AlephScript SDK                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │              📦 node-red-contrib-alephscript (13 nodos)                          │    │
│  ├─────────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                                  │    │
│  │   🤖 Bot Nodes (2)        📡 Channel Nodes (3)     🔄 Format Nodes (3)          │    │
│  │   ├─ alephscript-bot      ├─ app-channel            ├─ app-format               │    │
│  │   └─ enhanced-bot         ├─ sys-channel            ├─ sys-format               │    │
│  │                           └─ ui-channel             └─ ui-format                │    │
│  │                                                                                  │    │
│  │   🎛️ Orchestration (2)    📊 Dashboard (3)                                      │    │
│  │   ├─ orchestrator         ├─ bot-registry                                       │    │
│  │   └─ config               ├─ room-tester                                        │    │
│  │                           └─ stream-monitor                                      │    │
│  │                                                                                  │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │              🎨 node-red-gamify-ui (Angular 17+)                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────────────┤    │
│  │   • AlephScriptWebUI (extends GamificationUI)                                   │    │
│  │   • Node-RED Discovery Service (multi-instancia)                                │    │
│  │   • 3-Channel Integration Layer (App/Sys/UI routing)                            │    │
│  │   • PostInstall Distribution → public_templates                                  │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │              📁 examples/ (flows y subflows)                                     │    │
│  ├─────────────────────────────────────────────────────────────────────────────────┤    │
│  │   flows/                          flows-as/                                       │    │
│  │   ├─ 01-basic-bot-connection     ├─ basic-kick-bot-commands                      │    │
│  │   ├─ 02-multi-channel-bot        ├─ command-dice                                  │    │
│  │   ├─ 03-orchestrator-pipeline    └─ deps.md                                       │    │
│  │   ├─ 04-cross-room-communication                                                  │    │
│  │   ├─ 05-dashboard-monitoring                                                      │    │
│  │   └─ 06-complete-system-demo                                                      │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tecnologías

| Capa | Stack |
|------|-------|
| **Runtime** | Node-RED, Node.js 18+ |
| **Contrib Nodes** | TypeScript, CommonJS, Socket.IO 4.7.2, RxJS |
| **UI** | Angular 17+, GamificationUI pattern |
| **Testing** | Jest, Node-RED mocks |
| **Build** | npm workspaces (monorepo) |
| **Comunicación** | Socket.IO con protocolo AlephScript |

---

## Mapeo Ontológico con Scriptorium

### Agentes → Nodos Node-RED

| Agente Scriptorium | Nodo Node-RED | Función |
|--------------------|---------------|---------|
| @teatro | bot-node, enhanced-bot | Personajes como bots conectados |
| @aleph | orchestrator-node | Coordinación de canales |
| @blueflag, @blackflag... | app-channel (state) | Auditoría como estados de aplicación |
| @periodico | ui-channel | Notificaciones y actualizaciones |
| @vestibulo | ui-format | Formateo de mensajes de entrada |

### Canales → Capas del Scriptorium

| Canal Node-RED | Capa Scriptorium | Contenido |
|----------------|------------------|-----------|
| **app-channel** | Backend | Estados, transiciones, acciones |
| **sys-channel** | Meta | Health, errores, monitoreo |
| **ui-channel** | UI | Notificaciones, cambios de fase |

### Ejemplos de Flows → Casos de Uso

| Flow de Ejemplo | Caso Scriptorium |
|-----------------|------------------|
| `basic-kick-bot-commands.json` | Stream Kick + Tarotista |
| `orchestrator-pipeline.json` | Coordinación multi-agente |
| `dashboard-monitoring.json` | Panel de estado del Teatro |

---

## Dependencias Externas

### Requeridas para desarrollo

- **Node.js 18+** (LTS)
- **npm 8+**
- **Git Bash** (Windows) o shell compatible

### Requeridas para runtime

- **Node-RED** (instalado globalmente o local)
- **AlephScript Server** (socket-gym/ws-server) — opcional para modo conectado
- **@alephscript/core** — paquete tgz local

### Opcionales

- **Docker** — para contenedorización de Node-RED
- **Dashboard 2.0** — para widgets visuales

---

## Supuestos y Gaps (Fase 2)

### G1: Gestión del ciclo de vida Node-RED (Must, Sprint 2+)

**Problema**: El submódulo asume que Node-RED está instalado y configurado externamente.  
**Gap**: No hay protocolo en Scriptorium para:
- Detectar instancias de Node-RED en el sistema
- Arrancar/parar Node-RED desde el plugin
- Gestionar múltiples proyectos Node-RED

**Mitigación MVP**: El plugin opera sobre archivos JSON. El usuario gestiona Node-RED manualmente.

### G2: Sincronización de proyectos Node-RED con DISCO (Must, Sprint 1)

**Problema**: Los flows de Node-RED son archivos JSON standalone.  
**Gap**: No existe mecanismo para:
- Importar flows existentes a ARCHIVO/DISCO/WIRING/
- Exportar definiciones del plugin a Node-RED
- Mapeo asíncrono bidireccional

**Mitigación MVP**: Carpeta `ARCHIVO/DISCO/WIRING/` con estructura espejo. Copia manual inicial.

### G3: Definición de nodos custom desde Scriptorium (Should, Sprint 2)

**Problema**: Crear un nodo contrib requiere código TypeScript + HTML.  
**Gap**: El plugin necesita:
- Plantillas de nodos para casos comunes
- Generador de estructura de nodo
- Builder que compile y distribuya

**Mitigación MVP**: Asesoría para nodos existentes. Creación custom en sprints posteriores.

### G4: Conexión con actores del Teatro (Should, Sprint 1)

**Problema**: Los personajes del Teatro son agentes MD, no bots Socket.IO.  
**Gap**: Falta:
- Protocolo para que un actor del Teatro se conecte como bot Node-RED
- Campo `node_red_config` en actores.json
- Runtime que inicialice conexión

**Mitigación MVP**: El usuario configura manualmente la conexión. El plugin documenta el protocolo.

### G5: Integración con Blockly Editor (Could, Sprint 3)

**Problema**: Blockly genera JavaScript, Node-RED espera JSON de flows.  
**Gap**: No hay:
- Traductor Blockly → Flow Node-RED
- Paleta Blockly con bloques de Node-RED

**Mitigación Sprint 3**: Investigar si es viable generar flows programáticamente.

### G6: Dashboard UI desde el plugin (Could, Sprint 2)

**Problema**: Dashboard 2.0 requiere nodos específicos y configuración.  
**Gap**: Falta:
- Plantillas de layouts Dashboard
- Generador de widgets desde el plugin
- Sincronización de estado UI ↔ Scriptorium

**Mitigación Sprint 2**: Ejemplos de flows con Dashboard. Generación automática posterior.

---

## Flujo de Integración

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  ARCHIVO/DISCO/   │     │   Plugin          │     │   Node-RED        │
│  WIRING/          │◄────│   WireEditor      │────▶│   (externo)       │
│                   │     │                   │     │                   │
│  ├─ projects/     │     │  • Importar       │     │  ├─ .node-red/    │
│  │  └─ {nombre}/  │     │  • Exportar       │     │  │  └─ projects/  │
│  │     ├─ flows/  │     │  • Asesorar       │     │  ├─ flows.json    │
│  │     ├─ nodes/  │     │  • Sincronizar    │     │  └─ package.json  │
│  │     └─ meta/   │     │                   │     │                   │
│  └─ catalog.json  │     │  Bridge:          │     │                   │
│                   │     │  plugin_ox_wire   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
          ▲                        │
          │                        │
          │                        ▼
          │               ┌───────────────────┐
          │               │    Scriptorium    │
          │               │    (agentes)      │
          │               │                   │
          └───────────────│  @teatro          │
                          │  @tarotista       │
                          │  @aleph           │
                          └───────────────────┘
```

---

## Casos de Uso del PO

### UC1: Stream Kick + Tarotista (Sprint 1)

```
[Chat Kick] ──▶ [Node-RED: filtro comandos] ──▶ [JSON en DISCO] ──▶ [@tarotista]
                                                                          │
                                                                          ▼
                                                               [Respuesta en pantalla]
```

**Flujo**:
1. Usuario configura bot de stream (kick-aleph-bot)
2. Usa flow `basic-kick-bot-commands.json` adaptado
3. Mensajes con comando pasan a JSON en `ARCHIVO/DISCO/WIRING/feeds/`
4. Tarotista lee feed asíncrono
5. Respuesta se publica en stream

### UC2: FIA con Red Semántica + Node-RED (Sprint 2)

```
[as-gym/FIA] ──▶ [Nodos red semántica] ──▶ [Node-RED: inferencia] ──▶ [Bot en Teatro]
       │                                                                      │
       └──────────────────────────────────────────────────────────────────────┘
                                    Instrucciones para respuesta
```

**Flujo**:
1. Personaje del Teatro usa paradigma FIA (red semántica)
2. Plugin asesora creación de nodos custom para la red
3. Node-RED recibe peticiones y ejecuta inferencia
4. Respuesta vuelve al bot para siguiente turno

### UC3: Gestión de Configuración con Flows (Sprint 2)

```
[Plugins/Submodules] ──▶ [Ontología de nodos] ──▶ [Forms Dashboard] ──▶ [Configs]
```

**Flujo**:
1. Equipo diseña ontología de nodos para configuraciones
2. Plugin genera flows con formularios Dashboard 2.0
3. Usuario activa/desactiva features desde UI
4. Cambios se sincronizan con archivos de configuración

### UC4: Analogía Blockly ↔ Node-RED (Sprint 3)

```
[Blockly Editor] ──▶ [JavaScript] ──▶ [Traductor] ──▶ [Flow Node-RED]
```

**Flujo**:
1. Usuario diseña lógica en Blockly
2. Se exporta JavaScript
3. Traductor (a investigar) genera estructura JSON de flow
4. Flow importable en Node-RED

---

## Estructura de Datos en DISCO

```
ARCHIVO/DISCO/WIRING/
├── README.md                    # Documentación
├── catalog.json                 # Índice de proyectos
├── feeds/                       # Feeds JSON asíncronos
│   ├── kick-commands.json      # Feed de comandos del stream
│   └── teatro-events.json      # Eventos del Teatro
├── projects/                    # Proyectos Node-RED
│   └── {nombre-proyecto}/
│       ├── flows.json          # Flows exportados
│       ├── package.json        # Dependencias
│       ├── nodes/              # Nodos custom del proyecto
│       │   └── {node-name}/
│       │       ├── node.ts     # Implementación
│       │       └── node.html   # UI del nodo
│       └── meta/
│           ├── readme.md       # Documentación del proyecto
│           └── config.json     # Configuración
└── templates/                   # Plantillas reutilizables
    ├── flows/                   # Plantillas de flows
    ├── subflows/               # Subflows prefabricados
    └── nodes/                  # Plantillas de nodos
```

---

## Referencias

| Documento | Contenido |
|-----------|-----------|
| `README.md` | Documentación general del SDK |
| `ARCHITECTURE.md` | Arquitectura detallada |
| `NODE_REFERENCE.md` | Referencia de los 13 nodos |
| `INSTALLATION.md` | Guía de instalación |
| `examples/flows/` | Flows de ejemplo |
| `examples/flows-as/` | Flows AlephScript específicos |

---

## Notas de Integración

### Protocolo de 3 Canales

El SDK usa arquitectura de 3 canales (app/sys/ui) que mapea naturalmente a las capas del Scriptorium:

| Canal | Scriptorium | Puerto típico |
|-------|-------------|---------------|
| `/app` | Backend (auditores) | 3001 |
| `/sys` | Meta (health, logs) | 3001 |
| `/ui` | UI (notificaciones) | 3001 |
| `/runtime` | Orquestación general | 3000 |

### Socket.IO Events

Eventos clave del protocolo AlephScript:
- `CLIENT_REGISTER`: Registro de bot
- `ROOM_ASSIGNED`: Asignación de sala
- `state_transition`: Cambio de estado (app)
- `health_check`: Verificación de salud (sys)
- `notification`: Notificación a UI (ui)

### Dependencia @alephscript/core

El SDK depende de `@alephscript/core` que es un paquete local (tgz). Para desarrollo:
```bash
# Ruta esperada (relativa al SDK)
../socket-gym/ws-server/packages/alephscript-core/alephscript-core-1.0.0.tgz
```

**Gap potencial**: Este paquete no está en el Scriptorium. Requiere documentación o inclusión.
