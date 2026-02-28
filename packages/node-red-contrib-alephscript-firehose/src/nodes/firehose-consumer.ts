import { NodeAPI, Node, NodeDef, NodeMessage } from "node-red";
import WebSocket from "ws";
import { JetstreamEvent, FirehoseConsumerMode, FirehoseConsumerModeConfig } from "../lib/types";

// Console logger with timestamps for Node-RED debugging
const LOG_PREFIX = "[NR-Firehose]";
const log = {
	info: (msg: string, data?: any) => console.log(`${new Date().toISOString()} ${LOG_PREFIX} ℹ️  ${msg}`, data ? JSON.stringify(data) : ""),
	warn: (msg: string, data?: any) => console.warn(`${new Date().toISOString()} ${LOG_PREFIX} ⚠️  ${msg}`, data ? JSON.stringify(data) : ""),
	error: (msg: string, data?: any) => console.error(`${new Date().toISOString()} ${LOG_PREFIX} ❌ ${msg}`, data ? JSON.stringify(data) : ""),
	debug: (msg: string, data?: any) => console.log(`${new Date().toISOString()} ${LOG_PREFIX} 🔍 ${msg}`, data ? JSON.stringify(data) : ""),
	success: (msg: string, data?: any) => console.log(`${new Date().toISOString()} ${LOG_PREFIX} ✅ ${msg}`, data ? JSON.stringify(data) : ""),
};

/**
 * MCP HTTP Client helper
 * Handles SSE responses from StreamableHTTPServerTransport
 */
async function mcpCall(endpoint: string, method: string, params: any): Promise<any> {
	const body = {
		jsonrpc: "2.0",
		id: Date.now(),
		method,
		params,
	};

	log.debug("MCP call", { endpoint, method, params });

	const res = await fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json, text/event-stream",
		},
		body: JSON.stringify(body),
	});

	const contentType = res.headers.get("content-type") || "";
	const text = await res.text();

	log.debug("MCP response", { status: res.status, contentType, textLength: text.length });

	// Handle SSE response (text/event-stream)
	if (contentType.includes("text/event-stream")) {
		// Parse SSE format: "event: message\ndata: {...}\n\n"
		const lines = text.split("\n");
		for (const line of lines) {
			if (line.startsWith("data: ")) {
				const jsonStr = line.substring(6); // Remove "data: " prefix
				try {
					return JSON.parse(jsonStr);
				} catch (e) {
					log.warn("Failed to parse SSE data line", { line });
				}
			}
		}
		// No data line found, return raw
		log.warn("No data line in SSE response", { text: text.substring(0, 200) });
		return { error: "No data in SSE response" };
	}

	// Handle plain JSON response
	if (contentType.includes("application/json")) {
		return JSON.parse(text);
	}

	// Unknown format
	log.warn("Unknown content type", { contentType, text: text.substring(0, 200) });
	return { error: `Unknown content type: ${contentType}` };
}

interface ConsumerDef extends NodeDef {
	config: string;
	jetstreamUrl: string;
	collections: string;
	autoStart: boolean;
}

interface ConsumerNode extends Node {
	config: any;
	jetstreamUrl: string;
	collections: string[];
	autoStart: boolean;
	ws: WebSocket | null;
	isRunning: boolean;
	isPaused: boolean;
	shouldReconnect: boolean;
	reconnectCount: number;
	reconnectTimer: ReturnType<typeof setTimeout> | null;
	stats: { received: number; errors: number; batches: number };
	rateCounter: number;
	rateTimer: ReturnType<typeof setInterval> | null;
	// Mode state
	modeConfig: FirehoseConsumerModeConfig;
	batchCount: number;
	intervalTimer: ReturnType<typeof setInterval> | null;
}

