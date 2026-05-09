import { existsSync, readFileSync } from 'node:fs'

import { SharedSecretMap, SocketIoMeshLogics, makeSharedSecretValidator } from '@alephscript/mcp-core-sdk/server'
import type { IServerState } from '@alephscript/mcp-core-sdk/types'
import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red'
import { Socket, io } from 'socket.io-client'
import { RoomsConfigNode, RoomsLogEntry, RoomsRuntimeInfo, buildManagedBaseUrl, createRoomsLog } from '../node-types'

interface RoomsServerNodeDef extends NodeDef {
  config: string
  requestStateOnDeploy: boolean
  bindHost: string
}

interface ManagedMeshEntry {
  key: string
  mesh: SocketIoMeshLogics
  bindHost: string
  refCount: number
  authEnabled: boolean
  baseUrl: string
  healthPath: string
  meshBaseUrl: string
  monitorAuth?: {
    token: string
    room: string
    user: string
  }
  status: 'starting' | 'ready' | 'error'
  lastError?: string
  secretsFile?: string
  startedAt: string
  promise?: Promise<ManagedMeshEntry>
}

interface RoomsServerNode extends Node {
  bindHost?: string
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
const DEFAULT_BIND_HOST = '0.0.0.0'
const DEFAULT_SECRETS_FILE = '/data/rooms-secrets.json'
const DEFAULT_AUTH_ROOM = 'ROOMS_LAB'
const DEFAULT_CORS_ORIGINS = [
  'https://scriptorium.escrivivir.co',
  'https://admin.scriptorium.escrivivir.co',
  'http://127.0.0.1:1880',
  'http://localhost:1880'
]

function normalizeText (value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim()
  return normalized || fallback
}

function resolveBindHost (value: unknown): string {
  return normalizeText(value, normalizeText(process.env.ROOMS_BIND_HOST, DEFAULT_BIND_HOST))
}

function resolveSecretsFile (): string {
  return normalizeText(process.env.ROOMS_SECRETS_FILE, DEFAULT_SECRETS_FILE)
}

function resolveDefaultAuthRoom (): string {
  return normalizeText(process.env.ROOMS_DEFAULT_ROOM, DEFAULT_AUTH_ROOM)
}

function loadSharedSecrets (node: Node, secretsFile: string): SharedSecretMap | undefined {
  if (!existsSync(secretsFile)) {
    node.warn(`ROOMS_SECRETS_FILE not found at ${secretsFile}; starting Rooms runtime without authValidator (dev/local mode).`)
    return undefined
  }

  const parsed = JSON.parse(readFileSync(secretsFile, 'utf8')) as unknown
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`ROOMS_SECRETS_FILE must be a JSON object mapping room -> secret (${secretsFile})`)
  }

  const secrets = Object.entries(parsed).reduce<SharedSecretMap>((acc, [room, token]) => {
    const normalizedRoom = normalizeText(room)
    const normalizedToken = normalizeText(token)

    if (!normalizedRoom || !normalizedToken) {
      return acc
    }

    acc[normalizedRoom] = normalizedToken
    return acc
  }, {})

  return Object.keys(secrets).length > 0 ? secrets : undefined
}

function createMonitorAuth (secrets: SharedSecretMap | undefined): ManagedMeshEntry['monitorAuth'] {
  if (!secrets) {
    return undefined
  }

  const preferredRoom = resolveDefaultAuthRoom()
  const selectedRoom = secrets[preferredRoom] ? preferredRoom : Object.keys(secrets)[0]
  if (!selectedRoom) {
    return undefined
  }

  return {
    token: secrets[selectedRoom],
    room: selectedRoom,
    user: 'rooms-server-monitor'
  }
}

function waitForServerClose (server: { close: (callback: () => void) => void } | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve()
      return
    }
    server.close(() => resolve())
  })
}

