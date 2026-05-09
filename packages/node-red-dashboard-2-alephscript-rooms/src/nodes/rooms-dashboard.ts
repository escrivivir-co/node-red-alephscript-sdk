import { Node, NodeAPI, NodeDef, NodeMessage } from 'node-red'
import { RoomsConfigNode } from '../node-types'

interface DashboardStore {
  save(base: DashboardBaseNode, node: Node, msg: NodeMessage): void;
}

interface DashboardBaseNode extends Node {
  stores?: {
    data?: DashboardStore;
  };
}

interface DashboardEvents {
  onInput?: (msg: NodeMessage, send: (msg?: NodeMessage) => void) => void | Promise<void>;
  onSocket?: Record<string, (conn: unknown, id: string, msg: NodeMessage) => void>;
  onError?: (error: Error) => void;
}

interface DashboardGroupNode extends Node {
  register(node: Node, config: RoomsDashboardNodeDef, evts: DashboardEvents): void;
  getBase(): DashboardBaseNode;
}

interface RoomsDashboardNodeDef extends NodeDef {
  config: string
  group: string
  order: number
  width: number
  height: number
  title: string
  defaultRoom: string
  serverMode?: string
  namespace?: string
}

interface RoomsDashboardNode extends Node {
  configNode?: RoomsConfigNode
}

function updateStatus (node: Node, msg: NodeMessage): void {
  if (msg.topic === 'SET_SERVER_STATE') {
    const clients = Number((msg.payload as Record<string, unknown>)?.clients || 0)
    node.status({ fill: 'green', shape: 'dot', text: `${clients} clients` })
    return
  }

  if (msg.topic === 'rooms/log') {
    const payload = (msg.payload || {}) as { level?: string; action?: string }
    const fill = payload.level === 'error' ? 'red' : payload.level === 'warn' ? 'yellow' : 'blue'
    node.status({ fill, shape: 'dot', text: payload.action || 'rooms log' })
  }
}

export = function (RED: NodeAPI) {
  function RoomsDashboardNodeConstructor (this: RoomsDashboardNode, config: RoomsDashboardNodeDef) {
    RED.nodes.createNode(this, config)
    this.configNode = RED.nodes.getNode(config.config) as RoomsConfigNode | undefined

    const group = RED.nodes.getNode(config.group) as DashboardGroupNode | null
    if (!group) {
      this.error('Dashboard 2 group node not found')
      return
    }

    const base = group.getBase?.()
    const saveLatestMessage = (msg: NodeMessage) => {
      if (base?.stores?.data?.save) {
        base.stores.data.save(base, this, msg)
      }
    }

    const widgetConfig: RoomsDashboardNodeDef = {
      ...config,
      serverMode: this.configNode?.mode || 'managed-port',
      namespace: this.configNode?.namespace || '/runtime'
    }

    const evts: DashboardEvents = {
      onInput: async (msg: NodeMessage) => {
        saveLatestMessage(msg)
        updateStatus(this, msg)
      },
      onSocket: {
        'alephscript-rooms-ui': (_conn: unknown, id: string, msg: NodeMessage) => {
          if (id !== this.id) {
            return
          }
          this.send(msg)
        }
      },
      onError: (error: Error) => {
        this.error(error.message)
      }
    }

    group.register(this, widgetConfig, evts)
  }

  RED.nodes.registerType('alephscript-rooms-dashboard', RoomsDashboardNodeConstructor)
}