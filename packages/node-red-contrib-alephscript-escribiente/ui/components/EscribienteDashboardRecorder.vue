<template>
  <div :id="id" :class="['escribiente-recorder', props.className]">
    <div class="escribiente-card">
      <h3 class="escribiente-title">{{ title }}</h3>
      <div class="escribiente-row">
        <input v-model="slug" type="text" placeholder="slug de sesión">
        <select v-model="source">
          <option value="mixed">mixed</option>
          <option value="mic">mic</option>
          <option value="mp3">mp3</option>
        </select>
        <input v-model.number="chunkSec" type="number" min="5" step="5">
      </div>
      <div class="escribiente-row actions-row">
        <button type="button" class="btn-primary" @click="runPrecheck">Precheck</button>
        <button type="button" class="btn-success" @click="openSession">Abrir sesión</button>
        <button type="button" class="btn-danger" :disabled="!sessionId" @click="closeSession">Cerrar sesión</button>
        <span class="mono">{{ sessionId || 'sin sesión' }}</span>
      </div>
      <div class="status-row">
        <span :class="precheckClass">{{ precheckLabel }}</span>
      </div>
    </div>

    <div class="escribiente-card">
      <div class="escribiente-row spread-row">
        <strong>Micrófono</strong>
        <span class="timer">{{ formattedElapsed }}</span>
      </div>
      <div class="escribiente-row actions-row">
        <button type="button" class="btn-primary" :disabled="!sessionId || isRecording" @click="startMic">Play</button>
        <button type="button" class="btn-secondary" :disabled="!isRecording || isPaused" @click="pauseMic">Pause</button>
        <button type="button" class="btn-secondary" :disabled="!isPaused" @click="resumeMic">Resume</button>
        <button type="button" class="btn-danger" :disabled="!isRecording" @click="stopMic">Stop</button>
      </div>
    </div>

    <div class="escribiente-card">
      <strong>MP3 origen</strong>
      <div class="escribiente-row actions-row">
        <input ref="fileInput" type="file" accept="audio/mpeg,.mp3,audio/*">
        <button type="button" class="btn-primary" :disabled="!sessionId" @click="uploadMp3">Subir y trocear</button>
      </div>
    </div>

    <div class="escribiente-card">
      <strong>Actividad</strong>
      <div class="mono warnings" v-html="warningHtml"></div>
      <div class="log-box">
        <div v-if="!orderedChunks.length" class="chunk-empty">Sin tramos todavía.</div>
        <div v-for="chunk in orderedChunks" :key="chunk.id" class="chunk-item">
          <div>
            <strong>{{ chunk.id }}</strong>
            —
            <span :class="chunkStatusClass(chunk.status)">{{ chunk.status }}</span>
          </div>
          <div class="chunk-meta">{{ chunk.meta || '' }}</div>
          <div>{{ chunk.text || '' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EscribienteDashboardRecorder',
  inject: ['$socket', '$dataTracker'],
  props: {
    id: { type: String, required: true },
    props: { type: Object, default: () => ({}) },
    state: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      slug: 'sesion',
      source: this.props.defaultSource || 'mixed',
      chunkSec: Number(this.props.defaultChunkSec) || 60,
      sessionId: null,
      precheckReady: null,
      warnings: [],
      chunks: [],
      recorder: null,
      stream: null,
      timerHandle: null,
      elapsed: 0,
      chunkStart: 0,
      isPaused: false
    }
  },
  computed: {
    title () {
      return this.props.title || 'Alephscript Escribiente'
    },
    normalizedChunkSec () {
      const parsed = Number(this.chunkSec)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : (Number(this.props.defaultChunkSec) || 60)
    },
    isRecording () {
      return !!this.recorder
    },
    formattedElapsed () {
      const total = Math.max(0, Math.floor(this.elapsed))
      const mins = String(Math.floor(total / 60)).padStart(2, '0')
      const secs = String(total % 60).padStart(2, '0')
      return `${mins}:${secs}`
    },
    warningHtml () {
      return this.warnings.map((warning) => `• ${warning}`).join('<br>')
    },
    precheckLabel () {
      if (this.precheckReady === null) {
        return 'precheck pendiente'
      }
      return this.precheckReady ? 'entorno listo' : 'entorno no listo'
    },
    precheckClass () {
      return {
        'status-pill': true,
        'status-ok': this.precheckReady === true && this.warnings.length === 0,
        'status-warn': this.precheckReady === true && this.warnings.length > 0,
        'status-bad': this.precheckReady !== true
      }
    },
    orderedChunks () {
      return [...this.chunks].reverse()
    }
  },
  created () {
    this.$dataTracker(this.id, this.onInput, this.onLoad)
  },
  unmounted () {
    this.stopTimer()
    this.cleanupMedia()
  },
  methods: {
    emitCommand (command, extra = {}) {
      this.$socket.emit('escribiente-send', this.id, {
        payload: {
          command,
          ...extra
        }
      })
    },
    runPrecheck () {
      this.emitCommand('run_precheck')
    },
    openSession () {
      this.emitCommand('open_session', {
        slug: this.slug || 'sesion',
        source: this.source,
        chunkSec: this.normalizedChunkSec
      })
    },
    closeSession () {
      if (!this.sessionId) {
        return
      }
      this.emitCommand('close_session', { sessionId: this.sessionId })
    },
    async startMic () {
      if (!this.sessionId || this.recorder) {
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        const recorder = new MediaRecorder(stream, { mimeType })

        this.stream = stream
        this.recorder = recorder
        this.isPaused = false
        this.chunkStart = this.elapsed

        recorder.ondataavailable = async (event) => {
          if (!event.data || !event.data.size || !this.sessionId) {
            return
          }

          const startSec = this.chunkStart
          const endSec = this.elapsed || (startSec + this.normalizedChunkSec)
          this.chunkStart = endSec
          const data = await this.blobToBase64(event.data)

          this.emitCommand('mic_chunk', {
            sessionId: this.sessionId,
            data,
            mimeType: event.data.type || mimeType,
            fileName: `mic-${Date.now()}.webm`,
            startSec,
            endSec,
            chunkSec: this.normalizedChunkSec
          })
        }

        recorder.start(this.normalizedChunkSec * 1000)
        this.startTimer()
        this.addOrUpdateChunk('mic-live', 'queued', 'Grabación iniciada', `MediaRecorder chunk=${this.normalizedChunkSec}s`)
      } catch (error) {
        this.addOrUpdateChunk('mic-error', 'failed', error instanceof Error ? error.message : String(error), 'Micrófono')
      }
    },
    pauseMic () {
      if (!this.recorder) {
        return
      }
      this.recorder.pause()
      this.isPaused = true
      this.stopTimer()
    },
    resumeMic () {
      if (!this.recorder) {
        return
      }
      this.recorder.resume()
      this.isPaused = false
      this.startTimer()
    },
    stopMic () {
      if (!this.recorder) {
        return
      }
      this.recorder.stop()
      this.cleanupMedia()
      this.isPaused = false
      this.stopTimer()
    },
    async uploadMp3 () {
      if (!this.sessionId) {
        return
      }
      const file = this.$refs.fileInput?.files?.[0]
      if (!file) {
        return
      }
      const data = await this.blobToBase64(file)
      this.emitCommand('upload_mp3', {
        sessionId: this.sessionId,
        data,
        fileName: file.name,
        mimeType: file.type || 'audio/mpeg',
        chunkSec: this.normalizedChunkSec
      })
      this.addOrUpdateChunk(`upload-${Date.now()}`, 'queued', 'MP3 enviado para troceado', file.name)
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

      if (msg.topic === 'precheck_result') {
        this.precheckReady = Boolean(msg.payload?.ready)
        this.warnings = Array.isArray(msg.payload?.warnings) ? msg.payload.warnings : []
        return
      }

      if (msg.topic === 'precheck_error') {
        this.precheckReady = false
        this.warnings = [msg.payload?.error || 'Precheck error']
        return
      }

      if (msg.topic === 'session_opened') {
        this.sessionId = msg.payload?.sessionId || msg.sessionId || msg.payload?.session?.sessionId || null
        this.elapsed = 0
        this.chunks = []
        this.stopTimer()
        this.addOrUpdateChunk(this.sessionId || 'session', 'queued', 'Sesión abierta', this.slug)
        return
      }

      if (msg.topic === 'chunk_queued') {
        const chunkId = msg.payload?.chunkId || msg.chunkId
        this.addOrUpdateChunk(chunkId, 'queued', 'En cola para Whisper', msg.payload?.audioPath || '')
        return
      }

      if (msg.topic === 'chunk_completed') {
        const result = msg.payload?.result || {}
        const probability = typeof result.languageProbability === 'number' ? result.languageProbability.toFixed(2) : ''
        this.addOrUpdateChunk(result.chunkId || msg.chunkId, 'done', result.text || '', `${result.language || ''} ${probability}`.trim())
        return
      }

      if (msg.topic === 'chunk_failed') {
        const error = msg.payload?.error || {}
        this.addOrUpdateChunk(error.chunkId || msg.chunkId, 'failed', error.error || 'Error de transcripción', '')
        return
      }

      if (msg.topic === 'session_closed') {
        const info = msg.payload || {}
        this.addOrUpdateChunk('cierre', 'done', 'Sesión cerrada', info.exportZip || info.reportPath || '')
        this.sessionId = null
      }
    },
    addOrUpdateChunk (id, status, text, meta) {
      const key = id || `chunk-${Date.now()}`
      const next = { id: key, status, text, meta }
      const index = this.chunks.findIndex((chunk) => chunk.id === key)
      if (index === -1) {
        this.chunks.push(next)
      } else {
        this.chunks.splice(index, 1, next)
      }
    },
    chunkStatusClass (status) {
      return {
        'status-pill': true,
        'status-ok': status === 'done',
        'status-bad': status === 'failed',
        'status-warn': status !== 'done' && status !== 'failed'
      }
    },
    blobToBase64 (blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    },
    startTimer () {
      this.stopTimer()
      this.timerHandle = setInterval(() => {
        this.elapsed += 1
      }, 1000)
    },
    stopTimer () {
      if (this.timerHandle) {
        clearInterval(this.timerHandle)
        this.timerHandle = null
      }
    },
    cleanupMedia () {
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop())
      }
      this.stream = null
      this.recorder = null
    }
  }
}
</script>

