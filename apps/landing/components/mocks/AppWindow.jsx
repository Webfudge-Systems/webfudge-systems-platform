/**
 * Illustrations of the Webfudge CRM and Projects screens, drawn in the apps' own style with sample data.
 * Swap any of them for a real screenshot (next/image) once demo-workspace screenshots are ready.
 */

const NAV = {
  crm: ['Dashboard', 'Sales', 'Workspace', 'Clients'],
  board: ['Sales', 'Dashboard', 'Workspace', 'Clients'],
  pm: ['Dashboard', 'My Tasks', 'Inbox', 'Clients'],
}

const STATS = {
  crm: [
    ['Total leads', '128', '+12% this month', 'text-[#1E7A3C]'],
    ['Pipeline value', '₹18.4L', '24 open deals', 'text-brand-ink'],
    ['Conversion', '32%', '+4 pts', 'text-[#1E7A3C]'],
    ['Meetings', '9', 'this week', 'text-muted'],
  ],
  board: [
    ['Open deals', '24', '₹18.4L', 'text-brand-ink'],
    ['Won this month', '6', '₹7.2L', 'text-[#1E7A3C]'],
    ['Avg. deal', '₹76K', 'last 90 days', 'text-muted'],
    ['Win rate', '41%', '+3 pts', 'text-[#1E7A3C]'],
  ],
  pm: [
    ['To do', '12', '4 due this week', 'text-muted'],
    ['In progress', '7', '7 active', 'text-brand-ink'],
    ['Done', '31', 'this month', 'text-[#1E7A3C]'],
    ['Overdue', '2', 'needs attention', 'text-[#B42318]'],
  ],
}

const BARS = [38, 52, 44, 61, 58, 72, 66, 80, 74, 88, 83, 95]
const STAGES = [['Discovery', 9, '90%'], ['Proposal', 7, '70%'], ['Negotiation', 5, '50%'], ['Won', 3, '30%']]
export const CRM_BOARD = [
  { name: 'Discovery', total: 9, dot: '#8A8A8A', cards: [['Northline Foods', '₹2.4L · demo call', 'Warm', 'R', '#F5630F'], ['Kestrel Labs', '₹1.1L · intro sent', 'New', 'A', '#2F5BEA'], ['Coastline Ltd', '₹60K · follow up', 'New', 'M', '#6A45E0']] },
  { name: 'Proposal', total: 7, dot: '#2F5BEA', cards: [['Orbit Studio', '₹3.8L · proposal v2', 'Hot', 'R', '#F5630F'], ['Banyan Retail', '₹90K · pricing', 'Warm', 'M', '#6A45E0']] },
  { name: 'Negotiation', total: 5, dot: '#F5630F', cards: [['Tidewater Co.', '₹1.6L · legal review', 'Hot', 'A', '#2F5BEA'], ['Pinecrest', '₹2.2L · final terms', 'Warm', 'R', '#F5630F']] },
  { name: 'Won', total: 3, dot: '#0E9F6E', cards: [['Sahyadri Agro', '₹5.2L · signed', 'Won', 'A', '#2F5BEA']] },
]
export const PM_BOARD = [
  { name: 'To do', total: 12, dot: '#8A8A8A', cards: [['Homepage copy', 'Brand refresh', 'Content', 'M', '#6A45E0'], ['Product photos', 'Brand refresh', 'Assets', 'V', '#0E9F6E'], ['Kick-off notes', 'Mobile app', 'Docs', 'R', '#F5630F']] },
  { name: 'In progress', total: 7, dot: '#1F4FFF', cards: [['Homepage wireframes', 'Due today', 'Design', 'A', '#1F4FFF'], ['Q3 report', 'Due 5 Nov', 'Report', 'R', '#F5630F']] },
  { name: 'In review', total: 4, dot: '#F5630F', cards: [['Logo variations', 'Reporter: Riya', 'Design', 'A', '#1F4FFF'], ['API docs', 'Mobile app', 'Dev', 'V', '#0E9F6E']] },
  { name: 'Done', total: 31, dot: '#0E9F6E', cards: [['Brand audit', 'Closed 30 Oct', 'Research', 'M', '#6A45E0']] },
]
const TASKS = [
  ['A', '#2F5BEA', 'Homepage wireframes', 'Today', 'In progress', 'bg-brand-soft text-[#8F3907]'],
  ['M', '#6A45E0', 'Client onboarding call', 'Tomorrow', 'To do', 'bg-surface text-[#3A3A3A]'],
  ['R', '#F5630F', 'Q3 report for Orbit', '5 Nov', 'In progress', 'bg-brand-soft text-[#8F3907]'],
  ['V', '#0E9F6E', 'Invoice approvals', '1 Nov', 'Done', 'bg-[#E6F4EA] text-[#1E6B34]'],
]

