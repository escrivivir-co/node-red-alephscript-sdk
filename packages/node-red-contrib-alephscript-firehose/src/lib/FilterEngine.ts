/**
 * FilterEngine — Lightweight port of FirehoseFilterEngine
 * Pure functions, no external dependencies.
 */

import { JetstreamEvent, FilterResult } from "./types";

export interface FilterConfig {
	minTextLength: number;
	maxTextLength: number;
	languages: string[];
	minSubstantiveWords: number;
	enableSpamFilter: boolean;
}

const STOPWORDS_ES = new Set([
	"el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al",
	"en", "y", "o", "a", "que", "es", "se", "no", "por", "con", "para", "su",
	"lo", "como", "más", "pero", "sus", "le", "ya", "me", "si", "sin", "sobre",
	"este", "entre", "cuando", "muy", "ser", "hay", "también", "fue", "son",
	"está", "era", "ha", "todo", "esta", "mi", "yo", "te", "ti", "nos", "él",
]);

const URL_PATTERN = /https?:\/\/\S+/g;
const HASHTAG_PATTERN = /#\S+/g;
const MENTION_PATTERN = /@[\w.-]+/g;
const SPAM_REPEAT_PATTERN = /(.)\1{5,}/;

interface Rule {
	id: string;
	test: (event: JetstreamEvent, cfg: FilterConfig) => boolean;
}

const RULES: Rule[] = [
	{
		id: "has-text",
		test: (e) => !!e.commit?.record?.text && e.commit.record.text.trim().length > 0,
	},
	{
		id: "is-new-post",
		test: (e) => e.kind === "commit" && e.commit?.operation === "create" && e.commit?.collection === "app.bsky.feed.post",
	},
	{
		id: "text-length",
		test: (e, cfg) => {
			const len = e.commit?.record?.text?.length ?? 0;
			return len >= cfg.minTextLength && len <= cfg.maxTextLength;
		},
	},
	{
		id: "lang-filter",
		test: (e, cfg) => {
			if (cfg.languages.includes("*")) return true;
			const langs = e.commit?.record?.langs;
			if (!langs || langs.length === 0) return true;
			return langs.some(l => cfg.languages.includes(l));
		},
	},
	{
		id: "not-pure-url",
		test: (e) => {
			const text = e.commit?.record?.text ?? "";
			const stripped = text.replace(URL_PATTERN, "").replace(HASHTAG_PATTERN, "").replace(MENTION_PATTERN, "").trim();
			URL_PATTERN.lastIndex = 0;
			HASHTAG_PATTERN.lastIndex = 0;
			return stripped.length >= 20;
		},
	},
	{
		id: "no-spam",
		test: (e, cfg) => {
			if (!cfg.enableSpamFilter) return true;
			const text = e.commit?.record?.text ?? "";
			if (SPAM_REPEAT_PATTERN.test(text)) return false;
			const hashtagCount = (text.match(HASHTAG_PATTERN) || []).length;
			HASHTAG_PATTERN.lastIndex = 0;
			return hashtagCount <= 5;
		},
	},
	{
		id: "substantive",
		test: (e, cfg) => {
			const text = e.commit?.record?.text ?? "";
			const words = text.toLowerCase().split(/\s+/).filter(w => {
				URL_PATTERN.lastIndex = 0;
				HASHTAG_PATTERN.lastIndex = 0;
				return w.length > 2 && !STOPWORDS_ES.has(w) && !URL_PATTERN.test(w) && !HASHTAG_PATTERN.test(w);
			});
			URL_PATTERN.lastIndex = 0;
			HASHTAG_PATTERN.lastIndex = 0;
			return words.length >= cfg.minSubstantiveWords;
		},
	},
];

export function evaluateFilter(event: JetstreamEvent, config: FilterConfig): FilterResult {
	const passedRules: string[] = [];
	for (const rule of RULES) {
		if (!rule.test(event, config)) {
			return { passed: false, passedRules, failedRule: rule.id };
		}
		passedRules.push(rule.id);
	}
	return { passed: true, passedRules, failedRule: null };
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
	minTextLength: 80,
	maxTextLength: 2000,
	languages: ["es"],
	minSubstantiveWords: 5,
	enableSpamFilter: true,
};
