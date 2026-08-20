/**
 * dsh-usage-plugin — host half.
 *
 * Mounts the cross-session token-usage aggregation service (`ctx.usageQuery`)
 * that backs the `usage.query` remote consumed by the web panel. Read-only:
 * the service never creates or resumes an agent, never assembles a prompt,
 * and never sends a provider request.
 */

import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-session-query'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SessionPersistence } from '@deepseek-ai/dsh-session-persistence'
import type { SessionQueryEngine } from '@deepseek-ai/dsh-session-query'
import type { OwnershipSpec, TaggedSample, UsageQueryRequest, UsageQueryResult, UsageSample } from './server/types.ts'
import { aggregateSamples, dayKey, foldUsageSamples, ownedUsageSamples, UNKNOWN_MODEL, usageSampleOf, validateRequest } from './server/fold.ts'
import { scanRawSeedSeq, scanRawSessionTitle, scanRawUsageEvents } from './server/raw.ts'

export type { UsageDimension, UsageQueryRequest, UsageQueryResult, UsageRow, UsageSort } from './server/types.ts'

/** No settings are supported; any configured key is a misspelling. */
export type UsageQueryConfig = Record<string, never>

/** Maximum concurrent session-log reads in one query. */
const READ_CONCURRENCY = 4

/** Maximum cached per-session folds; beyond it the oldest entries are dropped. */
const CACHE_LIMIT = 500

/** Seq of the first `session/end-seed` event in a session's event log, or
 *  `undefined` when the log carries none. Used as the legacy ownership
 *  boundary for fork sessions whose header lacks an explicit `seedLength`. */
function firstEndSeedSeq(events: readonly SessionEvent[]): number | undefined {
  for (const event of events) {
    if (event?.type === 'session/end-seed') return event.seq
  }
  return undefined
}

/** Incremental live-fold state for one session: events folded so far, the
 *  model active at the fold tail, the latest logged title, and the last-wins
 *  usage samples by `(turn, step)`. Only the tail is iterated on later
 *  queries. */
interface LiveFoldState {
  folded: number
  model: string
  title: string | undefined
  byStep: Map<string, UsageSample>
}

/** One persisted session fold: usage samples plus the latest logged title. */
interface PersistedFold {
  readonly samples: readonly TaggedSample[]
  readonly title: string | undefined
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    usageQuery: UsageQuery
  }
}

/** Reject stale or misspelled keys before defaults can hide them. */
function validateConfigKeys(config: UsageQueryConfig): void {
  for (const key of Object.keys(config)) {
    throw new Error(`UsageQueryConfig: unknown key "${key}" (no settings are supported)`)
  }
}

/**
 * Map `items` through `fn` with at most `limit` in-flight promises.
 * @param items - inputs, processed in order.
 * @param limit - maximum concurrent workers (positive).
 * @param fn - async mapper.
 * @returns results in input order.
 */