export = function (RED: NodeAPI) {
	log.info("🚀 firehose-consumer node type loading...");

	function ConsumerConstructor(this: ConsumerNode, config: ConsumerDef) {
		RED.nodes.createNode(this, config);
		log.info("📦 ConsumerConstructor called", { nodeId: this.id, configId: config.config });
		this.config = RED.nodes.getNode(config.config);
		this.jetstreamUrl = config.jetstreamUrl || "wss://jetstream1.us-east.bsky.network/subscribe";
		this.collections = (config.collections || "app.bsky.feed.post").split(",").map(s => s.trim());
		this.autoStart = config.autoStart !== false;
		log.debug("Node config", { jetstreamUrl: this.jetstreamUrl, collections: this.collections, autoStart: this.autoStart });
		this.ws = null;
		this.isRunning = false;
		this.isPaused = false;
		this.shouldReconnect = false;
		this.reconnectCount = 0;
		this.reconnectTimer = null;
		this.stats = { received: 0, errors: 0, batches: 0 };
		this.rateCounter = 0;
		this.rateTimer = null;
		this.batchCount = 0;
		this.intervalTimer = null;

		// Get mode config from the shared config node
		this.modeConfig = this.config?.getConsumerModeConfig?.() ?? { mode: FirehoseConsumerMode.STREAM };
		log.info("🎛️ Mode config loaded", this.modeConfig);

		if (this.autoStart) {
			log.info("🟢 autoStart=true, starting...");
			startConsuming.call(this);
		} else {
			log.info("⚪ autoStart=false, waiting for input");
			this.status({ fill: "grey", shape: "ring", text: "stopped" });
		}

		this.on("input", (msg: NodeMessage, send, done) => {
			const cmd = (msg.payload as string)?.toString?.() ?? "";
			log.info("📥 INPUT received", { cmd });
			if (cmd === "start") {
				log.info("▶️ Command: start");
				startConsuming.call(this);
			} else if (cmd === "stop") {
				log.info("⏹️ Command: stop");
				stopConsuming.call(this);
			} else if (cmd === "resume") {
				log.info("▶️ Command: resume");
				resumeConsuming.call(this);
			} else if (cmd === "status") {
				log.debug("📊 Command: status");
				send({
					payload: {
						isRunning: this.isRunning,
						isPaused: this.isPaused,
						mode: this.modeConfig,
						stats: this.stats,
						batchCount: this.batchCount,
					},
					topic: "firehose-status",
				});
			} else {
				log.warn("Unknown command", { cmd });
			}
			done();
		});

		this.on("close", () => {
			stopConsuming.call(this);
		});
	}

	function buildUrl(this: ConsumerNode): string {
		const url = new URL(this.jetstreamUrl);
		for (const col of this.collections) {
			url.searchParams.append("wantedCollections", col);
		}
		return url.toString();
	}

	function startConsuming(this: ConsumerNode) {
		if (this.isRunning && !this.isPaused) {
			log.warn("startConsuming: already running");
			return;
		}
		log.info("▶️ START consuming", { mode: this.modeConfig, url: this.jetstreamUrl });
		this.isRunning = true;
		this.isPaused = false;
		this.shouldReconnect = true;
		this.reconnectCount = 0;
		this.rateCounter = 0;
		this.batchCount = 0;

		// Check if we're in MCP-connected mode
		const mcpMode = this.config?.getMode?.();
		log.debug("Config mode check", { mcpMode });

		if (mcpMode === "mcp-connected") {
			// MCP-CONNECTED MODE: Delegate to MCP server, don't connect WebSocket locally
			log.info("📡 MCP-connected mode: delegating to MCP Firehose server (no local WebSocket)");
			this.status({ fill: "yellow", shape: "ring", text: "sending to MCP server..." });
			startMcpMode.call(this);
			return; // Don't connect locally!
		}

		// STANDALONE MODE: Connect WebSocket directly
		log.info("🔌 Standalone mode: connecting WebSocket directly");

		// Rate display timer
		if (!this.rateTimer) {
			log.debug("Starting rate display timer");
			this.rateTimer = setInterval(() => {
				if (this.isRunning && !this.isPaused) {
					const modeLabel = this.modeConfig.mode !== FirehoseConsumerMode.STREAM
						? ` [${this.modeConfig.mode} ${this.batchCount}/${getBatchLimit(this)}]`
						: "";
					this.status({ fill: "green", shape: "dot", text: `consuming ${this.rateCounter}/s (${this.stats.received} total)${modeLabel}` });
					this.rateCounter = 0;
				}
			}, 1000);
		}

		log.debug("Calling connect()...");
		connect.call(this);
		startIntervalIfNeeded.call(this);
	}

	/** MCP-connected mode: send commands to MCP server and poll for results */
	async function startMcpMode(this: ConsumerNode) {
		const mcpUrl = this.config?.getMcpUrl?.();
		if (!mcpUrl) {
			log.error("No MCP URL configured!");
			this.status({ fill: "red", shape: "dot", text: "No MCP URL configured" });
			return;
		}
		const endpoint = mcpUrl.endsWith("/") ? mcpUrl : mcpUrl + "/";
		const mc = this.modeConfig;

		try {
			// Step 1: Configure mode
			log.info("📡 Step 1: Configure mode on MCP server", { endpoint, mode: mc });
			this.status({ fill: "yellow", shape: "ring", text: "configuring mode..." });

			const configResult = await mcpCall(endpoint, "tools/call", {
				name: "firehose_configure_mode",
				arguments: {
					mode: mc.mode,
					quantity: typeof mc.quantity === "string" ? parseInt(mc.quantity, 10) : mc.quantity,
					batchSize: mc.batchSize,
				},
			});
			log.success("Mode configured on MCP server", configResult);

			// Step 2: Start firehose with jetstreamUrl from config
			const jetstreamUrl = this.config?.jetstreamUrl || "wss://jetstream2.us-east.bsky.network/subscribe";
			log.info("📡 Step 2: Start firehose on MCP server", { jetstreamUrl });
			this.status({ fill: "yellow", shape: "ring", text: "starting firehose..." });

			const startResult = await mcpCall(endpoint, "tools/call", {
				name: "firehose_start",
				arguments: {
					jetstreamUrl,
				},
			});
			log.success("Firehose started on MCP server", { jetstreamUrl, startResult });
			this.status({ fill: "green", shape: "dot", text: "MCP firehose started" });

			// Start polling for stats
			startMcpPolling.call(this, endpoint);
		} catch (err: any) {
			log.error(`MCP communication failed: ${err.message}`);
			this.status({ fill: "red", shape: "dot", text: `MCP error: ${err.message}` });
		}
	}

	/** Poll MCP server for raw filtered events (no labeling — delegate to Node-RED pipeline) */
	function startMcpPolling(this: ConsumerNode, endpoint: string) {
		log.info("📊 Starting MCP raw event polling (cursor-based)");

		let cursor: number | undefined = undefined;
		let pollCount = 0;

		if (!this.rateTimer) {
			this.rateTimer = setInterval(async () => {
				if (!this.isRunning) return;
				pollCount++;

				try {
					// Fetch raw filtered events using cursor for incremental polling
					const data = await mcpCall(endpoint, "tools/call", {
						name: "firehose_get_raw",
						arguments: {
							limit: 100,
							...(cursor !== undefined ? { since: cursor } : {}),
						},
					});

					if (data.result?.content?.[0]?.text) {
						const result = JSON.parse(data.result.content[0].text);
						const events: JetstreamEvent[] = result.events || [];
						const newCursor: number = result.cursor;
						const rawBufferSize: number = result.bufferSize ?? 0;

						// Update cursor for next poll
						cursor = newCursor;

						// Emit each raw event as JetstreamEvent with topic "firehose"
						// This feeds the same Node-RED pipeline as standalone mode
						for (const event of events) {
							this.stats.received++;
							this.rateCounter++;
							this.send({ payload: event, topic: "firehose" });
						}

						if (events.length > 0) {
							log.info("📤 Raw events emitted", { count: events.length, cursor: newCursor, rawBufferSize });
						}

						// Log stats periodically (every 5 polls = 10s)
						if (pollCount % 5 === 0) {
							log.debug("📊 MCP poll stats", { totalReceived: this.stats.received, cursor, rawBufferSize });
						}

						// Status update
						this.status({ fill: "green", shape: "dot", text: `MCP: ${this.stats.received} recv, ${this.rateCounter}/poll (raw buf: ${rawBufferSize})` });
						this.rateCounter = 0;
					} else {
						log.warn("Poll response missing content", { data: JSON.stringify(data).substring(0, 200) });
					}

					// Also check consumer status for paused/stopped
					if (pollCount % 3 === 0) {
						try {
							const statsData = await mcpCall(endpoint, "tools/call", {
								name: "firehose_get_stats",
								arguments: {},
							});
							if (statsData.result?.content?.[0]?.text) {
								const stats = JSON.parse(statsData.result.content[0].text);
								const status = stats.consumerStatus;
								const isPaused = stats.consumerPaused;

								if (status === "paused" || isPaused) {
									this.isPaused = true;
									this.status({ fill: "blue", shape: "ring", text: `MCP paused (${this.stats.received} recv)` });
								} else if (status === "stopped") {
									this.status({ fill: "red", shape: "ring", text: `MCP stopped (${this.stats.received} recv)` });
								}
							}
						} catch {
							// Non-critical, just skip status check
						}
					}
				} catch (err: any) {
					log.warn("MCP poll failed", { error: err.message });
				}
			}, 2000);
		}
	}

	function stopConsuming(this: ConsumerNode) {
		log.info("⏹️ STOP consuming", { stats: this.stats });
		this.isRunning = false;
		this.isPaused = false;
		this.shouldReconnect = false;
		clearIntervalTimer.call(this);
		if (this.reconnectTimer) {
			log.debug("Clearing reconnect timer");
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.rateTimer) {
			log.debug("Clearing rate/poll timer");
			clearInterval(this.rateTimer);
			this.rateTimer = null;
		}

		// In MCP-connected mode, also stop the MCP server
		const mcpMode = this.config?.getMode?.();
		if (mcpMode === "mcp-connected") {
			const mcpUrl = this.config?.getMcpUrl?.();
			if (mcpUrl) {
				const endpoint = mcpUrl.endsWith("/") ? mcpUrl : mcpUrl + "/";
				log.info("📡 Sending stop to MCP server", { endpoint });
				mcpCall(endpoint, "tools/call", { name: "firehose_stop", arguments: {} })
					.then(data => {
						log.success("MCP server stopped", data);
					})
					.catch(err => {
						log.warn("Failed to stop MCP server", { error: err.message });
					});
			}
		}

		if (this.ws) {
			log.debug("Closing WebSocket");
			this.ws.close();
			this.ws = null;
		}
		this.status({ fill: "red", shape: "ring", text: `stopped (${this.stats.received} total, ${this.stats.batches} batches)` });
		log.info("⏹️ STOP complete");
	}

	function resumeConsuming(this: ConsumerNode) {
		if (!this.isRunning || !this.isPaused) {
			log.warn("resumeConsuming: not paused", { isRunning: this.isRunning, isPaused: this.isPaused });
			return;
		}
		log.info("▶️ RESUME consuming");
		this.isPaused = false;
		this.batchCount = 0;
		this.status({ fill: "yellow", shape: "ring", text: "resuming..." });

		// In MCP-connected mode, send resume to MCP server
		const mcpMode = this.config?.getMode?.();
		if (mcpMode === "mcp-connected") {
			const mcpUrl = this.config?.getMcpUrl?.();
			if (mcpUrl) {
				const endpoint = mcpUrl.endsWith("/") ? mcpUrl : mcpUrl + "/";
				log.info("📡 Sending resume to MCP server", { endpoint });
				mcpCall(endpoint, "tools/call", { name: "firehose_resume", arguments: {} })
					.then(data => {
						log.success("MCP server resumed", data);
						this.status({ fill: "green", shape: "dot", text: "MCP resumed" });
					})
					.catch(err => {
						log.error("Failed to resume MCP server", { error: err.message });
						this.status({ fill: "red", shape: "dot", text: `MCP error: ${err.message}` });
					});
			}
			return; // Don't connect locally
		}

		// Standalone mode: connect WebSocket
		connect.call(this);
	}

	function pauseConsuming(this: ConsumerNode) {
		log.info("⏸️ PAUSE - batch complete", { batchCount: this.batchCount, stats: this.stats });
		this.isPaused = true;
		this.stats.batches++;
		if (this.ws) {
			log.debug("Closing WebSocket for pause");
			this.ws.close();
			this.ws = null;
		}
		const hint = this.modeConfig.mode === FirehoseConsumerMode.N_FIRST
			? 'Send "resume" to continue'
			: `Auto-resume in ${this.modeConfig.quantity ?? 10000}ms`;
		this.status({ fill: "blue", shape: "ring", text: `paused (batch #${this.stats.batches}, ${this.batchCount} msgs) — ${hint}` });
	}

	function getBatchLimit(node: ConsumerNode): number {
		const mc = node.modeConfig;
		if (mc.mode === FirehoseConsumerMode.N_FIRST) return mc.quantity ?? 50;
		if (mc.mode === FirehoseConsumerMode.N_FIRST_INTERVAL) return mc.batchSize ?? mc.quantity ?? 50;
		return Infinity;
	}

	function checkBatchLimit(this: ConsumerNode) {
		if (this.modeConfig.mode === FirehoseConsumerMode.STREAM) return;
		this.batchCount++;
		const limit = getBatchLimit(this);
		// Log progress every 10 messages or when near limit
		if (this.batchCount % 10 === 0 || this.batchCount >= limit - 5) {
			log.debug(`📊 Batch progress: ${this.batchCount}/${limit}`);
		}
		if (this.batchCount >= limit) {
			log.success(`🎯 Batch limit reached: ${this.batchCount}/${limit}`);
			pauseConsuming.call(this);
		}
	}

	function clearIntervalTimer(this: ConsumerNode) {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
			this.intervalTimer = null;
		}
	}

	function startIntervalIfNeeded(this: ConsumerNode) {
		clearIntervalTimer.call(this);
		if (this.modeConfig.mode !== FirehoseConsumerMode.N_FIRST_INTERVAL) {
			log.debug("Interval timer not needed for mode", { mode: this.modeConfig.mode });
			return;
		}
		const intervalMs = this.modeConfig.quantity ?? 10000;
		log.info("⏱️ Starting interval timer", { intervalMs });
		this.intervalTimer = setInterval(() => {
			log.debug("⏱️ Interval tick", { isPaused: this.isPaused });
			if (this.isPaused) {
				resumeConsuming.call(this);
			}
		}, intervalMs);
	}

	/** In mcp-connected mode, call firehose_configure_mode on the MCP server */
	function sendModeToMcpServer(this: ConsumerNode) {
		const mcpUrl = this.config?.getMcpUrl?.();
		log.debug("sendModeToMcpServer", { mcpUrl, hasConfig: !!this.config });
		if (!mcpUrl) {
			log.warn("No MCP URL configured, skipping MCP mode sync");
			return;
		}
		const mc = this.modeConfig;
		// MCP Server uses POST / (root), not /mcp
		const endpoint = mcpUrl.endsWith("/") ? mcpUrl : mcpUrl + "/";
		log.info("📡 Sending mode config to MCP server", { endpoint, mode: mc });
		mcpCall(endpoint, "tools/call", {
			name: "firehose_configure_mode",
			arguments: {
				mode: mc.mode,
				quantity: typeof mc.quantity === "string" ? parseInt(mc.quantity, 10) : mc.quantity,
				batchSize: mc.batchSize,
			},
		}).then(data => {
			log.success("MCP server mode configured", data);
		}).catch((err: any) => {
			log.error(`Failed to send mode config to MCP server: ${err.message}`);
			this.warn(`Failed to send mode config to MCP server: ${err.message}`);
		});
	}

	function connect(this: ConsumerNode) {
		const url = buildUrl.call(this);
		log.info("🔌 CONNECT attempt", { url: url.substring(0, 80) + "..." });
		try {
			log.debug("Creating WebSocket instance...");
			this.ws = new WebSocket(url);
			log.debug("WebSocket instance created, waiting for events...");
		} catch (err: any) {
			log.error("WebSocket constructor threw", { error: err?.message });
			this.stats.errors++;
			scheduleReconnect.call(this);
			return;
		}

		this.status({ fill: "yellow", shape: "ring", text: "connecting..." });

		this.ws.on("open", () => {
			log.success("🟢 WebSocket OPEN - connected!");
			this.reconnectCount = 0;
			this.status({ fill: "green", shape: "dot", text: "connected" });
		});

		this.ws.on("message", (data: WebSocket.Data) => {
			this.stats.received++;
			this.rateCounter++;
			// Log first message and every 100
			if (this.stats.received === 1) {
				log.success("📨 First message received!");
			} else if (this.stats.received % 100 === 0) {
				log.debug(`📨 Messages received: ${this.stats.received}`);
			}
			try {
				const event: JetstreamEvent = JSON.parse(data.toString());
				this.send({ payload: event, topic: "firehose" });
				checkBatchLimit.call(this);
			} catch (parseErr: any) {
				log.error("Parse error", { error: parseErr?.message });
				this.stats.errors++;
			}
		});

		this.ws.on("error", (err: Error) => {
			log.error("🟠 WebSocket ERROR", { error: err?.message });
			this.stats.errors++;
		});

		this.ws.on("close", (code: number, reason: Buffer) => {
			const reasonStr = reason?.toString() || "no reason";
			log.warn("🔴 WebSocket CLOSE", { code, reason: reasonStr, isPaused: this.isPaused });
			this.ws = null;
			if (this.shouldReconnect && !this.isPaused) {
				log.debug("Will schedule reconnect...");
				scheduleReconnect.call(this);
			} else {
				log.debug("NOT reconnecting", { shouldReconnect: this.shouldReconnect, isPaused: this.isPaused });
			}
		});
	}

	function scheduleReconnect(this: ConsumerNode) {
		if (!this.shouldReconnect) {
			log.debug("scheduleReconnect: shouldReconnect=false, skipping");
			return;
		}
		if (this.reconnectCount >= 20) {
			log.error("❌ MAX RECONNECTS REACHED (20), giving up");
			this.isRunning = false;
			this.status({ fill: "red", shape: "dot", text: "max reconnects reached" });
			return;
		}
		this.reconnectCount++;
		const delay = Math.min(3000 * Math.pow(2, this.reconnectCount - 1), 60000);
		log.info("⏳ RECONNECT scheduled", { attempt: this.reconnectCount, maxAttempts: 20, delayMs: delay, delayS: Math.round(delay/1000) });
		this.status({ fill: "yellow", shape: "ring", text: `reconnecting in ${Math.round(delay / 1000)}s...` });
		this.reconnectTimer = setTimeout(() => {
			log.debug(`⏳ Reconnect timer fired, attempt ${this.reconnectCount}`);
			this.reconnectTimer = null;
			if (this.shouldReconnect) {
				connect.call(this);
			} else {
				log.debug("Reconnect timer fired but shouldReconnect=false");
			}
		}, delay);
	}

	RED.nodes.registerType("firehose-consumer", ConsumerConstructor);
};
