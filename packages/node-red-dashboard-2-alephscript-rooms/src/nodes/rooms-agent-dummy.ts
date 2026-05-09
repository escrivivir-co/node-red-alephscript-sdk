import { AlephScriptClient } from '@alephscript/mcp-core-sdk/client'
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red'
import { RoomsConfigNode, DummyAgentSnapshot, DummyStatusPayload, RoomsDashboardUiCommand, RoomsLogEntry, RoomsRuntimeInfo, createRoomsLog } from '../node-types'

interface RoomsAgentDummyNodeDef extends NodeDef {
  config: string
  agentCount: number
  agentPrefix: string
  defaultRoom: string
  autoStart: boolean
  makeFirstMaster: boolean
  messageEvent: string
  features: string
}

interface DummyAgentRuntime {
  name: string
  session: string
  client: AlephScriptClient
  rooms: Set<string>
  masterRooms: Set<string>
  connected: boolean
  lastEvent?: string
}

interface RoomsAgentDummyNode extends Node {
  configNode?: RoomsConfigNode
  agents: Map<string, DummyAgentRuntime>
  defaultRoom: string
  agentPrefix: string
  messageEvent: string
  featureList: string[]
  runtimeCallback?: (runtime: RoomsRuntimeInfo) => void
}

function parseFeatureList (value: string | undefined): string[] {
  return (value || 'ROOM_MESSAGE,GET_SERVER_STATE')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildSnapshot (agent: DummyAgentRuntime): DummyAgentSnapshot {
  return {
    name: agent.name,
    session: agent.session,
    connected: agent.connected,
    rooms: Array.from(agent.rooms),
    masterRooms: Array.from(agent.masterRooms),
    lastEvent: agent.lastEvent
  }
}

function emitLog (node: Node, level: RoomsLogEntry['level'], action: string, message: string, data?: unknown): void {
  node.send({ topic: 'rooms/log', payload: createRoomsLog('dummy', level, action, message, data) })
}

function emitStatus (node: RoomsAgentDummyNode): void {
  const agents = Array.from(node.agents.values()).map(buildSnapshot)
  const payload: DummyStatusPayload = {
    count: agents.length,
    connected: agents.filter((agent) => agent.connected).length,
    defaultRoom: node.defaultRoom,
    agents,
    runtime: node.configNode?.getResolvedRuntime()
  }

  node.status({
    fill: payload.connected ? 'green' : 'yellow',
    shape: payload.connected ? 'dot' : 'ring',
    text: `${payload.connected}/${payload.count} dummy agents`
  })

  node.send({ topic: 'dummy/status', payload })
}

function resetAgents (node: RoomsAgentDummyNode): void {
  node.agents.forEach((agent) => {
    agent.client.disconnect()
  })
  node.agents.clear()
  emitStatus(node)
}

function createSessionId (index: number): string {
  return `dummy-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`
}

function bindAgentEvents (node: RoomsAgentDummyNode, agent: DummyAgentRuntime): void {
  agent.client.io.on('connect', () => {
    agent.connected = true
    agent.lastEvent = 'connect'
    agent.client.register({
      usuario: agent.name,
      sesion: agent.session,
      type: 'NodeRedRoomsDummyAgent',
      features: node.featureList
    } as any)
    agent.client.io.emit('CLIENT_SUSCRIBE', { room: 'ENGINE_THREADS', out: true })
    agent.rooms.forEach((room) => {
      agent.client.subscribeRoom(room)
      if (agent.masterRooms.has(room)) {
        agent.client.handleRoom(node.featureList, room)
      }
    })
    emitLog(node, 'info', 'agent_connected', `${agent.name} connected`, buildSnapshot(agent))
    emitStatus(node)
  })

  agent.client.io.on('disconnect', (reason: string) => {
    agent.connected = false
    agent.lastEvent = `disconnect:${reason}`
    emitLog(node, 'warn', 'agent_disconnected', `${agent.name} disconnected`, { reason })
    emitStatus(node)
  })

  agent.client.io.on('connect_error', (error: Error) => {
    emitLog(node, 'error', 'agent_connect_error', `${agent.name}: ${error.message}`)
  })

  agent.client.io.onAny((event: string, ...args: unknown[]) => {
    if (['connect', 'disconnect', 'ping', 'pong'].includes(event)) {
      return
    }
    agent.lastEvent = event
    node.send({
      topic: 'dummy/event',
      payload: {
        agent: agent.name,
        event,
        args
      }
    })
    emitLog(node, 'info', 'agent_event', `${agent.name} received ${event}`, args.length === 1 ? args[0] : args)
  })
}

function createAgents (node: RoomsAgentDummyNode, count: number, prefix: string, room: string, makeFirstMaster: boolean): void {
  const runtime = node.configNode?.getResolvedRuntime()
  if (!runtime?.available || !runtime.baseUrl) {
    emitLog(node, 'warn', 'runtime_unavailable', 'Rooms runtime is not available yet')
    return
  }

  resetAgents(node)
  node.defaultRoom = room || node.defaultRoom
  node.agentPrefix = prefix || node.agentPrefix

  for (let index = 0; index < count; index += 1) {
    const name = `${node.agentPrefix}-${String(index + 1).padStart(2, '0')}`
    const session = createSessionId(index)
    const client = new AlephScriptClient(name, runtime.baseUrl, runtime.namespace, true)
    const agent: DummyAgentRuntime = {
      name,
      session,
      client,
      rooms: new Set(room ? [room] : []),
      masterRooms: new Set(),
      connected: false
    }

    if (makeFirstMaster && index === 0 && room) {
      agent.masterRooms.add(room)
    }

    bindAgentEvents(node, agent)
    node.agents.set(name, agent)
  }

  emitLog(node, 'info', 'agents_created', `Created ${count} dummy agents for ${room}`)
  emitStatus(node)
}

function resolveTargetAgents (node: RoomsAgentDummyNode, selectedAgents?: string[]): DummyAgentRuntime[] {
  if (!selectedAgents || selectedAgents.length === 0) {
    return Array.from(node.agents.values())
  }
  return selectedAgents
    .map((name) => node.agents.get(name))
    .filter((agent): agent is DummyAgentRuntime => Boolean(agent))
}

function joinRoom (node: RoomsAgentDummyNode, room: string, selectedAgents?: string[], makeFirstMaster = false): void {
  const targets = resolveTargetAgents(node, selectedAgents)
  targets.forEach((agent, index) => {
    agent.rooms.add(room)
    if (makeFirstMaster && index === 0) {
      agent.masterRooms.add(room)
    }
    if (!agent.connected) {
      return
    }
    agent.client.subscribeRoom(room)
    if (makeFirstMaster && index === 0) {
      agent.client.handleRoom(node.featureList, room)
    }
  })
  emitLog(node, 'info', 'join_room', `Joined ${room}`, { room, selectedAgents: targets.map((agent) => agent.name), makeFirstMaster })
  emitStatus(node)
}

function leaveRoom (node: RoomsAgentDummyNode, room: string, selectedAgents?: string[]): void {
  const targets = resolveTargetAgents(node, selectedAgents)
  targets.forEach((agent) => {
    if (!agent.connected) {
      return
    }
    agent.client.io.emit('CLIENT_SUSCRIBE', { room, out: true })
    agent.rooms.delete(room)
    agent.masterRooms.delete(room)
  })
  emitLog(node, 'info', 'leave_room', `Left ${room}`, { room, selectedAgents: targets.map((agent) => agent.name) })
  emitStatus(node)
}

function sendRoomMessage (node: RoomsAgentDummyNode, room: string, event: string, message: string, selectedAgents?: string[]): void {
  const targets = resolveTargetAgents(node, selectedAgents)
  const sender = targets.find((agent) => agent.connected)
  if (!sender) {
    emitLog(node, 'warn', 'send_room_message', 'No connected dummy agent available to send the message')
    return
  }
  sender.client.room(event || node.messageEvent, {
    from: sender.name,
    message,
    timestamp: new Date().toISOString()
  }, room)
  emitLog(node, 'info', 'send_room_message', `${sender.name} sent ${event || node.messageEvent} to ${room}`, { message })
}

function handleCommand (node: RoomsAgentDummyNode, msg: NodeMessage): void {
  const payload = (msg.payload || {}) as RoomsDashboardUiCommand
  const command = payload.command || msg.topic

  switch (command) {
    case 'create_agents':
      createAgents(node, Number(payload.count) || node.agents.size || 3, payload.prefix || node.agentPrefix, payload.room || node.defaultRoom, Boolean(payload.makeFirstMaster))
      break
    case 'join_room':
      joinRoom(node, payload.room || node.defaultRoom, payload.selectedAgents, Boolean(payload.makeFirstMaster))
      break
    case 'leave_room':
      leaveRoom(node, payload.room || node.defaultRoom, payload.selectedAgents)
      break
    case 'send_room_message':
      sendRoomMessage(node, payload.room || node.defaultRoom, payload.event || node.messageEvent, payload.message || 'hello from Node-RED dummy', payload.selectedAgents)
      break
    case 'reset_agents':
      resetAgents(node)
      emitLog(node, 'info', 'reset_agents', 'Dummy agents reset')
      break
    case 'get_status':
      emitStatus(node)
      break
    default:
      break
  }
}

export = function (RED: NodeAPI) {
  function RoomsAgentDummyNodeConstructor (this: RoomsAgentDummyNode, config: RoomsAgentDummyNodeDef) {
    RED.nodes.createNode(this, config)

    this.configNode = RED.nodes.getNode(config.config) as RoomsConfigNode | undefined
    this.agents = new Map()
    this.defaultRoom = config.defaultRoom || 'ROOMS_LAB'
    this.agentPrefix = config.agentPrefix || 'dummy-agent'
    this.messageEvent = config.messageEvent || 'ROOMS_LAB_MESSAGE'
    this.featureList = parseFeatureList(config.features)

    if (!this.configNode) {
      this.status({ fill: 'red', shape: 'ring', text: 'missing config' })
      this.error('Rooms config node not found')
      return
    }

    this.runtimeCallback = (runtime) => {
      if (config.autoStart !== false && runtime.available && this.agents.size === 0) {
        createAgents(this, Number(config.agentCount) || 3, this.agentPrefix, this.defaultRoom, config.makeFirstMaster !== false)
      }
    }
    this.configNode.addRuntimeCallback(this.runtimeCallback)

    const runtime = this.configNode.getResolvedRuntime()
    if (config.autoStart !== false && runtime.available) {
      createAgents(this, Number(config.agentCount) || 3, this.agentPrefix, this.defaultRoom, config.makeFirstMaster !== false)
    } else {
      emitStatus(this)
    }

    this.on('input', (msg: NodeMessage) => {
      handleCommand(this, msg)
    })

    this.on('close', (_removed: boolean, done?: () => void) => {
      if (this.configNode && this.runtimeCallback) {
        this.configNode.removeRuntimeCallback(this.runtimeCallback)
      }
      resetAgents(this)
      done?.()
    })
  }

  RED.nodes.registerType('alephscript-rooms-agent-dummy', RoomsAgentDummyNodeConstructor)
}