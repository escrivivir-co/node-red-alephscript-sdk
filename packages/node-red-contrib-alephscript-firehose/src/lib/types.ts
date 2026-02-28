/**
 * Shared types for the firehose pipeline nodes.
 * Mirrors the MCPFirehoseServer types but without MCP dependencies.
 */

// --- Jetstream (Bluesky firehose) ---

export interface JetstreamEvent {
	did: string;
	time_us: number;
	kind: "commit" | "identity" | "account";
	commit?: {
		rev: string;
		operation: "create" | "update" | "delete";
		collection: string;
		rkey: string;
		record?: {
			$type: string;
			text?: string;
			createdAt?: string;
			reply?: { parent: { uri: string; cid: string }; root: { uri: string; cid: string } };
			embed?: unknown;
			langs?: string[];
			facets?: unknown[];
		};
		cid?: string;
	};
}

// --- ONFALO CDR ---

export type NutrientName = "complacencia" | "pensamiento_critico" | "pluralidad" | "transparencia" | "autonomia";
export type QualitativeValue = "alto" | "medio" | "bajo";

export interface NutrientResult {
	valor: QualitativeValue;
	cdr_porcentaje: number;
	marcadores_encontrados: number;
}

export interface ONFALONutricion {
	complacencia: NutrientResult;
	pensamiento_critico: NutrientResult;
	pluralidad: NutrientResult;
	transparencia: NutrientResult;
	autonomia: NutrientResult;
}

export interface CDRSummary {
	pensamiento_critico_ok: boolean;
	pluralidad_ok: boolean;
	transparencia_ok: boolean;
	autonomia_ok: boolean;
	complacencia_ok: boolean;
	overall_quality_score: number;
}

// --- Labeled Post ---

export interface LabeledPost {
	did: string;
	rkey: string;
	uri: string;
	text: string;
	createdAt: string;
	langs: string[];
	isReply: boolean;
	labeledAt: string;
	nutricion: ONFALONutricion;
	cdr_summary: CDRSummary;
	palabras_analizadas: number;
	filterRulesPassed: string[];
}

// --- Filter ---

export interface FilterResult {
	passed: boolean;
	passedRules: string[];
	failedRule: string | null;
}

// --- Consumer Modes ---

export enum FirehoseConsumerMode {
	STREAM = "STREAM",
	N_FIRST = "N_FIRST",
	N_FIRST_INTERVAL = "N_FIRST_INTERVAL",
}

export interface FirehoseConsumerModeConfig {
	mode: FirehoseConsumerMode;
	/** N_FIRST: batch size. N_FIRST_INTERVAL: interval in ms between batches */
	quantity?: number;
	/** N_FIRST_INTERVAL only: messages per interval batch (defaults to quantity or 50) */
	batchSize?: number;
}

// --- Pipeline Stats ---

export interface PipelineStats {
	received: number;
	filtered: number;
	labeled: number;
	rejected: number;
	errors: number;
	startedAt: string | null;
	lastEventAt: string | null;
}
