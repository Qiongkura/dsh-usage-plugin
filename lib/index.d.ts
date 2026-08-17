import { Context, Service } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";

//#region src/server/types.d.ts
/**
 * Cross-session token-usage query vocabulary: request, row, and result shapes
 * shared by the host service, the api-proxy wire contract, and the web panel.
 *
 * @module @deepseek-ai/dsh-usage-query
 */
/** A grouping dimension: one optional column of every result row. */
type UsageDimension = 'day' | 'model' | 'session' | 'workspace';
/** Row ordering: default dimension order, or by total tokens descending/ascending. */
type UsageSort = 'tokens-desc' | 'tokens-asc';
/** Inclusive day-window query over usage samples, grouped by selected dimensions. */
interface UsageQueryRequest {
  /** Inclusive lower bound as a local `YYYY-MM-DD` date; absent = no bound. */
  from?: string;
  /** Inclusive upper bound as a local `YYYY-MM-DD` date; absent = no bound. */
  to?: string;
  /**
   * Epoch-ms cutoff: only samples whose event time is at or before this
   * instant count. The panel captures it when it opens, so usage produced
   * after the open moment stays out of the view until the panel reopens.
   */
  asOf?: number;
  /**
   * Grouping dimensions: a non-empty, duplicate-free subset of
   * `day`/`model`/`session`/`workspace`. A row carries exactly the selected fields.
   */
  groupBy: readonly UsageDimension[];
  /** Row ordering override; absent = deterministic dimension order. */
  sortBy?: UsageSort;
}
/** Summed token buckets for one group. */
interface TokenTotals {
  /** Uncached input tokens. */
  inputTokens: number;
  /** Output tokens. */
  outputTokens: number;
  /** Cache-read tokens. */
  cacheReadTokens: number;
  /** Cache-write tokens. */
  cacheWriteTokens: number;
  /** Reasoning output tokens (already inside `outputTokens`; reported separately). */
  reasoningTokens: number;
  /** Disjoint sum of all four buckets. */
  totalTokens: number;
}
/** One aggregated group: exactly the requested dimensions plus sums. */
interface UsageRow extends TokenTotals {
  /** Local `YYYY-MM-DD` of the samples; present iff `day` is grouped. */
  day?: string;
  /** `provider/model` of the samples; present iff `model` is grouped. */
  model?: string;
  /** Owning session id; present iff `session` is grouped. */
  sessionId?: string;
  /** Latest logged title of the owning session, when one exists. */
  sessionTitle?: string;
  /** Owning workspace path; present iff `workspace` is grouped. */
  workspace?: string;
  /** Number of usage samples (provider-reported calls) in the group. */
  requests: number;
}
/** Aggregated rows (sorted deterministically) plus the grand total. */
interface UsageQueryResult {
  /** One row per distinct group, sorted by the grouped dimensions. */
  readonly rows: readonly UsageRow[];
  /** Grand total across every row. */
  readonly total: TokenTotals;
}
//#endregion
//#region src/index.d.ts
/** No settings are supported; any configured key is a misspelling. */
type UsageQueryConfig = Record<string, never>;
declare module '@deepseek-ai/cordis' {
  interface Context {
    usageQuery: UsageQuery;
  }
}
/** Cross-session usage aggregation service. */
declare class UsageQuery extends Service {
  static Config: z<UsageQueryConfig>;
  /** Mount after the services the folds depend on. */
  static inject: string[];
  /** Revision-keyed per-session folds (`<sessionId>:<revision>` → samples + title). */
  private readonly cache;
  /** Incremental folds for live sessions, keyed by session id. */
  private readonly liveFolds;
  constructor(ctx: Context, config?: UsageQueryConfig);
  /** Fold all live sessions once in the background (best-effort). */
  warmUp(): Promise<void>;
  /**
   * Aggregate provider-reported token usage across the logical corpus.
   * @param request - validated day window and grouping dimensions.
   * @returns grouped rows (sorted by the grouped dimensions) and the grand total.
   */
  query(request: UsageQueryRequest): Promise<UsageQueryResult>;
  /**
   * Fold the events appended to a live session since its last fold, then
   * return the accumulated last-wins samples tagged with the session id.
   * @param sessionId - the live session.
   * @param events - the session's current event snapshot.
   * @returns session-tagged usage samples.
   */
  private liveSamples;
  /**
   * Fold one live session's tail incrementally, keeping the accumulated
   * last-wins samples and the model active at the fold tail in state.
   * @param sessionId - the live session.
   * @param events - the session's current event snapshot.
   * @returns the session's fold state (up to date).
   */
  private ensureLiveFold;
  /**
   * Fold one persisted session's usage, preferring the cheapest correct
   * source: raw-artifact line scans when the backend supports them, full
   * session-query reads otherwise.
   * @param sessionQuery - the mounted query engine.
   * @param persistence - the optional mounted persistence backend.
   * @param sessionId - the session to fold.
   * @returns session-tagged usage samples plus the latest logged title.
   */
  private foldPersisted;
}
//#endregion
export { type UsageDimension, UsageQuery, UsageQuery as default, UsageQueryConfig, type UsageQueryRequest, type UsageQueryResult, type UsageRow, type UsageSort };