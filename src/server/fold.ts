/**
 * Pure folds for cross-session token-usage aggregation: extract usage samples
 * from one session log, attribute them to a day and model, and group them by
 * the requested dimensions. No context, no I/O — everything here is a function
 * of its inputs so the service and its tests stay deterministic.
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type {
  OwnershipSpec,
  TaggedSample,
  TokenTotals,
  TokenUsageView,
  UsageDimension,
  UsageQueryRequest,
  UsageRow,
  UsageSample,
} from './types.ts'

/** Label applied to usage samples whose request header predates the log or is absent. */
export const UNKNOWN_MODEL = 'unknown'

/**
 * Local date key `YYYY-MM-DD` for one epoch-ms timestamp (the machine's own day boundary).
 * @param time - Unix epoch milliseconds.
 * @returns the local calendar day literal.
 */
export function dayKey(time: number): string {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${String(date.getFullYear())}-${month}-${day}`
}

/**
 * The provider-reported usage sample of one event, with its owning step, if it carries one.
 * @param event - one session event.
 * @returns the usage sample with its `(turn, step)`, or `undefined` when the event reports none.
 */
export function usageSampleOf(event: SessionEvent): { turn: number; step: number; seq?: number; usage: TokenUsageView } | undefined {
  if (event.type === 'assistant/message' && event.data.usage !== undefined) {
    return { turn: event.data.turn, step: event.data.step, seq: event.seq, usage: event.data.usage }
  }
  if (event.type === 'assistant/chunk' && event.data.chunk.type === 'usage') {
    return { turn: event.data.turn, step: event.data.step, seq: event.seq, usage: event.data.chunk.usage }
  }
  return undefined
}

const zeroTotals = (): TokenTotals => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
  totalTokens: 0,
})

const addTotals = (target: TokenTotals, usage: TokenUsageView): void => {
  target.inputTokens += usage.inputTokens
  target.outputTokens += usage.outputTokens
  target.cacheReadTokens += usage.cacheReadTokens ?? 0
  target.cacheWriteTokens += usage.cacheWriteTokens ?? 0
  target.reasoningTokens += usage.reasoningTokens ?? 0
  target.totalTokens += usage.inputTokens
    + (usage.cacheReadTokens ?? 0)
    + (usage.cacheWriteTokens ?? 0)
    + usage.outputTokens
}

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
export function foldUsageSamples(events: readonly SessionEvent[]): UsageSample[] {
  const lastByStep = new Map<string, UsageSample>()
  let model = UNKNOWN_MODEL
  for (const event of events) {
    if (event.type === 'request/header') {
      const { provider, model: modelId } = event.data.header.config
      model = `${provider}/${modelId}`
      continue
    }
    const sample = usageSampleOf(event)
    if (sample === undefined) continue
    const key = `${sample.turn}:${sample.step}`
    lastByStep.set(key, {
      turn: sample.turn,
      step: sample.step,
      seq: sample.seq,
      time: event.time,
      usage: { ...sample.usage },
      model,
    })
  }
  return [...lastByStep.values()]
}

/**
 * Narrow one session's samples to its OWN calls. A fork (a session whose
 * header carries `parentSession`) was seeded with the parent's full history —
 * including the parent's usage events — so `seq < seedLength` is inherited
 * prefix that must never count again on this branch. Only events at/after the
 * boundary are the fork's own calls, later re-attributed to the root by
 * `rootOf`. A top-level session owns everything. Legacy forks whose header
 * lacks `seedLength` fall back to the first `session/end-seed` seq.
 * @param samples - one session's folded samples (carrying `seq`).
 * @param own - the session's ownership metadata.
 * @returns samples at/after the boundary (or unchanged when undecidable).
 */
export function ownedUsageSamples(
  samples: readonly UsageSample[],
  own: OwnershipSpec,
): UsageSample[] {
  const boundary = own.parentSession === undefined ? 0
    : own.seedLength !== undefined ? own.seedLength
      : own.seedSeq
  if (boundary === undefined || boundary <= 0) return [...samples]
  return samples.filter(sample => sample.seq === undefined || sample.seq >= boundary)
}

/**
 * Validate a query request.
 * @param request - the request under validation.
 * @returns the failure reason, or `undefined` when the request is valid.
 */
export function validateRequest(request: UsageQueryRequest): string | undefined {
  const DIMENSIONS: readonly UsageDimension[] = ['day', 'model', 'session', 'workspace']
  if (request.groupBy.length === 0) return 'groupBy must name at least one dimension'
  const seen = new Set<string>()
  for (const dimension of request.groupBy) {
    if (!DIMENSIONS.includes(dimension)) return `unknown dimension "${dimension}"`
    if (seen.has(dimension)) return `duplicate dimension "${dimension}"`
    seen.add(dimension)
  }
  if (request.sortBy !== undefined && request.sortBy !== 'tokens-desc' && request.sortBy !== 'tokens-asc') {
    return `unknown sortBy "${request.sortBy}"`
  }
  const DATE = /^\d{4}-\d{2}-\d{2}$/
  if (request.from !== undefined && !DATE.test(request.from)) return `invalid from date "${request.from}"`
  if (request.to !== undefined && !DATE.test(request.to)) return `invalid to date "${request.to}"`
  if (request.from !== undefined && request.to !== undefined && request.from > request.to) {
    return `from "${request.from}" is after to "${request.to}"`
  }
  if (request.asOf !== undefined && (!Number.isSafeInteger(request.asOf) || request.asOf <= 0)) {
    return `invalid asOf timestamp "${String(request.asOf)}"`
  }
  return undefined
}

/** Whether one sample falls inside the day window (no window = unbounded). */
const inWindow = (request: UsageQueryRequest, day: string): boolean =>
  (request.from === undefined || request.from <= day)
  && (request.to === undefined || day <= request.to)

/** Whether one sample predates the as-of cutoff (absent cutoff = unbounded). */
const inAsOf = (request: UsageQueryRequest, time: number): boolean =>
  request.asOf === undefined || time <= request.asOf

/** Row fields for the selected dimensions plus a total-order sort key. */
function groupKeyOf(
  request: UsageQueryRequest,
  sample: TaggedSample,
): { sortKey: string; parts: Partial<Pick<UsageRow, 'day' | 'model' | 'sessionId' | 'workspace'>> } {
  const parts: Partial<Pick<UsageRow, 'day' | 'model' | 'sessionId' | 'workspace'>> = {}
  const values: string[] = []
  for (const dimension of request.groupBy) {
    if (dimension === 'day') {
      const day = dayKey(sample.time)
      parts.day = day
      values.push(day)
    } else if (dimension === 'model') {
      parts.model = sample.model
      values.push(sample.model)
    } else if (dimension === 'workspace') {
      parts.workspace = sample.workspace ?? ''
      values.push(sample.workspace ?? '')
    } else {
      parts.sessionId = sample.sessionId
      values.push(sample.sessionId)
    }
  }
  return { sortKey: values.join('\u0000'), parts }
}

/** Total order over group sort keys (dimension values in groupBy order). */
const compareKeys = (left: string, right: string): number => {
  if (left < right) return -1
  /* v8 ignore next -- equality is unreachable: distinct groups never share a key */
  return left > right ? 1 : 0
}

/** Row ordering by total tokens (descending or ascending), then the deterministic key. */
const compareByTokens = (sortBy: NonNullable<UsageQueryRequest['sortBy']>) =>
  (left: { sortKey: string; totals: TokenTotals }, right: { sortKey: string; totals: TokenTotals }): number => {
    const diff = left.totals.totalTokens - right.totals.totalTokens
    if (diff !== 0) return sortBy === 'tokens-desc' ? -diff : diff
    return compareKeys(left.sortKey, right.sortKey)
  }

/**
 * Aggregate samples into grouped rows plus the grand total, sorted by the grouped dimensions.
 * @param request - validated day window and grouping dimensions.
 * @param samples - session-tagged usage samples.
 * @returns grouped rows (sorted by the grouped dimensions) and the grand total.
 */
export function aggregateSamples(
  request: UsageQueryRequest,
  samples: readonly TaggedSample[],
): { rows: UsageRow[]; total: TokenTotals } {
  const total = zeroTotals()
  const groups = new Map<string, { sortKey: string; parts: Partial<Pick<UsageRow, 'day' | 'model' | 'sessionId' | 'workspace'>>; totals: TokenTotals; requests: number }>()
  for (const sample of samples) {
    const day = dayKey(sample.time)
    if (!inWindow(request, day)) continue
    if (!inAsOf(request, sample.time)) continue
    addTotals(total, sample.usage)
    const { sortKey, parts } = groupKeyOf(request, sample)
    let group = groups.get(sortKey)
    if (group === undefined) {
      group = { sortKey, parts, totals: zeroTotals(), requests: 0 }
      groups.set(sortKey, group)
    }
    group.requests += 1
    addTotals(group.totals, sample.usage)
  }
  const sorted = [...groups.values()]
  const rows = (request.sortBy === undefined
    ? sorted.sort((a, b) => compareKeys(a.sortKey, b.sortKey))
    : sorted.sort(compareByTokens(request.sortBy)))
    .map(group => ({ ...group.parts, requests: group.requests, ...group.totals }))
  return { rows, total }
}
