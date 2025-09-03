# Implementation Checklist — node-red-alephscript-sdk

Estado general: En curso

- [x] Fase de búsqueda (Iteración 1) — análisis de codebase y plan
  - [x] Mapear repos clave y roles (core/orchestrator, socket server, UIs)
  - [x] Identificar Channel Agents (app/sys/ui) y Orchestrator como contratos
  - [x] Revisar patrón de distribución (postinstall → public_templates)
  - [x] Decidir layout de monorepo (workspaces en `packages/*`)
  - [x] Publicar Iteración 1: `vibecoding/docs/iteration_01.md`

---

## Iteración 2 — Foundation & Setup (node-red-contrib-alephscript)
- [ ] Normalizar workspaces a `packages/*` en `package.json`
- [ ] Crear `packages/node-red-contrib-alephscript/` (TypeScript, CJS build)
- [ ] tsconfig base + tsup/tsc build scripts
- [ ] Configurar Jest para tests
- [ ] Scripts npm (build, dev, test, lint)

## Iteración 3 — Bot Node
- [ ] Diseñar nodo Bot (config UI + credenciales)
- [ ] Implementar AlephScriptClient wrapper (Socket.IO, registro, rooms)
- [ ] Eventos básicos y reconexión
- [ ] Tests y ejemplo de flujo

## Iteración 4 — App Channel Node
- [ ] Integración con app-channel-agent
- [ ] Configuración de acciones y estados
- [ ] Tests de transiciones

## Iteración 5 — Sys Channel Node
- [ ] Health/metrics + alerting
- [ ] Integración con sys-channel-agent
- [ ] Widgets básicos de estado

## Iteración 6 — UI Channel Node
- [ ] Notificaciones y phases
- [ ] Integración con Dashboard 2.0

## Iteración 7 — Orchestrator Node
- [ ] Adaptar pipeline RxJS para Node-RED
- [ ] Routing multi-canal y coordinación
- [ ] Pruebas multi-bot

## Iteración 8 — Dashboard 2.0 Panel
- [ ] Bot Registry (máx 2 bots, rooms)
- [ ] Room Cross-Communication Tester
- [ ] Live Stream Monitor + Channel Agent Monitor

## Iteración 9 — node-red-gamify-ui (Angular)
- [ ] Scaffolding Angular
- [ ] Clase GamificationUI específica + integración canales
- [ ] Node-RED discovery + IFrame router (editor/dashboard)
- [ ] Postinstall → copia a `public_templates/`

## Iteración 10 — Distribución & Release
- [ ] Scripts postinstall en monorepo
- [ ] Build conjunto y empaquetado
- [ ] Documentación de instalación/uso
- [ ] Preparación de release

---

Referencias
- Iteración 1: `vibecoding/docs/iteration_01.md`
- Master checklist: `vibecoding/MASTER_CHECKLIST.md`
