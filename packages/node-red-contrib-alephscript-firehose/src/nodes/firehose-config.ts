import { NodeAPI, Node, NodeDef } from "node-red";
import { FirehoseConsumerMode, FirehoseConsumerModeConfig } from "../lib/types";

interface FirehoseConfigDef extends NodeDef {
	basePath: string;
	mcpServerUrl: string;
	languages: string;
	bufferSize: number;
	mode: string;
	consumerMode: string;
	consumerQuantity: number;
	consumerBatchSize: number;
}

interface FirehoseConfigNode extends Node {
	basePath: string;
	mcpServerUrl: string;
	languages: string[];
	bufferSize: number;
	mode: "standalone" | "mcp-connected";
	consumerModeConfig: FirehoseConsumerModeConfig;
}

export = function (RED: NodeAPI) {
	function FirehoseConfigConstructor(this: FirehoseConfigNode, config: FirehoseConfigDef) {
		RED.nodes.createNode(this, config);
		this.basePath = config.basePath || "./data/firehose";
		this.mcpServerUrl = config.mcpServerUrl || "http://localhost:3008";
		this.languages = (config.languages || "es").split(",").map(l => l.trim()).filter(Boolean);
		this.bufferSize = config.bufferSize || 500;
		this.mode = (config.mode as "standalone" | "mcp-connected") || "standalone";
		this.consumerModeConfig = {
			mode: (config.consumerMode as FirehoseConsumerMode) || FirehoseConsumerMode.STREAM,
			quantity: config.consumerQuantity || undefined,
			batchSize: config.consumerBatchSize || undefined,
		};
	}

	// Public API for dependent nodes
	FirehoseConfigConstructor.prototype.getBasePath = function (this: FirehoseConfigNode): string {
		return this.basePath;
	};

	FirehoseConfigConstructor.prototype.getMcpUrl = function (this: FirehoseConfigNode): string {
		return this.mcpServerUrl;
	};

	FirehoseConfigConstructor.prototype.getLanguages = function (this: FirehoseConfigNode): string[] {
		return this.languages;
	};

	FirehoseConfigConstructor.prototype.getMode = function (this: FirehoseConfigNode): string {
		return this.mode;
	};

	FirehoseConfigConstructor.prototype.getConsumerModeConfig = function (this: FirehoseConfigNode): FirehoseConsumerModeConfig {
		return { ...this.consumerModeConfig };
	};

	RED.nodes.registerType("firehose-config", FirehoseConfigConstructor);
};
