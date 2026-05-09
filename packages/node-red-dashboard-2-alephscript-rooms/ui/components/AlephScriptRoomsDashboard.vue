<template>
  <div :id="id" :class="['rooms-dashboard', props.className]">
    <div class="rooms-card rooms-header">
      <div>
        <h3 class="rooms-title">{{ title }}</h3>
        <div class="rooms-subtitle">
          <span class="mono">{{ serverInfo.mode || props.serverMode || 'managed-port' }}</span>
          <span>·</span>
          <span class="mono">{{ serverInfo.namespace || props.namespace || '/runtime' }}</span>
        </div>
      </div>
      <div class="rooms-header-actions">
        <span :class="connectionBadgeClass">{{ connectionLabel }}</span>
        <button type="button" class="btn btn-primary" @click="refreshState">Refresh</button>
      </div>
    </div>

    <div v-if="serverInfo.note" class="rooms-note">{{ serverInfo.note }}</div>

    <div class="rooms-summary-grid">
      <div class="rooms-card summary-card">
        <strong>Clients</strong>
        <div class="summary-number">{{ serverState.clients || 0 }}</div>
      </div>
      <div class="rooms-card summary-card">
        <strong>Namespaces</strong>
        <div class="summary-number">{{ namespaces.length }}</div>
      </div>
      <div class="rooms-card summary-card">
        <strong>Rooms</strong>
        <div class="summary-number">{{ rooms.length }}</div>
      </div>
      <div class="rooms-card summary-card">
        <strong>Usuarios</strong>
        <div class="summary-number">{{ users.length }}</div>
      </div>
    </div>

    <div class="rooms-grid-two">
      <div class="rooms-card">
        <div class="section-header">
          <strong>Namespaces</strong>
          <span class="mono">{{ namespaces.length }}</span>
        </div>
        <div class="mini-list">
          <div v-if="!namespaces.length" class="empty-state">Sin namespaces todavía.</div>
          <div v-for="item in namespaces" :key="item.name" class="mini-item">
            <div>{{ item.name }}</div>
            <div class="mono">{{ item.socketsCount }} sockets</div>
          </div>
        </div>
      </div>

      <div class="rooms-card">
        <div class="section-header">
          <strong>Rooms</strong>
          <span class="mono">{{ rooms.length }}</span>
        </div>
        <div class="mini-list">
          <div v-if="!rooms.length" class="empty-state">Sin rooms todavía.</div>
          <div v-for="item in rooms" :key="item.roomId" class="mini-item">
            <div>{{ item.roomId }}</div>
            <div class="mono">{{ item.miembros?.length || 0 }} miembros</div>
            <div class="mini-members">{{ roomMembersLabel(item) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rooms-grid-two">
      <div class="rooms-card">
        <div class="section-header">
          <strong>Usuarios</strong>
          <span class="mono">{{ users.length }}</span>
        </div>
        <div class="mini-list">
          <div v-if="!users.length" class="empty-state">Sin usuarios todavía.</div>
          <div v-for="item in users" :key="`${item.usuario}-${(item.sesion || item.sesiones?.[0] || 'user')}`" class="mini-item">
            <div>{{ item.usuario }}</div>
            <div class="mono">{{ sessionsLabel(item) }}</div>
          </div>
        </div>
      </div>

      <div class="rooms-card">
        <div class="section-header">
          <strong>Sockets</strong>
          <span class="mono">{{ socketItems.length }}</span>
        </div>
        <div class="mini-list">
          <div v-if="!socketItems.length" class="empty-state">Sin sockets todavía.</div>
          <div v-for="item in socketItems" :key="`${item.namespace}-${item.id}`" class="mini-item">
            <div>{{ item.namespace }}</div>
            <div class="mono">{{ item.id }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="rooms-card">
      <div class="section-header">
        <strong>Dummy lab</strong>
        <span class="mono">{{ dummyStatus.connected }}/{{ dummyStatus.count }} conectados</span>
      </div>
      <div class="controls-grid">
        <label>
          <span>Agentes</span>
          <input v-model.number="agentCount" type="number" min="1" step="1">
        </label>
        <label>
          <span>Prefix</span>
          <input v-model="agentPrefix" type="text" placeholder="dummy-agent">
        </label>
        <label>
          <span>Room objetivo</span>
          <input v-model="targetRoom" type="text" placeholder="ROOMS_LAB">
        </label>
        <label>
          <span>Evento</span>
          <input v-model="messageEvent" type="text" placeholder="ROOMS_LAB_MESSAGE">
        </label>
      </div>
      <div class="controls-grid controls-grid-message">
        <label class="full-width">
          <span>Mensaje de prueba</span>
          <input v-model="messageText" type="text" placeholder="hello from Dashboard 2">
        </label>
      </div>
      <div class="checkbox-row">
        <label>
          <input v-model="makeFirstMaster" type="checkbox">
          Primer agente como master
        </label>
      </div>
      <div class="action-row">
        <button type="button" class="btn btn-success" @click="createAgents">Create</button>
        <button type="button" class="btn btn-secondary" @click="joinRoom">Join</button>
        <button type="button" class="btn btn-secondary" @click="leaveRoom">Leave</button>
        <button type="button" class="btn btn-primary" @click="sendRoomMessage">Send</button>
        <button type="button" class="btn btn-danger" @click="resetAgents">Reset</button>
        <button type="button" class="btn btn-secondary" @click="requestDummyStatus">Status</button>
      </div>

      <div class="agents-panel">
        <div class="agents-panel-header">
          <strong>Dummy agents</strong>
          <button type="button" class="link-button" @click="toggleSelectAll">
            {{ selectedAgentNames.length === dummyStatus.agents.length && dummyStatus.agents.length ? 'Unselect all' : 'Select all' }}
          </button>
        </div>
        <div v-if="!dummyStatus.agents.length" class="empty-state">Aún no hay agentes dummy.</div>
        <label v-for="agent in dummyStatus.agents" :key="agent.name" class="agent-row">
          <input v-model="selectedAgentNames" type="checkbox" :value="agent.name">
          <div class="agent-main">
            <div class="agent-name">{{ agent.name }}</div>
            <div class="agent-meta mono">
              {{ agent.connected ? 'connected' : 'offline' }} · rooms: {{ (agent.rooms || []).join(', ') || '—' }}
            </div>
          </div>
        </label>
      </div>
    </div>

    <div class="rooms-card">
      <div class="section-header">
        <strong>Log</strong>
        <span class="mono">{{ logs.length }}</span>
      </div>
      <div class="log-box">
        <div v-if="!logs.length" class="empty-state">Sin eventos todavía.</div>
        <div v-for="entry in orderedLogs" :key="entry.id" :class="['log-entry', `log-${entry.level || 'info'}`]">
          <div class="log-head">
            <strong>{{ entry.source || 'rooms' }}</strong>
            <span class="mono">{{ entry.action || entry.topic || 'event' }}</span>
            <span class="mono">{{ entry.at || entry.timestamp }}</span>
          </div>
          <div class="log-message">{{ entry.message || logPayloadLabel(entry.data) }}</div>
          <pre v-if="entry.data && showExpanded(entry)" class="log-data">{{ formatJson(entry.data) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const EMPTY_STATE = {
  action: '',
  socketId: '',
  clientId: '',
  socketsPerNamespace: [],
  sockets: [],
  clients: 0,
  miembros: [],
  rooms: []
}

export default {
  name: 'AlephScriptRoomsDashboard',
  inject: ['$socket', '$dataTracker'],
  props: {
    id: { type: String, required: true },
    props: { type: Object, default: () => ({}) },
    state: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      serverInfo: {
        mode: this.props.serverMode || 'managed-port',
        namespace: this.props.namespace || '/runtime',
        baseUrl: '',
        available: false,
        note: ''
      },
      serverState: { ...EMPTY_STATE },
      dummyStatus: {
        count: 0,
        connected: 0,
        defaultRoom: this.props.defaultRoom || 'ROOMS_LAB',
        agents: []
      },
      logs: [],
      agentCount: 3,
      agentPrefix: 'dummy-agent',
      targetRoom: this.props.defaultRoom || 'ROOMS_LAB',
      messageText: 'hello from Dashboard 2',
      messageEvent: 'ROOMS_LAB_MESSAGE',
      makeFirstMaster: true,
      selectedAgentNames: []
    }
  },
  computed: {
    title () {
      return this.props.title || 'AlephScript Rooms MVP'
    },
    namespaces () {
      return Array.isArray(this.serverState.socketsPerNamespace) ? this.serverState.socketsPerNamespace : []
    },
    rooms () {
      return Array.isArray(this.serverState.rooms) ? this.serverState.rooms : []
    },
    users () {
      return Array.isArray(this.serverState.miembros) ? this.serverState.miembros : []
    },
    socketItems () {
      return this.namespaces.flatMap((namespace) => {
        const sockets = Array.isArray(namespace.sockets) ? namespace.sockets : []
        return sockets.map((socket) => ({
          namespace: namespace.name,
          id: socket.id || 'unknown'
        }))
      })
    },
    connectionLabel () {
      if (!this.serverInfo.available) {
        return 'runtime pending'
      }
      return `${this.serverState.clients || 0} clients live`
    },
    connectionBadgeClass () {
      return {
        badge: true,
        'badge-ok': this.serverInfo.available,
        'badge-warn': !this.serverInfo.available
      }
    },
    orderedLogs () {
      return [...this.logs].reverse()
    }
  },
  created () {
    this.$dataTracker(this.id, this.onInput, this.onLoad)
  },
  methods: {
    emitCommand (target, command, extra = {}) {
      this.$socket.emit('alephscript-rooms-ui', this.id, {
        payload: {
          target,
          command,
          ...extra
        }
      })
    },
    refreshState () {
      this.emitCommand('server', 'get_server_state')
    },
    createAgents () {
      this.emitCommand('dummy', 'create_agents', {
        count: this.agentCount,
        prefix: this.agentPrefix,
        room: this.targetRoom,
        makeFirstMaster: this.makeFirstMaster
      })
    },
    joinRoom () {
      this.emitCommand('dummy', 'join_room', {
        room: this.targetRoom,
        selectedAgents: this.normalizedSelectedAgents(),
        makeFirstMaster: this.makeFirstMaster
      })
    },
    leaveRoom () {
      this.emitCommand('dummy', 'leave_room', {
        room: this.targetRoom,
        selectedAgents: this.normalizedSelectedAgents()
      })
    },
    sendRoomMessage () {
      this.emitCommand('dummy', 'send_room_message', {
        room: this.targetRoom,
        selectedAgents: this.normalizedSelectedAgents(),
        event: this.messageEvent,
        message: this.messageText
      })
    },
    resetAgents () {
      this.emitCommand('dummy', 'reset_agents')
    },
    requestDummyStatus () {
      this.emitCommand('dummy', 'get_status')
    },
    normalizedSelectedAgents () {
      return Array.isArray(this.selectedAgentNames) && this.selectedAgentNames.length
        ? [...this.selectedAgentNames]
        : []
    },
    toggleSelectAll () {
      if (this.selectedAgentNames.length === this.dummyStatus.agents.length) {
        this.selectedAgentNames = []
        return
      }
      this.selectedAgentNames = this.dummyStatus.agents.map((agent) => agent.name)
    },
    onLoad (msg) {
      if (msg) {
        this.onInput(msg)
      }
    },
    onInput (msg) {
      if (!msg || !msg.topic) {
        return
      }

      if (msg.topic === 'SET_SERVER_STATE' || msg.topic === 'rooms/state') {
        this.serverState = {
          ...EMPTY_STATE,
          ...(msg.payload || {})
        }
        this.serverInfo.available = true
        this.appendLog({
          source: 'server',
          level: 'info',
          action: 'SET_SERVER_STATE',
          message: `State updated: ${this.serverState.clients || 0} clients / ${this.rooms.length} rooms`,
          data: msg.payload,
          at: new Date().toISOString()
        })
        return
      }

      if (msg.topic === 'rooms/server-info') {
        this.serverInfo = {
          ...this.serverInfo,
          ...(msg.payload || {})
        }
        this.appendLog({
          source: 'server',
          level: this.serverInfo.available ? 'info' : 'warn',
          action: 'server-info',
          message: this.serverInfo.baseUrl || this.serverInfo.note || 'Rooms runtime info updated',
          data: msg.payload,
          at: new Date().toISOString()
        })
        return
      }

      if (msg.topic === 'dummy/status') {
        this.dummyStatus = {
          ...this.dummyStatus,
          ...(msg.payload || {})
        }
        this.appendLog({
          source: 'dummy',
          level: 'info',
          action: 'dummy-status',
          message: `${this.dummyStatus.connected}/${this.dummyStatus.count} dummy agents connected`,
          data: msg.payload,
          at: new Date().toISOString()
        })
        return
      }

      if (msg.topic === 'rooms/log') {
        this.appendLog({
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...(msg.payload || {})
        })
        return
      }

      if (msg.topic === 'dummy/event') {
        this.appendLog({
          source: 'dummy',
          level: 'info',
          action: msg.payload?.event || 'dummy-event',
          message: `${msg.payload?.agent || 'agent'} emitted ${msg.payload?.event || 'event'}`,
          data: msg.payload,
          at: new Date().toISOString()
        })
      }
    },
    appendLog (entry) {
      const next = {
        id: entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        level: entry.level || 'info',
        source: entry.source || 'rooms',
        action: entry.action || entry.topic || 'event',
        message: entry.message || '',
        data: entry.data,
        at: entry.at || new Date().toISOString()
      }
      this.logs.push(next)
      while (this.logs.length > 200) {
        this.logs.shift()
      }
    },
    roomMembersLabel (room) {
      const members = Array.isArray(room.miembros) ? room.miembros : []
      return members.map((member) => member.usuario || member.name || 'user').join(', ') || '—'
    },
    sessionsLabel (user) {
      if (Array.isArray(user.sesiones) && user.sesiones.length) {
        return user.sesiones.join(', ')
      }
      return user.sesion || '—'
    },
    formatJson (value) {
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    },
    logPayloadLabel (value) {
      if (!value) {
        return ''
      }
      if (typeof value === 'string') {
        return value
      }
      if (value.message) {
        return value.message
      }
      return 'details available'
    },
    showExpanded (entry) {
      return entry.level === 'error' || entry.action === 'SET_SERVER_STATE' || entry.action === 'dummy-status'
    }
  }
}
</script>

<style scoped>
.rooms-dashboard {
  padding: 10px;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #223;
}

.rooms-card {
  border: 1px solid #e1d9ea;
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(30, 20, 60, 0.04);
}

.rooms-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.rooms-title {
  margin: 0;
  color: #5b2c6f;
}

.rooms-subtitle {
  display: flex;
  gap: 6px;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.rooms-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rooms-note {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff8e6;
  border: 1px solid #f1d38a;
  font-size: 12px;
  color: #7a5b00;
}

.rooms-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  text-align: center;
}

.summary-number {
  margin-top: 6px;
  font-size: 28px;
  font-weight: 700;
  color: #5b2c6f;
}

.rooms-grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mini-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.mini-item {
  border: 1px solid #ece8f2;
  border-radius: 8px;
  padding: 8px;
  background: #faf8fc;
}

.mini-members {
  margin-top: 4px;
  font-size: 11px;
  color: #666;
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.controls-grid-message {
  margin-top: 10px;
}

.controls-grid label,
.full-width {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.full-width {
  grid-column: 1 / -1;
}

.controls-grid input {
  padding: 7px 8px;
  border: 1px solid #d8d4df;
  border-radius: 6px;
}

.checkbox-row {
  margin-top: 10px;
  font-size: 12px;
}

.action-row {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  background: #5b2c6f;
}

.btn-secondary {
  background: #566573;
}

.btn-success {
  background: #1e8449;
}

.btn-danger {
  background: #b03a2e;
}

.agents-panel {
  margin-top: 12px;
  border-top: 1px dashed #ddd;
  padding-top: 12px;
}

.agents-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.link-button {
  border: none;
  background: transparent;
  color: #5b2c6f;
  cursor: pointer;
  font-size: 12px;
}

.agent-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid #ece8f2;
  border-radius: 8px;
  padding: 8px;
  background: #faf8fc;
  margin-bottom: 8px;
}

.agent-main {
  flex: 1;
}

.agent-name {
  font-weight: 700;
}

.agent-meta {
  font-size: 11px;
  color: #666;
  margin-top: 3px;
}

.log-box {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  border-left: 4px solid #999;
  padding: 8px 10px;
  background: #fafafa;
  border-radius: 6px;
}

.log-info {
  border-left-color: #5b2c6f;
}

.log-warn {
  border-left-color: #d4a017;
  background: #fff9ea;
}

.log-error {
  border-left-color: #c0392b;
  background: #fff0ee;
}

.log-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 11px;
  color: #555;
  margin-bottom: 4px;
}

.log-message {
  font-size: 13px;
}

.log-data {
  margin: 8px 0 0;
  padding: 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 11px;
  overflow-x: auto;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.badge-ok {
  background: #d4edda;
  color: #155724;
}

.badge-warn {
  background: #fff3cd;
  color: #856404;
}

.mono {
  font-family: Consolas, monospace;
}

.empty-state {
  color: #777;
  font-style: italic;
  font-size: 12px;
}

@media (max-width: 900px) {
  .rooms-summary-grid,
  .rooms-grid-two,
  .controls-grid {
    grid-template-columns: 1fr;
  }

  .rooms-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
