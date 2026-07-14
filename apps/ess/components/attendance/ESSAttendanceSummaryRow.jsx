'use client'

import { UserCheck, UserX, Clock, CalendarOff } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import ESSKpiRow from '../layout/ESSKpiRow'

export default function ESSAttendanceSummaryRow({ summary = {} }) {
  const present = summary.present || 0
  const absent = summary.absent || 0
  const onLeave = summary.leave || 0
  const notMarked = summary.not_marked || 0

  return (
    <ESSKpiRow columns={4}>
      <KPICard
        title="Present"
        value={String(present)}
        subtitle={present === 1 ? 'day marked' : 'days marked'}
        icon={UserCheck}
        colorScheme="orange"
      />
      <KPICard
        title="On Leave"
        value={String(onLeave)}
        subtitle={onLeave === 1 ? 'leave day' : 'leave days'}
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Absent"
        value={String(absent)}
        subtitle={absent === 1 ? 'day absent' : 'days absent'}
        icon={UserX}
        colorScheme="orange"
      />
      <KPICard
        title="Not Marked"
        value={String(notMarked)}
        subtitle="working days pending"
        icon={CalendarOff}
        colorScheme="orange"
      />
    </ESSKpiRow>
  )
}
