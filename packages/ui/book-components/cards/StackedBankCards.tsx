'use client'

import { useCallback, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight, CreditCard, Plus } from 'lucide-react'
import { Button, Card } from '@webfudge/ui'

export type BankCardDisplay = {
  id: string
  bankName: string
  maskedNumber: string
  expiry: string
  gradientClassName: string
}

export type StackedBankCardsProps = {
  title?: string
  cards?: BankCardDisplay[]
  className?: string
  /** Show credit-card icon beside the title (e.g. “My Wallet” header). */
  showCardIcon?: boolean
  addNewLabel?: string
  onAddNew?: () => void
}

const DEFAULT_CARDS: BankCardDisplay[] = [
  {
    id: '1',
    bankName: 'Sunrise Bank',
    maskedNumber: '•••• •••• 6782',
    expiry: '09/27',
    gradientClassName: 'bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400',
  },
  {
    id: '2',
    bankName: 'Coastal Credit',
    maskedNumber: '•••• •••• 4410',
    expiry: '03/26',
    gradientClassName: 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950',
  },
  {
    id: '3',
    bankName: 'Harbor Finance',
    maskedNumber: '•••• •••• 9921',
    expiry: '12/28',
    gradientClassName: 'bg-gradient-to-br from-indigo-400 via-blue-400 to-sky-300',
  },
]

function stackStyle(position: number) {
  switch (position) {
    case 0:
      return {
        z: 'z-30',
        transform:
          '[transform-style:preserve-3d] [transform:translate3d(0,0,0)_scale(1)_rotateY(0deg)]',
        opacity: 'opacity-100',
      }
    case 1:
      return {
        z: 'z-20',
        transform:
          '[transform-style:preserve-3d] [transform:translate3d(2rem,0.25rem,0)_scale(0.96)_rotateY(-5deg)] sm:[transform:translate3d(2.5rem,0.25rem,0)_scale(0.96)_rotateY(-5deg)]',
        opacity: 'opacity-[0.96]',
      }
    default:
      return {
        z: 'z-10',
        transform:
          '[transform-style:preserve-3d] [transform:translate3d(4rem,0.5rem,0)_scale(0.92)_rotateY(-8deg)] sm:[transform:translate3d(4.25rem,0.5rem,0)_scale(0.92)_rotateY(-8deg)]',
        opacity: 'opacity-[0.9]',
      }
  }
}

function MastercardMark({ className }: { className?: string }) {
  return (
    <div className={clsx('relative h-9 w-12 shrink-0', className)} aria-hidden>
      <span className="absolute left-0 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white/95 opacity-90" />
      <span className="absolute left-4 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white/70 opacity-90" />
    </div>
  )
}

export function StackedBankCards({
  title = 'My Wallet',
  cards = DEFAULT_CARDS,
  className,
  showCardIcon = false,
  addNewLabel = 'Add new',
  onAddNew,
}: StackedBankCardsProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + cards.length) % cards.length)
  }, [cards.length])

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % cards.length)
  }, [cards.length])

  const ordered = useMemo(() => {
    return cards.map((card, i) => {
      const position = (i - activeIndex + cards.length) % cards.length
      return { card, position }
    })
  }, [cards, activeIndex])

  return (
    <Card
      variant="elevated"
      padding={false}
      className={clsx(
        'flex min-h-0 flex-col p-6 !bg-[var(--books-bg-card,#ffffff)] md:p-7 dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        className
      )}
    >
      <div className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {showCardIcon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--books-orange-bg)] text-[var(--books-orange-text,#ea580c)]">
              <CreditCard className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <h2 className="truncate text-lg font-semibold tracking-tight text-[var(--books-text-primary,#111827)]">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {onAddNew ? (
            <Button
              type="button"
              variant="muted"
              size="sm"
              rounded="pill"
              className="border border-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-elevated,#f9fafb)] px-3 text-xs font-semibold text-[var(--books-text-secondary,#374151)] hover:border-orange-200 hover:bg-[var(--books-orange-bg)] hover:text-[var(--books-orange-text,#c2410c)]"
              onClick={onAddNew}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
              {addNewLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="muted"
            size="sm"
            rounded="pill"
            className="h-9 w-9 min-w-0 p-0 text-[var(--books-text-secondary,#4b5563)] hover:text-[#EA580C]"
            onClick={goPrev}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="muted"
            size="sm"
            rounded="pill"
            className="h-9 w-9 min-w-0 p-0 text-[var(--books-text-secondary,#4b5563)] hover:text-[#EA580C]"
            onClick={goNext}
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fixed-size stage so absolute stacked cards keep horizontal layout (flex-1 + flow-less abs children was collapsing width). */}
      <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center py-3 sm:py-5">
        <div
          className="relative mx-auto h-[236px] w-full max-w-[340px] min-w-[280px] [perspective:1000px] sm:h-[260px] sm:max-w-[360px] sm:min-w-[300px]"
          style={{ isolation: 'isolate' }}
        >
          {ordered.map(({ card, position }) => {
            const s = stackStyle(position)
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveIndex(cards.findIndex((c) => c.id === card.id))}
                className={clsx(
                  'absolute left-0 top-0 w-[min(100%,300px)] max-w-[300px] origin-left cursor-pointer text-left outline-none ring-orange-500/0 transition-all duration-300 sm:w-[min(100%,320px)] sm:max-w-[320px]',
                  'focus-visible:ring-2 focus-visible:ring-orange-500',
                  s.z,
                  s.transform,
                  s.opacity
                )}
                aria-label={`${card.bankName}, ${card.maskedNumber}`}
                aria-current={position === 0 ? 'true' : undefined}
              >
                <div
                  className={clsx(
                    'relative overflow-hidden rounded-2xl border border-white/20 p-5 text-white shadow-lg transition-all duration-300',
                    'hover:shadow-xl hover:[transform:scale(1.02)]',
                    card.gradientClassName
                  )}
                >
                  <div
                    className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-8 left-1/2 h-28 w-40 -translate-x-1/2 rounded-full bg-black/10"
                    aria-hidden
                  />

                  <div className="relative flex items-start justify-between gap-3">
                    <MastercardMark />
                    {position === 0 && (
                      <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="relative mt-10 space-y-4">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">Bank</p>
                      <p className="text-base font-semibold tracking-tight">{card.bankName}</p>
                    </div>
                    <p className="font-mono text-sm font-medium tracking-[0.2em]">{card.maskedNumber}</p>
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-white/70">Valid thru</p>
                        <p className="text-sm font-semibold">{card.expiry}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-center gap-1.5">
        {cards.map((c, i) => (
          <span
            key={c.id}
            className={clsx(
              'h-1.5 rounded-full transition-all duration-300',
              i === activeIndex ? 'w-6 bg-[#EA580C]' : 'w-1.5 bg-[var(--books-border-em,rgba(0,0,0,0.15))]'
            )}
            aria-hidden
          />
        ))}
      </div>
    </Card>
  )
}

export default StackedBankCards
