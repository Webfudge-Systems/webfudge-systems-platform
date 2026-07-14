'use client'

import { LogIn, LogOut } from 'lucide-react'
import { Button } from '@webfudge/ui'

export default function ESSTimeClockActions({
  canTimeIn = false,
  canTimeOut = false,
  onTimeIn,
  onTimeOut,
  punching = null,
  size = 'default',
  className = '',
}) {
  const compact = size === 'sm'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <Button
        variant="primary"
        size={compact ? 'sm' : 'default'}
        className="bg-emerald-600 hover:bg-emerald-700"
        disabled={!canTimeIn || Boolean(punching)}
        onClick={onTimeIn}
      >
        <LogIn className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5`} strokeWidth={2} />
        {punching === 'in' ? 'Clocking in…' : 'Time In'}
      </Button>
      <Button
        variant="primary"
        size={compact ? 'sm' : 'default'}
        className="bg-orange-500 hover:bg-orange-600"
        disabled={!canTimeOut || Boolean(punching)}
        onClick={onTimeOut}
      >
        <LogOut className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} mr-1.5`} strokeWidth={2} />
        {punching === 'out' ? 'Clocking out…' : 'Time Out'}
      </Button>
    </div>
  )
}
