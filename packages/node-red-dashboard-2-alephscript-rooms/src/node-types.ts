import { Node } from 'node-red'

export type RoomsServerMode = 'external' | 'managed-port' | 'same-origin'

export interface RoomsRuntimeInfo {
  mode: RoomsServerMode
  baseUrl: string
  namespace: string
  internal: boolean
  available: boolean
  authEnabled?: boolean
  bindHost?: string
  defaultRoom?: string
  healthPath?: string
  meshBaseUrl?: string
  note?: string
  experimental?: boolean
  startedAt?: string
}

export interface RoomsLogEntry {
  source: 'server' | 'dummy' | 'ui'
  action: string
  message: string
  level: 'info' | 'warn' | 'error'
  at: string
  data?: unknown
}

export interface DummyAgentSnapshot {
  name: string
  session: string
  connected: boolean
  rooms: string[]
  masterRooms: string[]
  lastEvent?: string
}

export interface DummyStatusPayload {
  count: number
  connected: number
  defaultRoom: string
  agents: DummyAgentSnapshot[]
  runtime?: RoomsRuntimeInfo
}

export interface RoomsDashboardUiCommand {
  target?: 'server' | 'dummy'
  command: string
  room?: string
  count?: number
  prefix?: string
  message?: string
  event?: string
  selectedAgents?: string[]
  makeFirstMaster?: boolean
}

export interface RoomsConfigNode extends Node {
  mode: RoomsServerMode
  externalUrl: string
  namespace: string
  managedPort: number
  managedHost: string
  pollIntervalMs: number
  runtimeInfo?: RoomsRuntimeInfo
  runtimeCallbacks: Set<(runtime: RoomsRuntimeInfo) => void>
  getResolvedRuntime(): RoomsRuntimeInfo
  setRuntimeInfo(runtime: RoomsRuntimeInfo): void
  clearRuntimeInfo(): void
  addRuntimeCallback(callback: (runtime: RoomsRuntimeInfo) => void): void
  removeRuntimeCallback(callback: (runtime: RoomsRuntimeInfo) => void): void
}

export function normalizeBaseUrl (value: string): string {
  const trimmed = (value || '').trim().replace(/\/+$/g, '')
  if (!trimmed) {
    return ''
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `http://${trimmed}`
}

export function normalizeNamespace (value: string | undefined): string {
  const trimmed = (value || '/runtime').trim()
  if (!trimmed) {
    return '/runtime'
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function buildManagedBaseUrl (port: number, host = '127.0.0.1'): string {
  return `http://${host || '127.0.0.1'}:${Number(port) || 3010}`
}

export function createRoomsLog (source: RoomsLogEntry['source'], level: RoomsLogEntry['level'], action: string, message: string, data?: unknown): RoomsLogEntry {
  return {
    source,
    level,
    action,
    message,
    at: new Date().toISOString(),
    data
  }
}