<style scoped>
.escribiente-recorder {
  padding: 10px;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.escribiente-card {
  border: 1px solid #d9c5e6;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
}

.escribiente-title {
  margin: 0 0 8px;
  color: #8e44ad;
  font-weight: 700;
}

.escribiente-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.spread-row {
  justify-content: space-between;
}

.actions-row {
  margin-top: 8px;
}

.escribiente-row input,
.escribiente-row select {
  flex: 1;
  min-width: 120px;
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.escribiente-row button {
  padding: 6px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

.escribiente-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #8e44ad;
  color: #fff;
}

.btn-secondary {
  background: #6c757d;
  color: #fff;
}

.btn-danger {
  background: #c0392b;
  color: #fff;
}

.btn-success {
  background: #27ae60;
  color: #fff;
}

.status-row {
  margin-top: 8px;
}

.status-pill {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status-ok {
  background: #d4edda;
  color: #155724;
}

.status-warn {
  background: #fff3cd;
  color: #856404;
}

.status-bad {
  background: #f8d7da;
  color: #721c24;
}

.timer {
  font-size: 20px;
  font-weight: 700;
  color: #8e44ad;
}

.mono {
  font-family: Consolas, monospace;
  font-size: 12px;
}

.warnings {
  margin-top: 8px;
  color: #856404;
}

.log-box {
  margin-top: 8px;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
  font-size: 12px;
}

.chunk-item {
  border-bottom: 1px dashed #ddd;
  padding: 6px 0;
}

.chunk-item:last-child {
  border-bottom: none;
}

.chunk-meta {
  color: #666;
  font-size: 11px;
}

.chunk-empty {
  color: #666;
  font-style: italic;
}
</style>
