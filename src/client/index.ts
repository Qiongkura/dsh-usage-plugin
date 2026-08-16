/**
 * Usage statistics plugin, browser half: contributes the sidebar-foot trigger
 * that opens the usage modal. The data arrives through one unary
 * `usage.query` call per control change, so the plugin holds no state of its
 * own beyond the trigger's component-local open flag.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { UsageTrigger, type UsageTriggerInjected } from './UsageTrigger.tsx'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { en, NS, zh, type UsageKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Token usage statistics copy. */
    'usage': UsageKey
  }
}

export type { UsagePanelProps, Translate, UsagePreset } from './UsagePanel.tsx'
export type { UsageTriggerInjected, UsageTriggerProps } from './UsageTrigger.tsx'
export type { UsageApi, UsageDimension, UsageQueryResult, UsageRow } from './usage-api.ts'

/** Required services for locale registration and the footer-action contribution. */
export const inject = ['slots', 'locale', 'connection']

/**
 * Client plugin body: register the dictionaries and the footer action.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-usage: dictionaries')
  const connection = ctx.get('connection') as { api: { usage: unknown } }
  const t = ctx.locale.bind(NS) as UsageTriggerInjected['t']
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'usage',
    // After the settings seat: the stats action is an auxiliary foot entry.
    order: 30,
    locale: NS,
    /* v8 ignore next -- the inject face runs only at render time, outside the plugin test bench */
    inject: (): UsageTriggerInjected => ({ api: connection.api as UsageTriggerInjected['api'], t }),
  }, UsageTrigger))
}