function Sidebar({ variant, icon, app }) {
  return (
    <aside className="hidden w-[200px] flex-shrink-0 flex-col gap-3 border-r border-line bg-white p-4 md:flex">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="h-6 w-6" />
        <span className="text-[15px] font-bold">{app}</span>
      </div>
      <div className="flex h-8 items-center rounded-[10px] bg-surface px-2.5 text-xs text-[#8A8A8A]">Search here…</div>
      <div className="flex h-9 items-center gap-2 rounded-[10px] bg-brand-soft px-2 text-xs font-semibold">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-brand text-[15px] text-white">+</span>Quick Actions
      </div>
      <div className="grid grid-cols-2 gap-2">
        {NAV[variant].map((label, i) => (
          <div key={label} className={`flex h-[54px] items-end rounded-[10px] p-2 text-[11px] font-semibold ${i === 0 ? 'bg-brand text-white' : 'border border-line bg-white text-[#3A3A3A]'}`}>
            {label}
          </div>
        ))}
      </div>
    </aside>
  )
}

export function Board({ columns, compact = false }) {
  return (
    <div className="grid h-full grid-cols-2 gap-2.5 sm:grid-cols-4">
      {columns.map((col, ci) => (
        <div key={col.name} className={`overflow-hidden rounded-[14px] bg-[#EFEFEC] p-2.5 ${ci > 1 ? 'hidden sm:block' : ''}`}>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
            {col.name} · {col.total}
          </p>
          {col.cards.slice(0, compact ? 2 : 3).map(([title, sub, tag, who, bg]) => (
            <div key={title} className="mb-2 rounded-[10px] bg-white p-2.5">
              <p className="text-[13px] font-semibold">{title}</p>
              <p className="mb-2 mt-1 text-xs text-muted">{sub}</p>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold">{tag}</span>
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: bg }}>
                  {who}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** A full app window: `variant` is 'crm' (dashboard), 'board' (CRM pipeline) or 'pm' (Projects dashboard). */
export default function AppWindow({ variant = 'crm', className = '' }) {
  const isPm = variant === 'pm'
  const icon = isPm ? '/apps/projects.svg' : '/apps/crm.svg'
  const app = isPm ? 'Webfudge PM' : 'Webfudge CRM'
  const title = variant === 'board' ? 'Pipeline board' : isPm ? 'Good morning, Arjun' : 'Good morning, Riya'
  const crumb = variant === 'board' ? 'Sales / Deals' : 'Dashboard'
  return (
    <div className={`flex h-full overflow-hidden bg-[#F6F6F4] ${className}`}>
      <Sidebar variant={variant} icon={icon} app={app} />
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5">
          <div className="flex-1">
            <p className="text-[11px] text-[#8A8A8A]">{crumb}</p>
            <p className="mt-0.5 text-xl font-medium tracking-tight sm:text-2xl">{title}</p>
          </div>
          <div className="hidden h-8 w-40 items-center rounded-full border border-[#F3D3BE] px-3 text-xs text-[#8A8A8A] sm:flex">Search anything…</div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{isPm ? 'AM' : 'RS'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS[variant].map(([label, value, note, tone]) => (
            <div key={label} className="rounded-[14px] bg-white p-3.5">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1.5 text-2xl font-semibold">{value}</p>
              <p className={`mt-1 text-[11px] ${tone}`}>● {note}</p>
            </div>
          ))}
        </div>
        {variant === 'crm' && (
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
            <div className="col-span-3 flex flex-col rounded-[14px] bg-white p-4 lg:col-span-2">
              <p className="mb-3 text-sm font-semibold">Revenue trend</p>
              <div className="flex flex-1 items-end gap-2.5">
                {BARS.map((v, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col justify-end gap-[3px]">
                    <div className="rounded-t-md bg-brand" style={{ height: `${v * 0.7}%` }} />
                    <div className="rounded-sm bg-line" style={{ height: `${(100 - v) * 0.3}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden rounded-[14px] bg-white p-4 lg:block">
              <p className="mb-3.5 text-sm font-semibold">Deals by stage</p>
              {STAGES.map(([name, n, w]) => (
                <div key={name} className="mb-3">
                  <p className="mb-1.5 flex justify-between text-xs text-muted"><span>{name}</span><span>{n}</span></p>
                  <div className="h-2 rounded-full bg-surface"><div className="h-full rounded-full bg-ink" style={{ width: w }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {variant === 'board' && <div className="min-h-0 flex-1"><Board columns={CRM_BOARD} /></div>}
        {variant === 'pm' && (
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
            <div className="col-span-3 rounded-[14px] bg-white p-4 lg:col-span-2">
              <p className="mb-2.5 text-sm font-semibold">My tasks</p>
              {TASKS.map(([i, bg, name, due, status, chip]) => (
                <div key={name} className="flex items-center gap-2.5 border-t border-[#F1F1EE] py-2.5 text-[13px]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: bg }}>{i}</span>
                  <span className="flex-1 font-medium">{name}</span>
                  <span className="text-muted">{due}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip}`}>{status}</span>
                </div>
              ))}
            </div>
            <div className="hidden rounded-[14px] bg-white p-4 lg:block">
              <p className="mb-2.5 text-sm font-semibold">Upcoming deadlines</p>
              {[['NOV', '04', 'Brand refresh launch'], ['NOV', '07', 'Mobile app beta'], ['NOV', '12', 'Annual review deck']].map(([m, d, n]) => (
                <div key={n} className="flex items-center gap-2.5 py-2">
                  <span className="w-10 rounded-lg border border-line py-1 text-center text-[10px] font-bold text-brand-ink">
                    {m}<span className="block text-[15px] text-ink">{d}</span>
                  </span>
                  <span className="text-[13px] font-medium">{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
