'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Modal } from '@webfudge/ui'
import { Lock, Search, Trash2, Users } from 'lucide-react'
import workspaceService from '../lib/api/workspaceService'
import { fetchPmAssignableUsers } from '../lib/api/messageService'

const KIND_OPTIONS = [
  { value: 'team', label: 'Team' },
  { value: 'department', label: 'Department' },
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'other', label: 'Other' },
]

function userLabel(u) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name || u.name || u.username || u.email || `User ${u.id}`
}

/**
 * Create or edit a workspace (W1). `workspace` = null → create.
 * Members: "Everyone in the organization" (default) or "Only chosen people".
 */
export default function WorkspaceSettingsModal({ isOpen, onClose, workspace = null, onSaved }) {
  const isEdit = Boolean(workspace?.id)
  const isDefault = Boolean(workspace?.isDefault)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState('team')
  const [membersMode, setMembersMode] = useState('all')
  const [memberIds, setMemberIds] = useState([])
  const [adminIds, setAdminIds] = useState([])
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setName(workspace?.name || '')
    setDescription(workspace?.description || '')
    setKind(workspace?.kind && workspace.kind !== 'general' ? workspace.kind : 'team')
    setMembersMode(workspace?.membersMode || 'all')
    setMemberIds((workspace?.members || []).map((m) => String(m.id)))
    setAdminIds((workspace?.admins || []).map((m) => String(m.id)))
    setSearch('')
    setError('')
    setConfirmDelete(false)
    fetchPmAssignableUsers()
      .then((list) => setPeople(Array.isArray(list) ? list : []))
      .catch(() => setPeople([]))
  }, [isOpen, workspace])

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = [...people].sort((a, b) => userLabel(a).localeCompare(userLabel(b)))
    if (!q) return list
    return list.filter((u) => `${userLabel(u)} ${u.email || ''}`.toLowerCase().includes(q))
  }, [people, search])

  const toggle = (setter) => (id) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleMember = toggle(setMemberIds)
  const toggleAdmin = toggle(setAdminIds)

  const save = async () => {
    if (!name.trim()) {
      setError('Give the workspace a name')
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        membersMode,
        members: memberIds.map(Number),
        admins: adminIds.map(Number),
      }
      if (!isDefault) data.kind = kind
      const saved = isEdit
        ? await workspaceService.update(workspace.id, data)
        : await workspaceService.create(data)
      onSaved?.(saved)
      onClose?.()
    } catch (e) {
      setError(e?.message || 'Could not save the workspace')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await workspaceService.remove(workspace.id)
      onSaved?.(null)
      onClose?.()
    } catch (e) {
      setError(e?.message || 'Could not delete the workspace')
    } finally {
      setBusy(false)
    }
  }

  const fieldClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Workspace settings' : 'New workspace'}
      subtitle={isEdit ? workspace?.name : 'Group projects for a team, department or client'}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-gray-700">Name</span>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clients, Internal, Design team"
              maxLength={120}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-700">Type</span>
            <select
              className={fieldClass}
              value={isDefault ? 'general' : kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={isDefault}
            >
              {isDefault ? <option value="general">General</option> : null}
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-700">Description (optional)</span>
          <textarea
            className={`${fieldClass} min-h-[64px]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-gray-700">Who can see this workspace</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { value: 'all', icon: Users, title: 'Everyone in the organization', hint: 'New members see it automatically' },
              { value: 'restricted', icon: Lock, title: 'Only chosen people', hint: 'Projects are hidden from everyone else' },
            ].map((opt) => {
              const Icon = opt.icon
              const selected = membersMode === opt.value
              const disabled = isDefault && opt.value === 'restricted'
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMembersMode(opt.value)}
                  className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-200' : 'border-gray-200 hover:bg-gray-50'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  aria-pressed={selected}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-orange-600' : 'text-gray-500'}`} />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{opt.title}</span>
                    <span className="block text-xs text-gray-500">{opt.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {isDefault ? (
            <p className="mt-2 text-xs text-gray-500">The default workspace is always open to everyone.</p>
          ) : null}
        </fieldset>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-700">
              {membersMode === 'restricted' ? 'Members' : 'Workspace admins'}
            </span>
            <span className="text-[11px] text-gray-500">
              {membersMode === 'restricted'
                ? `${new Set([...memberIds, ...adminIds]).size} selected`
                : 'Admins can rename the workspace and change members'}
            </span>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className={`${fieldClass} pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
            />
          </div>
          <ul className="max-h-60 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200">
            {filteredPeople.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-gray-500">No people found</li>
            ) : (
              filteredPeople.map((u) => {
                const id = String(u.id)
                const isMember = memberIds.includes(id)
                const isAdmin = adminIds.includes(id)
                return (
                  <li key={id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{userLabel(u)}</span>
                      {u.email ? <span className="block truncate text-xs text-gray-500">{u.email}</span> : null}
                    </span>
                    {membersMode === 'restricted' ? (
                      <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-orange-500"
                          checked={isMember || isAdmin}
                          disabled={isAdmin}
                          onChange={() => toggleMember(id)}
                        />
                        Member
                      </label>
                    ) : null}
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-orange-500"
                        checked={isAdmin}
                        onChange={() => toggleAdmin(id)}
                      />
                      Admin
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </div>

        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isEdit && !isDefault ? (
              confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                  <span>Projects move to General. Delete?</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                    Keep
                  </Button>
                  <Button type="button" size="sm" onClick={remove} disabled={busy} className="!bg-red-600 hover:!bg-red-700">
                    Delete workspace
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete workspace
                </button>
              )
            ) : null}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={busy} className="flex-1 sm:flex-none">
              {busy ? 'Saving…' : isEdit ? 'Save' : 'Create workspace'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