async function ensureManagedMesh (node: RoomsServerNode, configNode: RoomsConfigNode, bindHost: string): Promise<ManagedMeshEntry> {
  const baseUrl = buildManagedBaseUrl(configNode.managedPort, configNode.managedHost)
  const key = `${bindHost}:${configNode.managedPort}|${configNode.managedHost}|${configNode.namespace}`
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
  const secretsFile = resolveSecretsFile()
  const secrets = loadSharedSecrets(node, secretsFile)
  const monitorAuth = createMonitorAuth(secrets)
  const entry: ManagedMeshEntry = {
    key,
    mesh,
    bindHost,
    refCount: 1,
    authEnabled: Boolean(secrets),
    baseUrl,
    healthPath: '/healthz',
    meshBaseUrl: `${baseUrl}/mesh`,
    monitorAuth,
    status: 'starting',
    secretsFile: secrets ? secretsFile : undefined,
    startedAt: new Date().toISOString()
  }

  entry.promise = mesh.init({
    port: configNode.managedPort,
    host: bindHost,
    healthPath: entry.healthPath,
    authValidator: secrets ? makeSharedSecretValidator({ secrets }) : undefined,
    cors: {
      origins: DEFAULT_CORS_ORIGINS,
      credentials: true
    },
    exposeAdminUI: false
  })
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
    auth: node.managedEntry?.monitorAuth,
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
    if (node.managedEntry?.monitorAuth?.room) {
      node.monitorSocket?.emit('CLIENT_SUSCRIBE', {
        room: node.managedEntry.monitorAuth.room,
        out: false
      })
    }
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

  node.monitorSocket.on('auth_error', (payload: unknown) => {
    const reason = typeof payload === 'object' && payload !== null && 'reason' in payload
      ? String((payload as { reason?: string }).reason || 'unauthorized')
      : 'unauthorized'
    node.status({ fill: 'red', shape: 'dot', text: `monitor auth: ${reason}` })
    emitLog(node, 'error', 'monitor_auth_error', reason, payload)
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

  const room = node.managedEntry?.monitorAuth?.room || resolveDefaultAuthRoom()

  node.monitorSocket.emit('ROOM_MESSAGE', {
    event: 'GET_SERVER_STATE',
    room,
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
    node.managedEntry = await ensureManagedMesh(node, configNode, node.bindHost || DEFAULT_BIND_HOST)
    const runtime: RoomsRuntimeInfo = {
      mode: 'managed-port',
      baseUrl: node.managedEntry.baseUrl,
      namespace: configNode.namespace,
      internal: true,
      available: true,
      authEnabled: node.managedEntry.authEnabled,
      bindHost: node.managedEntry.bindHost,
      defaultRoom: node.managedEntry.monitorAuth?.room,
      healthPath: node.managedEntry.healthPath,
      meshBaseUrl: node.managedEntry.meshBaseUrl,
      startedAt: node.managedEntry.startedAt,
      note: node.managedEntry.authEnabled
        ? `Managed-port runtime active inside Node-RED container (bind ${node.managedEntry.bindHost}, shared-secret auth enabled)`
        : `Managed-port runtime active inside Node-RED container (bind ${node.managedEntry.bindHost}, auth disabled/dev mode)`
    }
    configNode.setRuntimeInfo(runtime)
    emitServerInfo(node, runtime)
    emitLog(node, 'info', 'managed_port_started', `Managed Rooms runtime listening on ${runtime.baseUrl}`)
    if (node.managedEntry.authEnabled) {
      emitLog(node, 'info', 'managed_port_auth_enabled', `Shared-secret auth enabled from ${node.managedEntry.secretsFile}`, {
        defaultRoom: node.managedEntry.monitorAuth?.room,
        healthPath: node.managedEntry.healthPath,
        bindHost: node.managedEntry.bindHost
      })
    } else {
      emitLog(node, 'warn', 'managed_port_auth_disabled', `Secrets file missing at ${resolveSecretsFile()}; runtime started without authValidator`, {
        healthPath: node.managedEntry.healthPath,
        bindHost: node.managedEntry.bindHost
      })
    }
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
    this.bindHost = resolveBindHost(config.bindHost)

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