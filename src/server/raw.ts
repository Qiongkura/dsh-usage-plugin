/**
 * Lightweight raw-artifact scanner: extracts only the usage-relevant events
 * from one session log's decoded text. The durable format packs delta-chunk
 * runs into single rows, so a full event-by-event replay (validation plus
 * cloning of every chunk) costs seconds on large sessions while the events
 * this fold needs — `request/header`, `assistant/message`, and usage
 * `assistant/chunk` records — are never packed and can be line-scanned in
 * milliseconds. A torn or unparseable tail line is skipped, never fatal.
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { TokenUsageView } from './types.ts'

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
function parseRawEvent(line: string): SessionEvent | undefined {
  try {
    if (line.includes('"request/header"')) {
      const record = JSON.parse(line) as {
        seq?: number
        time: number
        data?: { header?: { config?: { provider?: string; model?: string } } }
      }
      const config = record.data?.header?.config
      if (config?.provider === undefined || config.model === undefined) return undefined
      return {
        type: 'request/header',
        seq: record.seq ?? 0,
        time: record.time,
        data: { header: { config: { provider: config.provider, model: config.model } }, reason: 'scan' },
      } as SessionEvent
    }
    if (line.includes('"assistant/message"')) {
      const record = JSON.parse(line) as {
        seq?: number
        time: number
        data?: { turn: number; step: number; usage?: TokenUsageView }
      }
      const data = record.data
      if (data?.usage === undefined) return undefined
      return {
        type: 'assistant/message',
        seq: record.seq ?? 0,
        time: record.time,
        data: { turn: data.turn, step: data.step, usage: data.usage },
      } as SessionEvent
    }
    if (line.includes('"assistant/chunk"') && line.includes('"type":"usage"')) {
      const record = JSON.parse(line) as {
        seq?: number
        time: number
        data: { turn: number; step: number; chunk: { type: 'usage'; usage: TokenUsageView } }
      }
      return {
        type: 'assistant/chunk',
        seq: record.seq ?? 0,
        time: record.time,
        data: {
          turn: record.data.turn,
          step: record.data.step,
          chunk: { type: 'usage', usage: record.data.chunk.usage },
        },
      } as SessionEvent
    }
    return undefined
  } catch {
    // A torn tail or non-JSON line carries no complete usage record.
    return undefined
  }
}

/**
 * Scan one raw artifact for usage-relevant events in line order.
 * @param content - the artifact's decoded text (newline-delimited JSONL).
 * @returns minimal events the fold already consumes (header, usage message,
 * and usage chunk records only).
 */
export function scanRawUsageEvents(content: string): SessionEvent[] {
  const events: SessionEvent[] = []
  for (const line of content.split('\n')) {
    if (!line.includes('"type"')) continue
    const event = parseRawEvent(line)
    if (event !== undefined) events.push(event)
  }
  return events
}

/**
 * Scan one raw artifact for the seq of its first `session/end-seed` record.
 * A fork's seed prefix ends at that marker, so it doubles as the legacy
 * ownership boundary when the session header carries no `seedLength`.
 * @param content - the artifact's decoded text.
 * @returns the first end-seed seq, or `undefined` when none exists.
 */
export function scanRawSeedSeq(content: string): number | undefined {
  for (const line of content.split('\n')) {
    if (!line.includes('"session/end-seed"')) continue
    try {
      const record = JSON.parse(line) as { seq?: number; type?: string }
      if (record.type === 'session/end-seed' && typeof record.seq === 'number') return record.seq
    } catch { /* torn line */ }
  }
  return undefined
}

/**
 * Scan one raw artifact for the latest logged session title. Titles are
 * `session/title` records that are never packed, so a prefiltered line scan
 * finds the newest one without replaying the log. A torn or unparseable tail
 * line is skipped, never fatal.
 * @param content - the artifact's decoded text (newline-delimited JSONL).
 * @returns the newest title text, or `undefined` when the log has none.
 */
export function scanRawSessionTitle(content: string): string | undefined {
  let title: string | undefined
  for (const line of content.split('\n')) {
    if (!line.includes('"session/title"')) continue
    try {
      const record = JSON.parse(line) as { data?: { title?: string } }
      if (typeof record.data?.title === 'string' && record.data.title.length > 0) {
        title = record.data.title
      }
    } catch { /* torn tail */ }
  }
  return title
}
