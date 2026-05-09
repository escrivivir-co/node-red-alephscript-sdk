import { SocketIoMeshLogics } from '@alephscript/mcp-core-sdk/server'
import type { IServerState } from '@alephscript/mcp-core-sdk/types'
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red'
import { Socket, io } from 'socket.io-client'
import { RoomsConfigNode, RoomsLogEntry, RoomsRuntimeInfo, buildManagedBaseUrl, createRoomsLog } from '../node-types'

interface RoomsServerNodeDef extends NodeDef {
  config: string
  requestStateOnDeploy: boolean
}

interface ManagedMeshEntry {
  key: string
  mesh: SocketIoMeshLogics
  refCount: number
  baseUrl: string
  meshBaseUrl: string
  status: 'starting' | 'ready' | 'error'
  lastError?: string
  startedAt: string
  promise?: Promise<ManagedMeshEntry>
}

interface RoomsServerNode extends Node {
  configNode?: RoomsConfigNode
  monitorSocket?: Socket
  pollTimer?: NodeJS.Timeout
  managedEntry?: ManagedMeshEntry
  runtimeCallback?: (runtime: RoomsRuntimeInfo) => void
}

interface RoomsServerCommand {
  command?: string
}

const managedMeshes = new Map<string, ManagedMeshEntry>()

function waitForServerClose (server: { close: (callback: () => void) => void } | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })
}

async function ensureManagedMesh (configNode: RoomsConfigNode): Promise<ManagedMeshEntry> {
  const baseUrl = buildManagedBaseUrl(configNode.managedPort, configNode.managedHost)
  const key = `${configNode.managedHost}:${configNode.managedPort}`
  const existing = managedMeshes.get(key)
  if (existing?.status === 'ready') {
    existing.refCount += 1
    return existing
  }
  if (existing?.promise) {
    existing.refCount += 1
    return existing.promise
  }

  const mesh = new SocketIoMeshLogics()
  const entry: ManagedMeshEntry = {
    key,
    mesh,
    refCount: 1,
    baseUrl,
    meshBaseUrl: `${baseUrl}/mesh`,
    status: 'starting',
    startedAt: new Date().toISOString()
  }

  entry.promise = mesh.init(configNode.managedPort)
    .then(() => {
      entry.status = 'ready'
      return entry
    })
    .catch((error) => {
      entry.status = 'error'
      entry.lastError = error instanceof Error ? error.message : String(error)
      managedMeshes.delete(key)
      throw error
    })

  managedMeshes.set(key, entry)
  return entry.promise
}

async function releaseManagedMesh (entry: ManagedMeshEntry | undefined): Promise<boolean> {
  if (!entry) {
    return false
  }

  entry.refCount -= 1
  if (entry.refCount > 0) {
    return false
  }

  managedMeshes.delete(entry.key)
  entry.mesh.socketServer.io.close()
  await waitForServerClose(entry.mesh.server)
  return true
}

function emitLog (node: Node, level: RoomsLogEntry['level'], action: string, message: string, data?: unknown): void {
  node.send({
    topic: 'rooms/log',
    payload: createRoomsLog('server', level, action, message, data)
  })
}

function emitServerInfo (node: Node, runtime: RoomsRuntimeInfo): void {
  node.send({
    topic: 'rooms/server-info',
    payload: runtime
  })
}

function connectMonitor (node: RoomsServerNode): void {
  const configNode = node.configNode
  if (!configNode) {
    return
  }

  const runtime = configNode.getResolvedRuntime()
  if (!runtime.available || !runtime.baseUrl) {
    return
  }

  node.monitorSocket?.disconnect()
  node.monitorSocket = io(`${runtime.baseUrl}${runtime.namespace}`, {
    transports: ['websocket', 'polling'],
    timeout: 5000,
    reconnection: true
  })

  node.monitorSocket.on('connect', () => {
    node.status({ fill: 'green', shape: 'dot', text: `${runtime.mode} connected` })
    node.monitorSocket?.emit('CLIENT_REGISTER', {
      usuario: node.name || 'rooms-server-monitor',
      sesion: `rooms-monitor-${Date.now()}`,
      type: 'NodeRedRoomsServerMonitor'
    })
    emitLog(node, 'info', 'monitor_connected', `Connected to Rooms runtime at ${runtime.baseUrl}${runtime.namespace}`)
    requestServerState(node)
  })

  node.monitorSocket.on('disconnect', (reason: string) => {
    node.status({ fill: 'red', shape: 'ring', text: 'monitor disconnected' })
    emitLog(node, 'warn', 'monitor_disconnected', reason)
  })

  node.monitorSocket.on('connect_error', (error: Error) => {
    node.status({ fill: 'red', shape: 'ring', text: 'monitor error' })
    emitLog(node, 'error', 'monitor_error', error.message)
  })

  node.monitorSocket.on('SET_SERVER_STATE', (state: IServerState) => {
    node.status({ fill: 'green', shape: 'dot', text: `${state.clients || 0} clients / ${state.rooms?.length || 0} rooms` })
    node.send({ topic: 'SET_SERVER_STATE', payload: state })
  })
}

