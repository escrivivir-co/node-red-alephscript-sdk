import { NodeAPI, Node, NodeDef, NodeMessage } from "node-red";
import * as fs from "fs";
import * as path from "path";
import { LabeledPost } from "../lib/types";

interface FileOutDef extends NodeDef {
	config: string;
	subdir: string;
	maxFiles: number;
	basePath: string;
}

interface FileOutNode extends Node {
	config: any;
	subdir: string;
	maxFiles: number;
	basePath: string;
	stats: { written: number; lastFile: string };
}

export = function (RED: NodeAPI) {
	function FileOutConstructor(this: FileOutNode, config: FileOutDef) {
		RED.nodes.createNode(this, config);
		this.config = RED.nodes.getNode(config.config);
		this.subdir = config.subdir || "labeled";
		this.maxFiles = config.maxFiles || 1000;
		this.basePath = config.basePath || this.config?.getBasePath?.() || "./data/firehose";
		this.stats = { written: 0, lastFile: "" };

		this.status({ fill: "grey", shape: "ring", text: "waiting" });

		// Ensure directory exists
		const dir = path.resolve(this.basePath, this.subdir);
		try {
			fs.mkdirSync(dir, { recursive: true });
		} catch (err: any) {
			this.error("Cannot create directory: " + dir + " — " + err.message);
		}

		this.on("input", (msg: NodeMessage, send, done) => {
			const post = msg.payload as any;
			if (!post || typeof post !== "object") {
				send(msg);
				done();
				return;
			}

			// Allow msg to override subdir, basePath, and filename
			const msgAny = msg as any;
			const effectiveBasePath = msgAny.basePath || this.basePath;
			const effectiveSubdir = msgAny.subdir || this.subdir;

			const timestamp = Date.now();
			const rkey = post.rkey || post.uri?.split("/").pop() || "unknown";
			const filename = msgAny.filename || `${timestamp}_${rkey}.json`;
			const outDir = path.resolve(effectiveBasePath, effectiveSubdir);
			const filepath = path.resolve(outDir, filename);

			// Ensure target directory exists (may differ from init dir if msg overrides)
			try {
				fs.mkdirSync(outDir, { recursive: true });
			} catch (err: any) {
				this.error("Cannot create directory: " + outDir + " — " + err.message, msg);
				done();
				return;
			}

			try {
				fs.writeFileSync(filepath, JSON.stringify(post, null, 2), "utf-8");
				this.stats.written++;
				this.stats.lastFile = filename;
				this.status({ fill: "blue", shape: "dot", text: `${this.stats.written} files, last: ${filename}` });

				// Auto-cleanup: remove oldest files if over maxFiles
				cleanupIfNeeded.call(this, outDir);
			} catch (err: any) {
				this.error("Write error: " + err.message, msg);
			}
			msg.filepath = filepath;
			// Passthrough
			send(msg);
			done();
		});
	}

	function cleanupIfNeeded(this: FileOutNode, dirOverride?: string) {
		if (this.maxFiles <= 0) return;
		const dir = dirOverride || path.resolve(this.basePath, this.subdir);
		try {
			const files = fs.readdirSync(dir)
				.filter(f => f.endsWith(".json"))
				.sort();
			if (files.length > this.maxFiles) {
				const toRemove = files.slice(0, files.length - this.maxFiles);
				for (const f of toRemove) {
					fs.unlinkSync(path.join(dir, f));
				}
			}
		} catch {
			// Cleanup is best-effort
		}
	}

	RED.nodes.registerType("firehose-file-out", FileOutConstructor);
};
