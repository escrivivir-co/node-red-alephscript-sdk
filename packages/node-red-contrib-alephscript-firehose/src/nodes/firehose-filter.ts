import { NodeAPI, Node, NodeDef, NodeMessage } from "node-red";
import { JetstreamEvent } from "../lib/types";
import { evaluateFilter, FilterConfig, DEFAULT_FILTER_CONFIG } from "../lib/FilterEngine";

interface FilterDef extends NodeDef {
	config: string;
	minTextLength: number;
	maxTextLength: number;
	languages: string;
	enableSpamFilter: boolean;
	minWords: number;
}

interface FilterNode extends Node {
	config: any;
	filterConfig: FilterConfig;
	stats: { passed: number; rejected: number };
}

export = function (RED: NodeAPI) {
	function FilterConstructor(this: FilterNode, config: FilterDef) {
		RED.nodes.createNode(this, config);
		this.config = RED.nodes.getNode(config.config);
		this.stats = { passed: 0, rejected: 0 };

		// Build filter config from node props + config node
		const languages = config.languages
			? config.languages.split(",").map(s => s.trim())
			: this.config?.getLanguages?.() ?? DEFAULT_FILTER_CONFIG.languages;

		this.filterConfig = {
			minTextLength: config.minTextLength || DEFAULT_FILTER_CONFIG.minTextLength,
			maxTextLength: config.maxTextLength || DEFAULT_FILTER_CONFIG.maxTextLength,
			languages,
			minSubstantiveWords: config.minWords || DEFAULT_FILTER_CONFIG.minSubstantiveWords,
			enableSpamFilter: config.enableSpamFilter !== false,
		};

		this.status({ fill: "grey", shape: "ring", text: "waiting" });

		this.on("input", (msg: NodeMessage, send, done) => {
			const event = msg.payload as JetstreamEvent;
			if (!event?.commit) {
				done();
				return;
			}

			const result = evaluateFilter(event, this.filterConfig);

			if (result.passed) {
				this.stats.passed++;
				// Output 1: passed events (with filter metadata)
				send([{ ...msg, payload: event, filterResult: result } as any, null]);
			} else {
				this.stats.rejected++;
				// Output 2: rejected events
				send([null, { ...msg, payload: event, filterResult: result } as any]);
			}

			const total = this.stats.passed + this.stats.rejected;
			const rate = total > 0 ? ((this.stats.passed / total) * 100).toFixed(1) : "0";
			this.status({ fill: "yellow", shape: "dot", text: `${this.stats.passed} passed / ${this.stats.rejected} rejected (${rate}%)` });

			done();
		});
	}

	RED.nodes.registerType("firehose-filter", FilterConstructor);
};
