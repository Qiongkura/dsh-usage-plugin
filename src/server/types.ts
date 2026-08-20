/**
 * Cross-session token-usage query vocabulary: request, row, and result shapes
 * shared by the host service, the api-proxy wire contract, and the web panel.
 *
 * @module @deepseek-ai/dsh-usage-query
 */

/** A grouping dimension: one optional column of every result row. */
export type UsageDimension = 'day' | 'model' | 'session' | 'workspace'

/** Row ordering: default dimension order, or by total tokens descending/ascending. */
export type UsageSort = 'tokens-desc' | 'tokens-asc'

/**
 * Provider-reported token buckets read from session usage events. A
 * structural mirror of `@deepseek-ai/dsh-llm`'s `TokenUsage`, kept local so
 * this package never imports the LLM capability for a read-only fold.
 */
export interface TokenUsageView {
  /** Uncached input tokens. */
  inputTokens: number
  /** Output tokens (including reasoning output). */
  outputTokens: number
  /** Cache-read tokens. */
  cacheReadTokens?: number
  /** Cache-write tokens. */
  cacheWriteTokens?: number
  /** Reasoning output tokens, already inside `outputTokens`. */
  reasoningTokens?: number
}

/** One provider-reported usage sample in the durable log, attributed to a model. */
export interface UsageSample {
  /** Turn that carried the usage. */
  readonly turn: number
  /** Step that carried the usage. */
  readonly step: number
  /** Event seq in the owning session log (raw scan line order); present for
   *  persisted/live sources, absent for ad-hoc test samples. Consumers use it
   *  to distinguish a fork's own calls from its inherited seed prefix. */
  readonly seq?: number | undefined
  /** Event timestamp in Unix epoch milliseconds (the usage event's own time). */
  readonly time: number
  /** Provider-reported token buckets. */
  readonly usage: Readonly<TokenUsageView>
  /** `provider/model` of the newest request header before the sample, or `'unknown'`. */
  readonly model: string
}

/**
 * Ownership metadata deciding which calls belong to a session itself:
 * a fork's inherited seed prefix (`seq < seedLength`) never counts on its own
 * branch. `seedSeq` is the legacy alternative read from the first
 * `session/end-seed` when the header lacks `seedLength`.
 */
export interface OwnershipSpec {
  readonly parentSession?: string | undefined
  readonly seedLength?: number | undefined
  readonly seedSeq?: number | undefined
}

/** A usage sample tagged with its owning session id for cross-session aggregation. */
export interface TaggedSample extends UsageSample {
  /** Session that logged the sample. */
  readonly sessionId: string
  /** Owning workspace (cwd of the session), when known. */
  readonly workspace?: string
}

/** Inclusive day-window query over usage samples, grouped by selected dimensions. */
export interface UsageQueryRequest {
  /** Inclusive lower bound as a local `YYYY-MM-DD` date; absent = no bound. */
  from?: string
  /** Inclusive upper bound as a local `YYYY-MM-DD` date; absent = no bound. */
  to?: string
  /**
   * Epoch-ms cutoff: only samples whose event time is at or before this
   * instant count. The panel captures it when it opens, so usage produced
   * after the open moment stays out of the view until the panel reopens.
   */
  asOf?: number
  /**
   * Grouping dimensions: a non-empty, duplicate-free subset of
   * `day`/`model`/`session`/`workspace`. A row carries exactly the selected fields.
   */
  groupBy: readonly UsageDimension[]
  /** Row ordering override; absent = deterministic dimension order. */
  sortBy?: UsageSort
}

/** Summed token buckets for one group. */
export interface TokenTotals {
  /** Uncached input tokens. */
  inputTokens: number
  /** Output tokens. */
  outputTokens: number
  /** Cache-read tokens. */
  cacheReadTokens: number
  /** Cache-write tokens. */
  cacheWriteTokens: number
  /** Reasoning output tokens (already inside `outputTokens`; reported separately). */
  reasoningTokens: number
  /** Disjoint sum of all four buckets. */
  totalTokens: number
}

/** One aggregated group: exactly the requested dimensions plus sums. */
export interface UsageRow extends TokenTotals {
  /** Local `YYYY-MM-DD` of the samples; present iff `day` is grouped. */
  day?: string
  /** `provider/model` of the samples; present iff `model` is grouped. */
  model?: string
  /** Owning session id; present iff `session` is grouped. */
  sessionId?: string
  /** Latest logged title of the owning session, when one exists. */
  sessionTitle?: string
  /** Owning workspace path; present iff `workspace` is grouped. */
  workspace?: string
  /** Number of usage samples (provider-reported calls) in the group. */
  requests: number
}

/** Aggregated rows (sorted deterministically) plus the grand total. */
export interface UsageQueryResult {
  /** One row per distinct group, sorted by the grouped dimensions. */
  readonly rows: readonly UsageRow[]
  /** Grand total across every row. */
  readonly total: TokenTotals
}

/** The `ctx.usageQuery` service contract. */
export interface UsageQueryService {
  /**
   * Aggregate provider-reported token usage across the logical session corpus
   * for the requested day window and grouping.
   * @param request - day window and grouping dimensions.
   * @returns aggregated rows and the grand total.
   */
  query(request: UsageQueryRequest): Promise<UsageQueryResult>
}
