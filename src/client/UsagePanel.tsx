/**
 * Usage statistics modal: date presets + group-by chips over the
 * `usage.query` remote, rendered as a daily/model/session bar strip plus a
 * grouped totals table. Component-local viewing state only — every datum
 * comes from one unary call, refetched when the range or grouping changes.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { UsageApi, UsageDimension, UsageQueryResult, UsageRow } from './usage-api.ts'
import type { UsageKey } from './locales.ts'
import css from './UsagePanel.module.css'

/** Bound translate for the `usage` namespace. */
export type Translate = (key: UsageKey, params?: Record<string, string | number>) => string

/** Panel props: the caller injects the API face and copy; the panel owns its state. */
export interface UsagePanelProps {
  /** The API face; only the usage domain is read. */
  api: { usage: UsageApi }
  /** Bound namespace translate. */
  t: Translate
  /** Close the modal (mask click, header button, or Escape). */
  onClose: () => void
}

/** Date-range presets; `custom` means the two date inputs own the range. */
export type UsagePreset = 'today' | 'days7' | 'days30' | 'all' | 'custom'

/** Row ordering choices exposed by the panel; `default` = dimension order. */
export type UsageSortChoice = 'default' | 'tokens-desc' | 'tokens-asc'

const DIMENSIONS: readonly UsageDimension[] = ['day', 'model', 'session', 'workspace']

const SORTS: readonly UsageSortChoice[] = ['default', 'tokens-desc', 'tokens-asc']