function requestServerState (node: RoomsServerNode): void {
  if (!node.monitorSocket?.connected) {
    return
  }

  node.monitorSocket.emit('ROOM_MESSAGE', {
    event: 'GET_SERVER_STATE',
    room: 'ENGINE_THREADS',
    data: {
      requesterName: node.name || 'rooms-server-monitor'
    }
  })
}

function startPolling (node: RoomsServerNode): void {
  node.pollTimer && clearInterval(node.pollTimer)
  const interval = node.configNode?.pollIntervalMs || 5000
  node.pollTimer = setInterval(() => requestServerState(node), interval)
}

function stopPolling (node: RoomsServerNode): void {
  if (node.pollTimer) {
    clearInterval(node.pollTimer)
    node.pollTimer = undefined
  }
}

async function bootstrapRuntime (node: RoomsServerNode): Promise<void> {
  const configNode = node.configNode
  if (!configNode) {
    return
  }

  if (configNode.mode === 'same-origin') {
    const runtime = configNode.getResolvedRuntime()
    emitServerInfo(node, runtime)
    node.status({ fill: 'yellow', shape: 'ring', text: 'same-origin experimental' })
    emitLog(node, 'warn', 'same_origin_not_enabled', runtime.note || 'same-origin mode is not enabled in this MVP build')
    return
  }

  if (configNode.mode === 'managed-port') {
    node.status({ fill: 'yellow', shape: 'ring', text: 'starting managed-port' })
    node.managedEntry = await ensureManagedMesh(configNode)
    const runtime: RoomsRuntimeInfo = {
      mode: 'managed-port',
      baseUrl: node.managedEntry.baseUrl,
      namespace: configNode.namespace,
      internal: true,
      available: true,
      meshBaseUrl: node.managedEntry.meshBaseUrl,
      startedAt: node.managedEntry.startedAt,
      note: 'Managed-port runtime active inside Node-RED container'
    }
    configNode.setRuntimeInfo(runtime)
    emitServerInfo(node, runtime)
    emitLog(node, 'info', 'managed_port_started', `Managed Rooms runtime listening on ${runtime.baseUrl}`)
  } else {
    const runtime = configNode.getResolvedRuntime()
    emitServerInfo(node, runtime)
    emitLog(node, runtime.available ? 'info' : 'warn', 'external_runtime', runtime.available ? `Using external runtime ${runtime.baseUrl}` : 'External runtime URL missing')
  }

  connectMonitor(node)
  startPolling(node)
}

function handleCommand (node: RoomsServerNode, msg: NodeMessage): void {
  const payload = (msg.payload || {}) as RoomsServerCommand & Record<string, unknown>
  const command = payload.command || msg.topic

  switch (command) {
    case 'get_server_state':
    case 'refresh_state':
      requestServerState(node)
      break
    case 'start_server':
      bootstrapRuntime(node).catch((error) => {
        emitLog(node, 'error', 'start_server_failed', error instanceof Error ? error.message : String(error))
      })
      break
    default:
      break
  }
}

export = function (RED: NodeAPI) {
  function RoomsServerNodeConstructor (this: RoomsServerNode, config: RoomsServerNodeDef) {
    RED.nodes.createNode(this, config)
    this.configNode = RED.nodes.getNode(config.config) as RoomsConfigNode | undefined

    if (!this.configNode) {
      this.status({ fill: 'red', shape: 'ring', text: 'missing config' })
      this.error('Rooms config node not found')
      return
    }

    this.runtimeCallback = (runtime) => {
      emitServerInfo(this, runtime)
    }
    this.configNode.addRuntimeCallback(this.runtimeCallback)

    bootstrapRuntime(this).catch((error) => {
      this.status({ fill: 'red', shape: 'ring', text: 'runtime error' })
      emitLog(this, 'error', 'runtime_bootstrap_failed', error instanceof Error ? error.message : String(error))
    })

    this.on('input', (msg: NodeMessage) => {
      handleCommand(this, msg)
    })

    this.on('close', (_removed: boolean, done?: () => void) => {
      stopPolling(this)
      this.monitorSocket?.disconnect()
      this.monitorSocket = undefined
      if (this.configNode && this.runtimeCallback) {
        this.configNode.removeRuntimeCallback(this.runtimeCallback)
      }

      releaseManagedMesh(this.managedEntry)
        .then((stopped) => {
          if (stopped && this.configNode?.mode === 'managed-port') {
            this.configNode.clearRuntimeInfo()
          }
        })
        .finally(() => {
          done?.()
        })
    })
  }

  RED.nodes.registerType('alephscript-rooms-server', RoomsServerNodeConstructor)
}