# Iteración 4: App Channel Node Implementation (`node-red-contrib-alephscript`)

## 📋 ESTADO DEL PROGRESO
- [x] Fase 1: De dónde venimos  
- [ ] Fase 2: Dónde queremos ir
- [ ] Fase 3: Opciones para ir
- [ ] Fase 4: Vamos (Ejecución)
- [ ] Fase 5: A dónde hemos llegado

---

## Fase 1: De dónde venimos

### ✅ Prerrequisitos Completados (Iteración 3)
- Bot Node funcional con Socket.IO integration completa
- CLIENT_REGISTER protocol implementado y funcional
- Base de código TypeScript + Node-RED establecida y probada
- Testing framework configurado (Jest + 3/3 tests passing)
- Build system operativo (TypeScript → CommonJS exitoso)

### 🎯 Contexto AlephScript App Channel
**Ubicación**: `state-machine-mcp-driver/src/orchestration/channel/app-channel-agent.ts`

**Funcionalidad del AppChannelAgent**:
- **ID**: `"state-manager"`
- **Propósito**: Gestión de estado de aplicaciones y transiciones
- **Mensajes clave**:
  - `state_transition`: Cambio de estado con targetState
  - `action_request`: Solicitudes de acciones (get_state, reset_state)
- **Comunicación**: 3-canal (app, sys, ui) mediante IOrchestratorChannels
- **Estado interno**: currentState + historial de transiciones

## Fase 2: Dónde queremos ir

### 🎯 Objetivos de la Iteración 4
- **App Channel Node** funcional en Node-RED para gestión de estados
- Integración con protocolo de mensajes tipo `state_transition` y `action_request`
- UI de configuración para filtros y routing de mensajes de estado
- Capacidad de enviar/recibir mensajes en canal `app` del ecosistema AlephScript
- Testing completo con socket-gym/ws-server

### 📦 Entregables Target
- `packages/node-red-contrib-alephscript/src/nodes/app-channel-node.ts`
- `packages/node-red-contrib-alephscript/src/nodes/app-channel-node.html`
- Actualización de `package.json` para incluir el nuevo nodo
- Tests unitarios e integración específicos para app-channel
- Documentación de uso y ejemplos de flows

### 🔄 Funcionalidades Específicas
- **Entrada**: Recepción de mensajes `state_transition` y `action_request`
- **Salida**: Envío de `action_result` y notificaciones de estado
- **Configuración**: Filtros por actionType, targetState
- **Estado**: Tracking de transiciones internas para debugging

## Fase 3: Opciones para ir

### Opción A: Node especializado en State Management (Recomendada)
- **Pros**: Funcionalidad específica, UI optimizada para estados
- **Contras**: Limitado a gestión de estados
- **Esfuerzo**: Medio
- **Base**: Wrapper del AppChannelAgent con focus en state_transition

### Opción B: Node genérico para App Channel
- **Pros**: Máxima flexibilidad, reutilizable
- **Contras**: UI compleja, curva de aprendizaje mayor
- **Esfuerzo**: Alto
- **Base**: Cliente Socket.IO directo con configuración avanzada

### Opción C: Extensión del Bot Node existente
- **Pros**: Aprovecha infraestructura existente
- **Contras**: Mezclado de responsabilidades, código complejo
- **Esfuerzo**: Bajo
- **Base**: Añadir funcionalidad app-channel al bot-node.ts

**Decisión: Opción A** - Node especializado para máxima usabilidad en casos de gestión de estado

## Fase 4: Vamos (Ejecución)

### 4.1 Análisis app-channel-agent ✅
- [x] Estudio de `app-channel-agent.ts` (state-manager component)
- [x] Identificación de tipos de mensaje: state_transition, action_request
- [x] Mapeo de métodos: handleStateTransition, handleActionRequest
- [x] Documentación de estructura de payload y responses

### 4.2 App Channel Node Development
- [ ] Creación de app-channel-node.ts base con Socket.IO
- [ ] Implementación de configuración UI (HTML) para filtros
- [ ] Integración con canal 'app' del ecosistema AlephScript
- [ ] Gestión de mensajes state_transition y action_request

### 4.3 State Management & Message Handling
- [ ] Sistema de filtros por actionType y targetState
- [ ] Routing de mensajes a outputs específicos (state/action)
- [ ] Formateo de mensajes para Node-RED msg object
- [ ] Error handling y logging específico para estados

### 4.4 Node-RED Properties & UI
- [ ] Configuración de filtros de actionType (get_state, reset_state)
- [ ] UI para filtros de targetState en transiciones
- [ ] Status indicators (estado actual, transiciones)
- [ ] Help documentation con ejemplos de payloads

### 4.5 Testing & Validation
- [ ] Unit tests para App Channel Node logic
- [ ] Integration tests con socket-gym/ws-server app channel
- [ ] Testing de state_transition y action_request flows
- [ ] Validación de interoperabilidad con Bot Node existente

---

## Próximos pasos para iniciar
1. Comenzar con 4.2 - Creación del app-channel-node.ts
2. Usar bot-node.ts como template base
3. Adaptar Socket.IO connection para canal 'app'
4. Implementar handlers específicos para state_transition

### 4.1 Análisis App Channel Agent
- [ ] Estudio de state-machine-mcp-driver/src/orchestration/channel/app-channel-agent.ts
- [ ] Identificación de message types (action_request, state_transition, etc.)
- [ ] Mapeo de eventos RxJS a Node-RED messages
- [ ] Documentación de payload structures

### 4.2 App Channel Node Core
- [ ] Implementación de app-channel-node.js
- [ ] Configuración para action types y parameters
- [ ] Input handling para action requests
- [ ] Output formatting para Node-RED compatibility

### 4.3 State Management Integration
- [ ] Support para state transitions
- [ ] Validation de state changes
- [ ] Error handling y rollback scenarios
- [ ] Status reporting en Node-RED

### 4.4 UI Configuration
- [ ] Form para action type selection
- [ ] Dynamic parameters configuration
- [ ] State machine visualization (opcional)
- [ ] Help y examples integrados

### 4.5 Testing App Scenarios
- [ ] Basic action request/response flow
- [ ] State transition chains
- [ ] Error scenarios y recovery
- [ ] Multi-node coordination testing

## Fase 5: A dónde hemos llegado
*[Por completar tras la ejecución]*

---

## Metadatos
- **Fecha Inicio**: TBD
- **Fecha Fin**: TBD
- **Responsable**: Agente AI
- **Estado**: Planificado
- **Confianza**: 7/10
