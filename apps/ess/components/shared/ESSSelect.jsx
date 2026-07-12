'use client'

import { Select as UISelect } from '@webfudge/ui'

/** HR Select — always uses searchable dropdown UI from @webfudge/ui (consistent with CRM forms). */
export default function HRSelect(props) {
  return <UISelect searchable {...props} />
}

export { HRSelect as Select }
