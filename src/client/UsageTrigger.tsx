/**
 * Sidebar-foot trigger for the usage modal: an icon row that expands to an
 * icon + label when the sidebar is wide. Component-local open state only.
 */
import { useState } from 'react'
import { IconDataOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { UsageApi } from './usage-api.ts'
import { UsagePanel, type Translate } from './UsagePanel.tsx'
import css from './UsageTrigger.module.css'

/** Props injected by the slot registry: the API face and bound copy. */
export interface UsageTriggerInjected {
  /** The API face; only the usage domain is read. */
  api: { usage: UsageApi }
  /** Bound namespace translate. */
  t: Translate
}

/** Full props: sidebar owner share plus injected face. */
export type UsageTriggerProps = SidebarFooterActionOwnerProps & UsageTriggerInjected

/**
 * The sidebar-foot trigger row and its modal.
 * @param props - owner share plus injected API face and copy.
 */
export function UsageTrigger({ wide, api, t }: UsageTriggerProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={css.trigger}
        aria-label={t('trigger.aria')}
        title={t('trigger.label')}
        onClick={() => { setOpen(true) }}
      >
        <IconDataOutline16 size={16} className={css.icon} />
        {wide && <span className={css.label}>{t('trigger.label')}</span>}
      </button>
      {open && <UsagePanel api={api} t={t} onClose={() => { setOpen(false) }} />}
    </>
  )
}