/** Local calendar day literal (`YYYY-MM-DD`) at `offsetDays` from today. */
export function localDay(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${String(date.getFullYear())}-${month}-${day}`
}

const columnKey = (dimension: UsageDimension): UsageKey =>
  dimension === 'day' ? 'column.day'
    : dimension === 'model' ? 'column.model'
      : dimension === 'workspace' ? 'column.workspace'
        : 'column.session'

/** Short display name for a workspace path: the last path segment only. */
function workspaceName(path: string): string {
  const segments = path.split(/[\\/]/).filter(segment => segment.length > 0)
  return segments.length > 0 ? segments[segments.length - 1]! : path
}

/** Rows with their first grouped dimension as the bar label. */
function barsOf(data: UsageQueryResult | undefined, first: UsageDimension | undefined): { label: string; value: number }[] {
  if (data === undefined) return []
  /* v8 ignore next 2 -- the toggle keeps at least one dimension, so `first` is always defined */
  if (first === undefined) return []
  const field = first === 'day' ? 'day' : first === 'model' ? 'model' : first === 'workspace' ? 'workspace' : 'sessionId'
  /* v8 ignore next -- every row carries the selected dimension field, so the fallback is unreachable */
  return data.rows.map(row => ({
    label: first === 'session' ? (row.sessionTitle ?? row.sessionId ?? '')
      : first === 'workspace' && row.workspace !== undefined ? workspaceName(row.workspace)
        : (row[field] ?? ''),
    value: row.totalTokens,
  }))
}

/** Cell text for one dimension field: unknown models translate, absent fields dash. */
function cellOf(row: UsageRow, dimension: UsageDimension, t: Translate): string {
  const value = dimension === 'day' ? row.day
    : dimension === 'model' ? row.model
      : dimension === 'workspace' ? (row.workspace === undefined ? undefined : workspaceName(row.workspace))
        : (row.sessionTitle ?? row.sessionId)
  /* v8 ignore next -- cellOf runs only for grouped dimensions, whose rows always carry the field */
  if (value === undefined || value === '') return '—'
  if (dimension === 'model' && value === 'unknown') return t('model.unknown')
  return value
}

/**
 * The usage modal.
 * @param props - injected API face, copy, and close path.
 */
export function UsagePanel({ api, t, onClose }: UsagePanelProps) {
  const [preset, setPreset] = useState<UsagePreset>('days7')
  const [from, setFrom] = useState<string>(() => localDay(-6))
  const [to, setTo] = useState<string>(() => localDay(0))
  // The open moment is the statistics cutoff: usage produced after the panel
  // opened stays out of this view (a reopen captures a fresh moment).
  const [asOf] = useState(() => Date.now())
  const [groupBy, setGroupBy] = useState<readonly UsageDimension[]>(['day', 'model'])
  const [sortBy, setSortBy] = useState<UsageSortChoice>('default')
  const [data, setData] = useState<UsageQueryResult | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const titleId = useRef(`usage-title-${Math.random().toString(36).slice(2)}`).current
  const groupKey = groupBy.join(',')

  const applyPreset = (next: UsagePreset): void => {
    setPreset(next)
    if (next === 'today') { setFrom(localDay(0)); setTo(localDay(0)) }
    else if (next === 'days7') { setFrom(localDay(-6)); setTo(localDay(0)) }
    else if (next === 'days30') { setFrom(localDay(-29)); setTo(localDay(0)) }
    else { setFrom(''); setTo('') }
  }

  const toggleDimension = (dimension: UsageDimension): void => {
    setGroupBy((current) => {
      if (current.includes(dimension)) {
        // The last dimension cannot be switched off: a query must group by something.
        return current.length > 1 ? current.filter(d => d !== dimension) : current
      }
      return [...current, dimension]
    })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void api.usage.query({
      ...(from === '' ? {} : { from }),
      ...(to === '' ? {} : { to }),
      asOf,
      groupBy: [...groupBy],
      ...(sortBy === 'default' ? {} : { sortBy }),
    }).then((response) => {
      if (cancelled) return
      setLoading(false)
      if (response.result.ok) {
        setData(response.result.value)
        setError(undefined)
      } else {
        setError(response.result.error.message)
      }
    }, (reason: unknown) => {
      // The carrier can reject without an RPC result (transport abort,
      // timeout, connection loss); surface it instead of spinning forever.
      if (cancelled) return
      setLoading(false)
      setError(reason instanceof Error ? reason.message : String(reason))
    })
    return () => { cancelled = true }
  }, [api, from, to, groupKey, sortBy])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  const bars = useMemo(() => barsOf(data, groupBy[0]), [data, groupBy])
  const max = Math.max(1, ...bars.map(bar => bar.value))
  const totalRequests = data === undefined ? 0 : data.rows.reduce((sum, row) => sum + row.requests, 0)

  return createPortal(
    <div className={css.overlay} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={onClose} />
      <div className={css.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className={css.header}>
          <h2 className={css.title} id={titleId}>{t('panel.title')}</h2>
          <button type="button" className={css.close} aria-label={t('panel.close')} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className={css.controls}>
          <div className={css.chips} role="group" aria-label={t('panel.title')}>
            {(['today', 'days7', 'days30', 'all'] as const).map(presetId => (
              <button
                key={presetId}
                type="button"
                className={preset === presetId ? `${css.chip} ${css.active}` : css.chip}
                aria-pressed={preset === presetId}
                onClick={() => { applyPreset(presetId) }}
              >
                {t(`preset.${presetId}`)}
              </button>
            ))}
          </div>
          <div className={css.range}>
            <input type="date" aria-label={t('preset.custom')} value={from} onChange={(e) => { setFrom(e.target.value); setPreset('custom') }} />
            <span className={css.dash} aria-hidden="true">–</span>
            <input type="date" aria-label={t('preset.custom')} value={to} onChange={(e) => { setTo(e.target.value); setPreset('custom') }} />
          </div>
          <div className={css.chips} role="group" aria-label={t('panel.title')}>
            {DIMENSIONS.map(dimension => (
              <button
                key={dimension}
                type="button"
                className={groupBy.includes(dimension) ? `${css.chip} ${css.active}` : css.chip}
                aria-pressed={groupBy.includes(dimension)}
                onClick={() => { toggleDimension(dimension) }}
              >
                {t(columnKey(dimension))}
              </button>
            ))}
          </div>
          <div className={css.chips} role="group" aria-label={t('sort.label')}>
            {SORTS.map(sort => (
              <button
                key={sort}
                type="button"
                className={sortBy === sort ? `${css.chip} ${css.active}` : css.chip}
                aria-pressed={sortBy === sort}
                onClick={() => { setSortBy(sort) }}
              >
                {t(`sort.${sort}`)}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className={css.note}>{t('panel.loading')}</p>}
        {!loading && error !== undefined && <p className={css.note}>{t('panel.error', { message: error })}</p>}
        {!loading && error === undefined && data !== undefined && data.rows.length === 0
          && <p className={css.note}>{t('panel.empty')}</p>}
        {!loading && error === undefined && data !== undefined && data.rows.length > 0 && (
          <>
            <p className={css.summary}>
              {t('summary.total', { tokens: data.total.totalTokens.toLocaleString(), requests: totalRequests.toLocaleString() })}
              <span className={css.asOf}> {t('panel.asOf', { time: new Date(asOf).toLocaleString() })}</span>
            </p>
            <div className={css.bars} role="img" aria-label={t('panel.title')}>
              {bars.map(bar => (
                <div key={bar.label} className={css.barRow}>
                  <span className={css.barLabel}>{bar.label}</span>
                  <div className={css.barTrack}>
                    <div className={css.barFill} style={{ width: `${(bar.value / max) * 100}%` }} />
                  </div>
                  <span className={css.barValue}>{bar.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <table className={css.table}>
              <thead>
                <tr>
                  {groupBy.map(dimension => <th key={dimension} scope="col">{t(columnKey(dimension))}</th>)}
                  <th scope="col">{t('column.input')}</th>
                  <th scope="col">{t('column.output')}</th>
                  <th scope="col">{t('column.cacheRead')}</th>
                  <th scope="col">{t('column.cacheWrite')}</th>
                  <th scope="col">{t('column.total')}</th>
                  <th scope="col">{t('column.requests')}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, index) => (
                  <tr key={`${row.day ?? ''}-${row.model ?? ''}-${row.sessionId ?? ''}-${index}`}>
                    {groupBy.map(dimension => <td key={dimension}>{cellOf(row, dimension, t)}</td>)}
                    <td>{row.inputTokens.toLocaleString()}</td>
                    <td>{row.outputTokens.toLocaleString()}</td>
                    <td>{row.cacheReadTokens.toLocaleString()}</td>
                    <td>{row.cacheWriteTokens.toLocaleString()}</td>
                    <td>{row.totalTokens.toLocaleString()}</td>
                    <td>{row.requests.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={groupBy.length}>{t('column.total')}</th>
                  <td>{data.total.inputTokens.toLocaleString()}</td>
                  <td>{data.total.outputTokens.toLocaleString()}</td>
                  <td>{data.total.cacheReadTokens.toLocaleString()}</td>
                  <td>{data.total.cacheWriteTokens.toLocaleString()}</td>
                  <td>{data.total.totalTokens.toLocaleString()}</td>
                  <td>{totalRequests.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
