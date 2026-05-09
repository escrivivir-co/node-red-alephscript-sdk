import { NodeAPI, NodeDef } from 'node-red'
import { RoomsConfigNode, RoomsRuntimeInfo, buildManagedBaseUrl, normalizeBaseUrl, normalizeNamespace } from '../node-types'

interface RoomsConfigNodeDef extends NodeDef {
  mode: 'external' | 'managed-port' | 'same-origin'
  externalUrl: string
  namespace: string
  managedPort: number
  managedHost: string
  pollIntervalMs: number
}

function buildDefaultRuntime (node: RoomsConfigNode): RoomsRuntimeInfo {
  if (node.mode === 'external') {
    const baseUrl = normalizeBaseUrl(node.externalUrl)
    return {
      mode: 'external',
      baseUrl,
      namespace: normalizeNamespace(node.namespace),
      internal: false,
      available: Boolean(baseUrl),
      note: baseUrl ? 'Using external Rooms runtime' : 'External URL missing'
    }
  }

  if (node.mode === 'same-origin') {
    return {
      mode: 'same-origin',
      baseUrl: '',
      namespace: normalizeNamespace(node.namespace),
      internal: true,
      available: false,
      experimental: true,
      note: 'same-origin is intentionally not the default MVP mode because the SDK currently owns the default /socket.io path'
    }
  }

  const baseUrl = buildManagedBaseUrl(node.managedPort, node.managedHost)
  return {
    mode: 'managed-port',
    baseUrl,
    namespace: normalizeNamespace(node.namespace),
    internal: true,
    available: false,
    meshBaseUrl: `${baseUrl}/mesh`,
    note: 'Managed runtime not started yet'
  }
}

export = function (RED: NodeAPI) {
  function RoomsConfigNodeConstructor (this: RoomsConfigNode, config: RoomsConfigNodeDef) {
    RED.nodes.createNode(this, config)

    this.mode = config.mode || 'managed-port'
    this.externalUrl = normalizeBaseUrl(config.externalUrl)
    this.namespace = normalizeNamespace(config.namespace)
    this.managedPort = Number(config.managedPort) || 3010
    this.managedHost = (config.managedHost || '127.0.0.1').trim() || '127.0.0.1'
    this.pollIntervalMs = Number(config.pollIntervalMs) || 5000
    this.runtimeCallbacks = new Set()

    this.on('close', () => {
      this.runtimeCallbacks.clear()
      this.runtimeInfo = undefined
    })
  }

  RoomsConfigNodeConstructor.prototype.getResolvedRuntime = function (this: RoomsConfigNode): RoomsRuntimeInfo {
    return this.runtimeInfo || buildDefaultRuntime(this)
  }

  RoomsConfigNodeConstructor.prototype.setRuntimeInfo = function (this: RoomsConfigNode, runtime: RoomsRuntimeInfo): void {
    this.runtimeInfo = {
      ...runtime,
      namespace: normalizeNamespace(runtime.namespace)
    }
    this.runtimeCallbacks.forEach((callback) => callback(this.getResolvedRuntime()))
  }

  RoomsConfigNodeConstructor.prototype.clearRuntimeInfo = function (this: RoomsConfigNode): void {
    this.runtimeInfo = undefined
    const runtime = this.getResolvedRuntime()
    this.runtimeCallbacks.forEach((callback) => callback(runtime))
  }

  RoomsConfigNodeConstructor.prototype.addRuntimeCallback = function (this: RoomsConfigNode, callback: (runtime: RoomsRuntimeInfo) => void): void {
    this.runtimeCallbacks.add(callback)
  }

  RoomsConfigNodeConstructor.prototype.removeRuntimeCallback = function (this: RoomsConfigNode, callback: (runtime: RoomsRuntimeInfo) => void): void {
    this.runtimeCallbacks.delete(callback)
  }

  RED.nodes.registerType('alephscript-rooms-config', RoomsConfigNodeConstructor)
}