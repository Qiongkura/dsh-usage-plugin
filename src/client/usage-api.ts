/**
 * Local usage-domain types for the browser half. The npm-published
 * `@deepseek-ai/dsh-api-remotes` baseline predates the usage domain, so this
 * plugin carries its own wire vocabulary (structurally identical to the host
 * service's) and only needs the runtime `connection.api.usage` face, which
 * the host provides.
 */

/** A grouping dimension: one optional column of every result row. */
export type UsageDimension = 'day' | 'model' | 'session' | 'workspace'

/** Row ordering: default dimension order, or by total tokens descending/ascending. */
export type UsageSort = 'tokens-desc' | 'tokens-asc'

/** Summed token buckets for one group. */
export interface UsageTokenTotals {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  reasoningTokens: number
  totalTokens: number
}

/** One aggregated group: exactly the requested dimensions plus sums. */
export interface UsageRow extends UsageTokenTotals {
  day?: string
  model?: string
  sessionId?: string
  sessionTitle?: string
  workspace?: string
  requests: number
}

/** Aggregated rows plus the grand total. */
export interface UsageQueryResult {
  readonly rows: readonly UsageRow[]
  readonly total: UsageTokenTotals
}

/** The `usage.query` remote face consumed by the panel. */
export interface UsageApi {
  query(payload: {
    from?: string
    to?: string
    asOf?: number
    groupBy: readonly UsageDimension[]
    sortBy?: UsageSort
  }): Promise<{ result: { ok: true; value: UsageQueryResult } | { ok: false; error: { message: string } } }>
}
