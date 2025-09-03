# Iteración 4: App Channel Node Implementation (`node-red-contrib-alephscript`)

## 📋 ESTADO DEL PROGRESO
- [ ] Fase 1: De dónde venimos
- [ ] Fase 2: Dónde queremos ir
- [ ] Fase 3: Opciones para ir
- [ ] Fase 4: Vamos (Ejecución)
- [ ] Fase 5: A dónde hemos llegado

---

## Fase 1: De dónde venimos
- Bot Node funcional y testado (`node-red-contrib-alephscript`)
- Protocolo Socket.IO establecido
- Conexión con AlephScript Server validada
- Base para channel nodes preparada

## Fase 2: Dónde queremos ir
- App Channel Node para gestión de acciones y estados (`node-red-contrib-alephscript`)
- Integración con app-channel-agent del orchestrator
- UI para configuración de action types y parámetros
- Testing de transiciones de estado via Node-RED flows

## Fase 3: Opciones para ir
- **Opción A**: Node separado para cada tipo de evento (Recomendada)
- **Opción B**: Node único configureable por tipo
- **Opción C**: Nodes especializados por dominio de aplicación

## Fase 4: Vamos (Ejecución)

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
