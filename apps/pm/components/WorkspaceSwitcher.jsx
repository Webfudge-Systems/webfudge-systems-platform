'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Layers, Lock, Plus, Settings2 } from 'lucide-react'
import WorkspaceSettingsModal from './WorkspaceSettingsModal'
import { refreshWorkspaces, setActiveWorkspace } from '../lib/useWorkspaces'

/**
 * Sidebar workspace switcher (W1). Picks the active workspace ("All workspaces" or one),
 * which filters the sidebar and the Projects page. Admins get create / settings.
 */
export default function WorkspaceSwitcher({ ws }) {
  const { workspaces, canCreate, activeId, active } = ws
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState({ open: false, workspace: null })
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (id) => {
    setActiveWorkspace(id)
    setOpen(false)
  }

  const label = active ? active.name : 'All workspaces'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-gray-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
          <Layers className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Workspace</span>
          <span className="flex items-center gap-1 truncate text-sm font-semibold text-gray-900">
            <span className="truncate">{label}</span>
            {active?.membersMode === 'restricted' ? <Lock className="h-3 w-3 shrink-0 text-gray-500" /> : null}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          role="listbox"
        >
          <ul className="max-h-72 overflow-y-auto py-1">
            {[{ id: 'all', name: 'All workspaces' }, ...workspaces].map((w) => {
              const selected = String(activeId) === String(w.id)
              return (
                <li key={w.id} className="group flex items-center">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(w.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm ${
                      selected ? 'font-semibold text-orange-700' : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex w-4 shrink-0 justify-center">
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <span className="truncate">{w.name}</span>
                    {w.membersMode === 'restricted' ? <Lock className="h-3 w-3 shrink-0 text-gray-400" /> : null}
                    {w.id !== 'all' ? (
                      <span className="ml-auto shrink-0 text-[11px] text-gray-400">{w.projectCount ?? 0}</span>
                    ) : null}
                  </button>
                  {w.canManage ? (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        setModal({ open: true, workspace: w })
                      }}
                      className="mr-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      aria-label={`${w.name} settings`}
                      title="Workspace settings"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {canCreate ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setModal({ open: true, workspace: null })
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              <Plus className="h-4 w-4" />
              New workspace
            </button>
          ) : null}
        </div>
      ) : null}

      <WorkspaceSettingsModal
        isOpen={modal.open}
        workspace={modal.workspace}
        onClose={() => setModal({ open: false, workspace: null })}
        onSaved={(saved) => {
          refreshWorkspaces()
          if (saved?.id && !modal.workspace) setActiveWorkspace(saved.id)
          if (saved === null && String(activeId) === String(modal.workspace?.id)) setActiveWorkspace('all')
        }}
      />
    </div>
  )
}
