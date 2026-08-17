import { Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
//#region src/server/fold.ts
/** Label applied to usage samples whose request header predates the log or is absent. */
const UNKNOWN_MODEL = "unknown";
/**
* Local date key `YYYY-MM-DD` for one epoch-ms timestamp (the machine's own day boundary).
* @param time - Unix epoch milliseconds.
* @returns the local calendar day literal.
*/
function dayKey(time) {
	const date = new Date(time);
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${String(date.getFullYear())}-${month}-${day}`;
}
/**
* The provider-reported usage sample of one event, with its owning step, if it carries one.
* @param event - one session event.
* @returns the usage sample with its `(turn, step)`, or `undefined` when the event reports none.
*/
function usageSampleOf(event) {
	if (event.type === "assistant/message" && event.data.usage !== void 0) return {
		turn: event.data.turn,
		step: event.data.step,
		usage: event.data.usage
	};
	if (event.type === "assistant/chunk" && event.data.chunk.type === "usage") return {
		turn: event.data.turn,
		step: event.data.step,
		usage: event.data.chunk.usage
	};
}
const zeroTotals = () => ({
	inputTokens: 0,
	outputTokens: 0,
	cacheReadTokens: 0,
	cacheWriteTokens: 0,
	reasoningTokens: 0,
	totalTokens: 0
});
const addTotals = (target, usage) => {
	target.inputTokens += usage.inputTokens;
	target.outputTokens += usage.outputTokens;
	target.cacheReadTokens += usage.cacheReadTokens ?? 0;
	target.cacheWriteTokens += usage.cacheWriteTokens ?? 0;
	target.reasoningTokens += usage.reasoningTokens ?? 0;
	target.totalTokens += usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0) + usage.outputTokens;
};
/**
* Fold one complete session log into usage samples. A `request/header` event
* attributes every following sample to its call configuration's
* `provider/model`; a later usage for the same `(turn, step)` replaces the
* earlier one, so a final `assistant/message` usage supersedes the streaming
* `assistant/chunk` sample instead of double-counting it (the same last-wins
* rule token-meter's `tokenUsage` projection applies).
* @param events - one session's contiguous raw events in seq order.
* @returns one sample per distinct `(turn, step)` that reported usage.
*/
function foldUsageSamples(events) {
	const lastByStep = /* @__PURE__ */ new Map();
	let model = UNKNOWN_MODEL;
	for (const event of events) {
		if (event.type === "request/header") {
			const { provider, model: modelId } = event.data.header.config;
			model = `${provider}/${modelId}`;
			continue;
		}
		const sample = usageSampleOf(event);
		if (sample === void 0) continue;
		const key = `${sample.turn}:${sample.step}`;
		lastByStep.set(key, {
			turn: sample.turn,
			step: sample.step,
			time: event.time,
			usage: { ...sample.usage },
			model
		});
	}
	return [...lastByStep.values()];
}
/**
* Validate a query request.
* @param request - the request under validation.
* @returns the failure reason, or `undefined` when the request is valid.
*/
function validateRequest(request) {
	const DIMENSIONS = [
		"day",
		"model",
		"session",
		"workspace"
	];
	if (request.groupBy.length === 0) return "groupBy must name at least one dimension";
	const seen = /* @__PURE__ */ new Set();
	for (const dimension of request.groupBy) {
		if (!DIMENSIONS.includes(dimension)) return `unknown dimension "${dimension}"`;
		if (seen.has(dimension)) return `duplicate dimension "${dimension}"`;
		seen.add(dimension);
	}
	if (request.sortBy !== void 0 && request.sortBy !== "tokens-desc" && request.sortBy !== "tokens-asc") return `unknown sortBy "${request.sortBy}"`;
	const DATE = /^\d{4}-\d{2}-\d{2}$/;
	if (request.from !== void 0 && !DATE.test(request.from)) return `invalid from date "${request.from}"`;
	if (request.to !== void 0 && !DATE.test(request.to)) return `invalid to date "${request.to}"`;
	if (request.from !== void 0 && request.to !== void 0 && request.from > request.to) return `from "${request.from}" is after to "${request.to}"`;
	if (request.asOf !== void 0 && (!Number.isSafeInteger(request.asOf) || request.asOf <= 0)) return `invalid asOf timestamp "${String(request.asOf)}"`;
}
/** Whether one sample falls inside the day window (no window = unbounded). */
const inWindow = (request, day) => (request.from === void 0 || request.from <= day) && (request.to === void 0 || day <= request.to);
/** Whether one sample predates the as-of cutoff (absent cutoff = unbounded). */
const inAsOf = (request, time) => request.asOf === void 0 || time <= request.asOf;
/** Row fields for the selected dimensions plus a total-order sort key. */
function groupKeyOf(request, sample) {
	const parts = {};
	const values = [];
	for (const dimension of request.groupBy) if (dimension === "day") {
		const day = dayKey(sample.time);
		parts.day = day;
		values.push(day);
	} else if (dimension === "model") {
		parts.model = sample.model;
		values.push(sample.model);
	} else if (dimension === "workspace") {
		parts.workspace = sample.workspace ?? "";
		values.push(sample.workspace ?? "");
	} else {
		parts.sessionId = sample.sessionId;
		values.push(sample.sessionId);
	}
	return {
		sortKey: values.join("\0"),
		parts
	};
}
/** Total order over group sort keys (dimension values in groupBy order). */
const compareKeys = (left, right) => {
	if (left < right) return -1;
	/* v8 ignore next -- equality is unreachable: distinct groups never share a key */
	return left > right ? 1 : 0;
};
/** Row ordering by total tokens (descending or ascending), then the deterministic key. */
const compareByTokens = (sortBy) => (left, right) => {
	const diff = left.totals.totalTokens - right.totals.totalTokens;
	if (diff !== 0) return sortBy === "tokens-desc" ? -diff : diff;
	return compareKeys(left.sortKey, right.sortKey);
};
/**
* Aggregate samples into grouped rows plus the grand total, sorted by the grouped dimensions.
* @param request - validated day window and grouping dimensions.
* @param samples - session-tagged usage samples.
* @returns grouped rows (sorted by the grouped dimensions) and the grand total.
*/
function aggregateSamples(request, samples) {
	const total = zeroTotals();
	const groups = /* @__PURE__ */ new Map();
	for (const sample of samples) {
		if (!inWindow(request, dayKey(sample.time))) continue;
		if (!inAsOf(request, sample.time)) continue;
		addTotals(total, sample.usage);
		const { sortKey, parts } = groupKeyOf(request, sample);
		let group = groups.get(sortKey);
		if (group === void 0) {
			group = {
				sortKey,
				parts,
				totals: zeroTotals(),
				requests: 0
			};
			groups.set(sortKey, group);
		}
		group.requests += 1;
		addTotals(group.totals, sample.usage);
	}
	const sorted = [...groups.values()];
	return {
		rows: (request.sortBy === void 0 ? sorted.sort((a, b) => compareKeys(a.sortKey, b.sortKey)) : sorted.sort(compareByTokens(request.sortBy))).map((group) => ({
			...group.parts,
			requests: group.requests,
			...group.totals
		})),
		total
	};
}
//#endregion
//#region src/server/raw.ts
/**
* Parse one raw JSONL record into a minimal usage-relevant event.
*
* The fast prefilter narrows each branch before any JSON.parse: header
* records, assistant messages, and usage chunks (whose serialized chunk is
* `{"type":"usage",...}` — delta chunks carry `"type":"text-delta"` and are
* never parsed). Records that parse but lack the required payload (a message
* without usage, a header without a resolvable call configuration) are
* skipped; a torn or non-JSON tail line throws and is skipped.
* @param line - one decoded artifact line.
* @returns the minimal event, or `undefined` when the line carries no usage
* data (packed rows, deltas, other event types, or an unparseable tail).
*/
function parseRawEvent(line) {
	try {
		if (line.includes("\"request/header\"")) {
			const record = JSON.parse(line);
			const config = record.data?.header?.config;
			if (config?.provider === void 0 || config.model === void 0) return void 0;
			return {
				type: "request/header",
				time: record.time,
				data: {
					header: { config: {
						provider: config.provider,
						model: config.model
					} },
					reason: "scan"
				}
			};
		}
		if (line.includes("\"assistant/message\"")) {
			const record = JSON.parse(line);
			const data = record.data;
			if (data?.usage === void 0) return void 0;
			return {
				type: "assistant/message",
				time: record.time,
				data: {
					turn: data.turn,
					step: data.step,
					usage: data.usage
				}
			};
		}
		if (line.includes("\"assistant/chunk\"") && line.includes("\"type\":\"usage\"")) {
			const record = JSON.parse(line);
			return {
				type: "assistant/chunk",
				time: record.time,
				data: {
					turn: record.data.turn,
					step: record.data.step,
					chunk: {
						type: "usage",
						usage: record.data.chunk.usage
					}
				}
			};
		}
		return;
	} catch {
		return;
	}
}
/**
* Scan one raw artifact for usage-relevant events in line order.
* @param content - the artifact's decoded text (newline-delimited JSONL).
* @returns minimal events the fold already consumes (header, usage message,
* and usage chunk records only).
*/
function scanRawUsageEvents(content) {
	const events = [];
	for (const line of content.split("\n")) {
		if (!line.includes("\"type\"")) continue;
		const event = parseRawEvent(line);
		if (event !== void 0) events.push(event);
	}
	return events;
}
/**
* Scan one raw artifact for the latest logged session title. Titles are
* `session/title` records that are never packed, so a prefiltered line scan
* finds the newest one without replaying the log. A torn or unparseable tail
* line is skipped, never fatal.
* @param content - the artifact's decoded text (newline-delimited JSONL).
* @returns the newest title text, or `undefined` when the log has none.
*/
function scanRawSessionTitle(content) {
	let title;
	for (const line of content.split("\n")) {
		if (!line.includes("\"session/title\"")) continue;
		try {
			const record = JSON.parse(line);
			if (typeof record.data?.title === "string" && record.data.title.length > 0) title = record.data.title;
		} catch {}
	}
	return title;
}
//#endregion
//#region src/index.ts
/**
* dsh-usage-plugin — host half.
*
* Mounts the cross-session token-usage aggregation service (`ctx.usageQuery`)
* that backs the `usage.query` remote consumed by the web panel. Read-only:
* the service never creates or resumes an agent, never assembles a prompt,
* and never sends a provider request.
*/
/** Maximum concurrent session-log reads in one query. */
const READ_CONCURRENCY = 4;
/** Maximum cached per-session folds; beyond it the oldest entries are dropped. */
const CACHE_LIMIT = 500;
/** Reject stale or misspelled keys before defaults can hide them. */
function validateConfigKeys(config) {
	for (const key of Object.keys(config)) throw new Error(`UsageQueryConfig: unknown key "${key}" (no settings are supported)`);
}
/**
* Map `items` through `fn` with at most `limit` in-flight promises.
* @param items - inputs, processed in order.
* @param limit - maximum concurrent workers (positive).
* @param fn - async mapper.
* @returns results in input order.
*/
async function mapWithConcurrency(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	const worker = async () => {
		for (;;) {
			const index = next;
			next += 1;
			if (index >= items.length) return;
			const item = items[index];
			/* v8 ignore next 2 -- workers stop at items.length, so the element exists */
			if (item === void 0) return;
			results[index] = await fn(item);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}
/** Cross-session usage aggregation service. */
var UsageQuery = class extends Service {
	static Config = z.object({});
	/** Mount after the services the folds depend on. */
	static inject = [
		"sessions",
		"sessionQuery",
		"sessionPersistence"
	];
	/** Revision-keyed per-session folds (`<sessionId>:<revision>` → samples + title). */
	cache = /* @__PURE__ */ new Map();
	/** Incremental folds for live sessions, keyed by session id. */
	liveFolds = /* @__PURE__ */ new Map();
	constructor(ctx, config = {}) {
		super(ctx, "usageQuery");
		validateConfigKeys(config);
		setImmediate(() => {
			this.warmUp().catch(() => {});
		});
	}
	/** Fold all live sessions once in the background (best-effort). */
	async warmUp() {
		const sessionQuery = this.ctx.get("sessionQuery");
		const sessions = this.ctx.get("sessions");
		if (sessionQuery === void 0 || sessions === void 0) return;
		try {
			const records = await sessionQuery.listSessions();
			for (const record of records) {
				const live = sessions.get(record.header.id);
				if (live !== void 0) this.ensureLiveFold(record.header.id, live.events);
			}
		} catch {}
	}
	/**
	* Aggregate provider-reported token usage across the logical corpus.
	* @param request - validated day window and grouping dimensions.
	* @returns grouped rows (sorted by the grouped dimensions) and the grand total.
	*/
	async query(request) {
		const failure = validateRequest(request);
		if (failure !== void 0) throw new Error(`usageQuery: ${failure}`);
		const sessionQuery = this.ctx.get("sessionQuery");
		if (sessionQuery === void 0) throw new Error("usageQuery: the sessionQuery service is not mounted");
		const sessions = this.ctx.get("sessions");
		const records = await sessionQuery.listSessions();
		const parentMap = /* @__PURE__ */ new Map();
		for (const record of records) if (record.header.parentSession !== void 0) parentMap.set(record.header.id, record.header.parentSession);
		const rootOf = (id) => {
			const seen = /* @__PURE__ */ new Set();
			let node = id;
			let root;
			while (node !== void 0 && !seen.has(node)) {
				seen.add(node);
				root = node;
				node = parentMap.get(node);
			}
			return root ?? id;
		};
		const to = request.to;
		const targets = to === void 0 ? records : records.filter((record) => dayKey(new Date(record.header.createdAt).getTime()) <= to);
		const persistence = this.ctx.get("sessionPersistence");
		const revisions = persistence === void 0 ? void 0 : new Map((await persistence.listSnapshots()).map((snapshot) => [snapshot.header.id, snapshot.revision]));
		const plans = targets.filter((record) => sessions?.get(record.header.id) === void 0).map((record) => {
			const revision = revisions?.get(record.header.id);
			const cacheKey = revision === void 0 ? void 0 : `${record.header.id}:${revision}`;
			return {
				record,
				cacheKey,
				cached: cacheKey === void 0 ? void 0 : this.cache.get(cacheKey)
			};
		});
		const readResults = await mapWithConcurrency(plans.filter((plan) => plan.cached === void 0), READ_CONCURRENCY, async ({ record, cacheKey }) => {
			const folded = await this.foldPersisted(sessionQuery, persistence, record.header.id);
			if (cacheKey !== void 0) this.cache.set(cacheKey, folded);
			return folded;
		});
		while (this.cache.size > CACHE_LIMIT) {
			const oldest = this.cache.keys().next().value;
			/* v8 ignore next 2 -- a cache larger than the limit always has a first key */
			if (oldest === void 0) break;
			this.cache.delete(oldest);
		}
		const perSession = [];
		const titles = /* @__PURE__ */ new Map();
		const cwdBySession = /* @__PURE__ */ new Map();
		for (const record of records) if (record.header.cwd !== void 0) cwdBySession.set(record.header.id, record.header.cwd);
		const tag = (sample) => {
			const sessionId = rootOf(sample.sessionId);
			const workspace = cwdBySession.get(sessionId);
			return workspace === void 0 ? {
				...sample,
				sessionId
			} : {
				...sample,
				sessionId,
				workspace
			};
		};
		let readIndex = 0;
		for (const plan of plans) if (plan.cached !== void 0) {
			perSession.push([...plan.cached.samples].map(tag));
			if (plan.cached.title !== void 0) titles.set(plan.record.header.id, plan.cached.title);
		} else {
			const result = readResults[readIndex];
			readIndex += 1;
			/* v8 ignore next 2 -- every miss produced exactly one result in order */
			if (result === void 0) throw new Error("usageQuery: internal miss/result mismatch");
			perSession.push([...result.samples].map(tag));
			if (result.title !== void 0) titles.set(plan.record.header.id, result.title);
		}
		for (const record of targets) {
			const live = sessions?.get(record.header.id);
			if (live !== void 0) {
				perSession.push(this.liveSamples(record.header.id, live.events).map(tag));
				const state = this.liveFolds.get(record.header.id);
				if (state?.title !== void 0) titles.set(record.header.id, state.title);
			}
		}
		const result = aggregateSamples(request, perSession.flat());
		if (titles.size > 0) result.rows = result.rows.map((row) => {
			if (row.sessionId === void 0) return row;
			const sessionTitle = titles.get(row.sessionId);
			return sessionTitle === void 0 ? row : {
				...row,
				sessionTitle
			};
		});
		return result;
	}
	/**
	* Fold the events appended to a live session since its last fold, then
	* return the accumulated last-wins samples tagged with the session id.
	* @param sessionId - the live session.
	* @param events - the session's current event snapshot.
	* @returns session-tagged usage samples.
	*/
	liveSamples(sessionId, events) {
		const state = this.ensureLiveFold(sessionId, events);
		const samples = new Array(state.byStep.size);
		let index = 0;
		for (const sample of state.byStep.values()) {
			samples[index] = {
				...sample,
				sessionId
			};
			index += 1;
		}
		return samples;
	}
	/**
	* Fold one live session's tail incrementally, keeping the accumulated
	* last-wins samples and the model active at the fold tail in state.
	* @param sessionId - the live session.
	* @param events - the session's current event snapshot.
	* @returns the session's fold state (up to date).
	*/
	ensureLiveFold(sessionId, events) {
		let state = this.liveFolds.get(sessionId);
		if (state !== void 0 && state.folded >= events.length) return state;
		if (state === void 0) {
			state = {
				folded: 0,
				model: UNKNOWN_MODEL,
				title: void 0,
				byStep: /* @__PURE__ */ new Map()
			};
			this.liveFolds.set(sessionId, state);
		}
		for (let index = state.folded; index < events.length; index += 1) {
			const event = events[index];
			if (event === void 0) break;
			if (event.type === "request/header") {
				const { provider, model: modelId } = event.data.header.config;
				state.model = `${provider}/${modelId}`;
				continue;
			}
			if (event.type === "session/title") {
				state.title = event.data.title;
				continue;
			}
			const sample = usageSampleOf(event);
			if (sample === void 0) continue;
			state.byStep.set(`${sample.turn}:${sample.step}`, {
				turn: sample.turn,
				step: sample.step,
				time: event.time,
				usage: { ...sample.usage },
				model: state.model
			});
		}
		state.folded = events.length;
		while (this.liveFolds.size > CACHE_LIMIT) {
			const oldest = this.liveFolds.keys().next().value;
			/* v8 ignore next 2 -- a fold map larger than the limit always has a first key */
			if (oldest === void 0) break;
			this.liveFolds.delete(oldest);
		}
		return state;
	}
	/**
	* Fold one persisted session's usage, preferring the cheapest correct
	* source: raw-artifact line scans when the backend supports them, full
	* session-query reads otherwise.
	* @param sessionQuery - the mounted query engine.
	* @param persistence - the optional mounted persistence backend.
	* @param sessionId - the session to fold.
	* @returns session-tagged usage samples plus the latest logged title.
	*/
	async foldPersisted(sessionQuery, persistence, sessionId) {
		if (persistence?.supportsRawArtifacts === true) {
			const raw = await persistence.readRaw(sessionId);
			if (raw !== void 0) return {
				samples: foldUsageSamples(scanRawUsageEvents(raw.content)).map((sample) => ({
					...sample,
					sessionId
				})),
				title: scanRawSessionTitle(raw.content)
			};
		}
		const log = await sessionQuery.readSession(sessionId);
		let title;
		for (let index = log.events.length - 1; index >= 0; index -= 1) {
			const event = log.events[index];
			if (event?.type === "session/title") {
				title = event.data.title;
				break;
			}
		}
		return {
			samples: foldUsageSamples(log.events).map((sample) => ({
				...sample,
				sessionId
			})),
			title
		};
	}
};
//#endregion
export { UsageQuery, UsageQuery as default };