async function mapWithConcurrency<Item, Result>(
  items: readonly Item[],
  limit: number,
  fn: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results = new Array<Result>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      const item = items[index]
      /* v8 ignore next 2 -- workers stop at items.length, so the element exists */
      if (item === undefined) return
      results[index] = await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

/** Cross-session usage aggregation service. */
export class UsageQuery extends Service {
  // Schemastery preserves untrusted loader keys on an empty object schema;
  // the public type excludes settings while validateConfigKeys rejects them.
  static Config: z<UsageQueryConfig> = z.object({}) as unknown as z<UsageQueryConfig>

  /** Mount after the services the folds depend on. */
  static inject = ['sessions', 'sessionQuery', 'sessionPersistence']

  /** Revision-keyed per-session folds (`<sessionId>:<revision>` → samples + title). */
  private readonly cache = new Map<string, PersistedFold>()

  /** Incremental folds for live sessions, keyed by session id. */
  private readonly liveFolds = new Map<SessionId, LiveFoldState>()

  constructor(ctx: Context, config: UsageQueryConfig = {}) {
    super(ctx, 'usageQuery')
    validateConfigKeys(config)
    // Background warm-up: fold the live corpus once at mount so the first
    // panel open is usually instant. Best-effort — a failure only means the
    // first query folds on demand.
    setImmediate(() => {
      this.warmUp().catch(() => {})
    })
  }

  /** Fold all live sessions once in the background (best-effort). */
  async warmUp(): Promise<void> {
    const sessionQuery = this.ctx.get('sessionQuery')
    const sessions = this.ctx.get('sessions')
    if (sessionQuery === undefined || sessions === undefined) return
    try {
      const records = await sessionQuery.listSessions()
      for (const record of records) {
        const live = sessions.get(record.header.id)
        if (live !== undefined) this.ensureLiveFold(record.header.id, live.events)
      }
    } catch { /* warm-up is best-effort; the first query folds on demand */ }
  }

  /**
   * Aggregate provider-reported token usage across the logical corpus.
   * @param request - validated day window and grouping dimensions.
   * @returns grouped rows (sorted by the grouped dimensions) and the grand total.
   */
  async query(request: UsageQueryRequest): Promise<UsageQueryResult> {
    const failure = validateRequest(request)
    if (failure !== undefined) throw new Error(`usageQuery: ${failure}`)
    const sessionQuery = this.ctx.get('sessionQuery')
    if (sessionQuery === undefined) {
      throw new Error('usageQuery: the sessionQuery service is not mounted')
    }
    const sessions = this.ctx.get('sessions')
    const records = await sessionQuery.listSessions()
    // Subagent lineage: a child session's header carries `parentSession`, so
    // samples logged by subagents are attributed to their root ancestor here.
    // The session view then folds every descendant's usage into the
    // conversation that spawned it instead of listing one row per subagent.
    const parentMap = new Map<string, string>()
    for (const record of records) {
      if (record.header.parentSession !== undefined) parentMap.set(record.header.id, record.header.parentSession)
    }
    const rootOf = (id: string): string => {
      const seen = new Set<string>()
      let node: string | undefined = id
      let root: string | undefined
      while (node !== undefined && !seen.has(node)) {
        seen.add(node)
        root = node
        node = parentMap.get(node)
      }
      // `node === undefined` means the walk reached a session without a
      // parent — `root` is that root session. A revisit is a cycle guard;
      // the last visited node is the best available ancestor either way.
      return root ?? id
    }
    // A session cannot hold usage before its own creation, so sessions created
    // after the requested window's end can never contribute.
    const to = request.to
    const targets = to === undefined
      ? records
      : records.filter(record => dayKey(new Date(record.header.createdAt).getTime()) <= to)
    const persistence = this.ctx.get('sessionPersistence')
    const revisions = persistence === undefined
      ? undefined
      : new Map((await persistence.listSnapshots()).map(snapshot => [snapshot.header.id, snapshot.revision] as const))
    // Persisted-only plans: live sessions bypass the file cache entirely.
    const plans = targets
      .filter(record => sessions?.get(record.header.id) === undefined)
      .map((record) => {
        const revision = revisions?.get(record.header.id)
        const cacheKey = revision === undefined ? undefined : `${record.header.id}:${revision}`
        return { record, cacheKey, cached: cacheKey === undefined ? undefined : this.cache.get(cacheKey) }
      })
    const misses = plans.filter(plan => plan.cached === undefined)
    const readResults = await mapWithConcurrency(misses, READ_CONCURRENCY, async ({ record, cacheKey }) => {
      const folded = await this.foldPersisted(sessionQuery, persistence, record.header.id, {
        parentSession: record.header.parentSession,
        seedLength: record.header.seedLength,
      })
      if (cacheKey !== undefined) this.cache.set(cacheKey, folded)
      return folded
    })
    while (this.cache.size > CACHE_LIMIT) {
      const oldest = this.cache.keys().next().value
      /* v8 ignore next 2 -- a cache larger than the limit always has a first key */
      if (oldest === undefined) break
      this.cache.delete(oldest)
    }
    const perSession: TaggedSample[][] = []
    const titles = new Map<string, string>()
    const cwdBySession = new Map<string, string>()
    for (const record of records) {
      if (record.header.cwd !== undefined) cwdBySession.set(record.header.id, record.header.cwd)
    }
    const tag = (sample: TaggedSample): TaggedSample => {
      const sessionId = rootOf(sample.sessionId)
      const workspace = cwdBySession.get(sessionId)
      return workspace === undefined ? { ...sample, sessionId } : { ...sample, sessionId, workspace }
    }
    let readIndex = 0
    for (const plan of plans) {
      if (plan.cached !== undefined) {
        perSession.push([...plan.cached.samples].map(tag))
        if (plan.cached.title !== undefined) titles.set(plan.record.header.id, plan.cached.title)
      } else {
        const result = readResults[readIndex]
        readIndex += 1
        /* v8 ignore next 2 -- every miss produced exactly one result in order */
        if (result === undefined) throw new Error('usageQuery: internal miss/result mismatch')
        perSession.push([...result.samples].map(tag))
        if (result.title !== undefined) titles.set(plan.record.header.id, result.title)
      }
    }
    for (const record of targets) {
      const live = sessions?.get(record.header.id)
      if (live !== undefined) {
        perSession.push(this.liveSamples(record.header.id, live.events, {
          parentSession: record.header.parentSession,
          seedLength: record.header.seedLength,
        }).map(tag))
        const state = this.liveFolds.get(record.header.id)
        if (state?.title !== undefined) titles.set(record.header.id, state.title)
      }
    }
    const result = aggregateSamples(request, perSession.flat())
    if (titles.size > 0) {
      result.rows = result.rows.map((row) => {
        if (row.sessionId === undefined) return row
        const sessionTitle = titles.get(row.sessionId)
        return sessionTitle === undefined ? row : { ...row, sessionTitle }
      })
    }
    return result
  }

  /**
   * Fold the events appended to a live session since its last fold, then
   * return the accumulated last-wins samples tagged with the session id.
   * @param sessionId - the live session.
   * @param events - the session's current event snapshot.
   * @returns session-tagged usage samples.
   */
  private liveSamples(sessionId: SessionId, events: readonly SessionEvent[], own: OwnershipSpec): TaggedSample[] {
    const state = this.ensureLiveFold(sessionId, events)
    const owned = ownedUsageSamples([...state.byStep.values()], { ...own, seedSeq: firstEndSeedSeq(events) })
    const samples: TaggedSample[] = new Array(owned.length)
    for (let index = 0; index < owned.length; index += 1) {
      const sample = owned[index]
      /* v8 ignore next 2 -- owned entries are always defined */
      if (sample === undefined) continue
      samples[index] = { ...sample, sessionId }
    }
    return samples
  }

  /**
   * Fold one live session's tail incrementally, keeping the accumulated
   * last-wins samples and the model active at the fold tail in state.
   * @param sessionId - the live session.
   * @param events - the session's current event snapshot.
   * @returns the session's fold state (up to date).
   */
  private ensureLiveFold(sessionId: SessionId, events: readonly SessionEvent[]): LiveFoldState {
    let state = this.liveFolds.get(sessionId)
    if (state !== undefined && state.folded >= events.length) return state
    if (state === undefined) {
      state = { folded: 0, model: UNKNOWN_MODEL, title: undefined, byStep: new Map() }
      this.liveFolds.set(sessionId, state)
    }
    for (let index = state.folded; index < events.length; index += 1) {
      const event = events[index]
      if (event === undefined) break
      if (event.type === 'request/header') {
        const { provider, model: modelId } = event.data.header.config
        state.model = `${provider}/${modelId}`
        continue
      }
      if (event.type === 'session/title') {
        state.title = event.data.title
        continue
      }
      const sample = usageSampleOf(event)
      if (sample === undefined) continue
      state.byStep.set(`${sample.turn}:${sample.step}`, {
        turn: sample.turn,
        step: sample.step,
        seq: sample.seq,
        time: event.time,
        usage: { ...sample.usage },
        model: state.model,
      })
    }
    state.folded = events.length
    while (this.liveFolds.size > CACHE_LIMIT) {
      const oldest = this.liveFolds.keys().next().value
      /* v8 ignore next 2 -- a fold map larger than the limit always has a first key */
      if (oldest === undefined) break
      this.liveFolds.delete(oldest)
    }
    return state
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
  private async foldPersisted(
    sessionQuery: SessionQueryEngine,
    persistence: SessionPersistence | undefined,
    sessionId: SessionId,
    own: OwnershipSpec,
  ): Promise<PersistedFold> {
    if (persistence?.supportsRawArtifacts === true) {
      const raw = await persistence.readRaw(sessionId)
      if (raw !== undefined) {
        return {
          samples: ownedUsageSamples(
            foldUsageSamples(scanRawUsageEvents(raw.content)),
            { ...own, seedSeq: scanRawSeedSeq(raw.content) },
          ).map(sample => ({ ...sample, sessionId })),
          title: scanRawSessionTitle(raw.content),
        }
      }
    }
    const log = await sessionQuery.readSession(sessionId)
    // Latest logged title: scan from the tail (titles are appended sparsely).
    let title: string | undefined
    for (let index = log.events.length - 1; index >= 0; index -= 1) {
      const event = log.events[index]
      if (event?.type === 'session/title') {
        title = event.data.title
        break
      }
    }
    return {
      samples: ownedUsageSamples(
        foldUsageSamples(log.events),
        { ...own, seedSeq: firstEndSeedSeq(log.events) },
      ).map(sample => ({ ...sample, sessionId })),
      title,
    }
  }
}

export default UsageQuery
