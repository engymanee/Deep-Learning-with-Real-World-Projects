import type { ReactNode } from 'react'

/**
 * "PWF Protocols" with a trademark mark next to PWF in superscript.
 *
 * Lives here (not in library-view.tsx) to break a circular import:
 * library-view imports AddResourceDialog, and AddResourceDialog also
 * needs this label - if both pulled it from library-view, the dialog
 * module would evaluate before library-view's body had assigned the
 * const, hitting a TDZ ReferenceError. A neutral leaf module dodges
 * that entirely.
 */
export const PWF_PROTOCOLS_LABEL: ReactNode = (
  <>
    PWF
    <sup className="ml-px text-[0.55em] font-semibold tracking-normal">
      ™
    </sup>{' '}
    Protocols
  </>
)
