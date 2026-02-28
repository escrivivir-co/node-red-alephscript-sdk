import { NodeAPI, Node, NodeDef, NodeMessage } from "node-red";
import { JetstreamEvent, LabeledPost } from "../lib/types";
import { labelText } from "../lib/OntaloLabeler";

interface LabelerDef extends NodeDef {
	config: string;
	minQualityScore: number;
	includeRawText: boolean;
}

interface LabelerNode extends Node {
	config: any;
	minQualityScore: number;
	includeRawText: boolean;
	stats: { labeled: number; totalQuality: number };
}

export = function (RED: NodeAPI) {
	function LabelerConstructor(this: LabelerNode, config: LabelerDef) {
		RED.nodes.createNode(this, config);
		this.config = RED.nodes.getNode(config.config);
		this.minQualityScore = config.minQualityScore || 0;
		this.includeRawText = config.includeRawText !== false;
		this.stats = { labeled: 0, totalQuality: 0 };

		this.status({ fill: "grey", shape: "ring", text: "waiting" });

		this.on("input", (msg: NodeMessage, send, done) => {
			const event = msg.payload as JetstreamEvent;
			const text = event?.commit?.record?.text;
			if (!text) {
				done();
				return;
			}

			try {
				const result = labelText(text);
				const filterRulesPassed = (msg as any).filterResult?.passedRules || [];

				const labeled: LabeledPost = {
					did: event.did,
					rkey: event.commit?.rkey || "",
					uri: `at://${event.did}/${event.commit?.collection || "app.bsky.feed.post"}/${event.commit?.rkey || ""}`,
					text: this.includeRawText ? text : "",
					createdAt: event.commit?.record?.createdAt || new Date().toISOString(),
					langs: event.commit?.record?.langs || [],
					isReply: !!event.commit?.record?.reply,
					labeledAt: new Date().toISOString(),
					nutricion: result.nutricion,
					cdr_summary: result.cdr_summary,
					palabras_analizadas: result.palabras,
					filterRulesPassed,
				};

				this.stats.labeled++;
				this.stats.totalQuality += result.cdr_summary.overall_quality_score;
				const avgQ = Math.round(this.stats.totalQuality / this.stats.labeled);

				this.status({ fill: "green", shape: "dot", text: `labeled ${this.stats.labeled}, avg quality: ${avgQ}` });

				// Output 1: full LabeledPost (filtered by minQualityScore)
				// Output 2: CDR summary only (always, for gauges)
				// Output 2 payload: CDR summary enriched with numeric percentages for gauges
				const cdrForGauge = {
					...result.cdr_summary,
					pc: result.nutricion.pensamiento_critico.cdr_porcentaje,
					pl: result.nutricion.pluralidad.cdr_porcentaje,
					tr: result.nutricion.transparencia.cdr_porcentaje,
					au: result.nutricion.autonomia.cdr_porcentaje,
					co: result.nutricion.complacencia.cdr_porcentaje,
					text: text.substring(0, 200),
				};

				if (result.cdr_summary.overall_quality_score >= this.minQualityScore) {
					send([{ ...msg, payload: labeled }, { payload: cdrForGauge, topic: "cdr" }]);
				} else {
					send([null, { payload: cdrForGauge, topic: "cdr" }]);
				}
			} catch (err: any) {
				this.error("Labeling error: " + err.message, msg);
			}

			done();
		});
	}

	RED.nodes.registerType("firehose-labeler", LabelerConstructor);
};
