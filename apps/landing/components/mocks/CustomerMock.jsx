/**
 * A stylised preview of the software each customer runs (placeholder until real, client-approved
 * screenshots are added — set `screenshot` on the customer in data/customers.js to use one).
 */

const THEMES = {
  evi: { stage: 'linear-gradient(160deg,#3A3A3A,#141414)', window: 'EVI · ERP', side: ['#E9E9E6'], accent: '#EDEDEA', blocks: [[1, '#EDEDEA'], [1, '#EDEDEA'], [1, '#EDEDEA'], [3, '#F5F5F3'], [2, '#F5F5F3'], [1, '#EDEDEA']] },
  xtrawrkx: { stage: 'linear-gradient(160deg,#FF8A5C,#E8336B)', window: 'Xtrawrkx · Client portal', side: ['#FFE3D6'], accent: '#FFE9DF', popup: true, blocks: [[2, '#FFE9DF'], [1, '#F4F4F2'], [1, '#F4F4F2'], [1, '#F4F4F2'], [1, '#F4F4F2'], [3, '#F7F7F5']] },
  positiev: { stage: 'linear-gradient(160deg,#2C5A92,#173A66)', window: 'PositiEV · Webfudge CRM', side: ['#FFE3D6'], accent: '#EFEFEC', blocks: [[1, '#EFEFEC'], [1, '#EFEFEC'], [1, '#EFEFEC'], [1, '#F6F6F4'], [1, '#F6F6F4'], [1, '#F6F6F4']] },
  bikewo: { stage: 'linear-gradient(160deg,#3FB98A,#14523C)', window: 'BikeWo · Webfudge CRM', side: ['#DDF3E9'], accent: '#E5F5EE', blocks: [[2, '#E5F5EE'], [1, '#F4F4F2'], [1, '#F4F4F2'], [2, '#F4F4F2'], [3, '#F7F7F5']] },
}

export default function CustomerMock({ customer, tall = false }) {
  const t = THEMES[customer.slug] || THEMES.positiev
  if (customer.screenshot) {
    return (
      <div className={`overflow-hidden rounded-[28px] ${tall ? 'h-[420px]' : 'h-[340px]'}`} style={{ background: t.stage }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={customer.screenshot} alt={`${customer.name} software`} className="h-full w-full object-cover object-top" />
      </div>
    )
  }
  return (
    <div aria-hidden="true" className={`relative overflow-hidden rounded-[28px] px-6 pt-8 transition-transform duration-500 group-hover:-translate-y-1 sm:px-9 sm:pt-9 ${tall ? 'h-[420px]' : 'h-[340px]'}`} style={{ background: t.stage }}>
      <div className="h-full overflow-hidden rounded-t-2xl bg-white text-ink shadow-[0_30px_60px_-20px_rgba(0,0,0,.5)]">
        <div className="flex items-center gap-1.5 border-b border-[#EFEFEC] px-3.5 py-2.5">
          <span className="h-2 w-2 rounded-full bg-[#E2E2DE]" />
          <span className="h-2 w-2 rounded-full bg-[#E2E2DE]" />
          <span className="h-2 w-2 rounded-full bg-[#E2E2DE]" />
          <span className="ml-2.5 text-xs font-semibold">{t.window}</span>
        </div>
        <div className="flex h-full">
          <div className="hidden w-[120px] flex-shrink-0 flex-col gap-2 border-r border-[#EFEFEC] p-3 sm:flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-[22px] rounded-md" style={{ background: i === 0 ? t.side[0] : '#F4F4F2' }} />
            ))}
          </div>
          <div className="grid flex-1 auto-rows-[64px] grid-cols-3 gap-2.5 p-3.5">
            {t.blocks.map(([span, bg], i) => (
              <span key={i} className="rounded-[10px]" style={{ background: bg, gridColumn: `span ${span}` }} />
            ))}
          </div>
        </div>
      </div>
      {t.popup && (
        <div className="absolute right-6 top-[70px] w-[190px] rounded-2xl bg-white p-3.5 text-ink shadow-[0_20px_40px_-10px_rgba(0,0,0,.45)]">
          <p className="text-xs font-bold">LinkedIn extension</p>
          <p className="mb-2.5 mt-1.5 text-[11px] text-muted">Save this profile as a lead</p>
          <span className="block rounded-full bg-ink py-1.5 text-center text-xs font-semibold text-white">Add to CRM</span>
        </div>
      )}
    </div>
  )
}
