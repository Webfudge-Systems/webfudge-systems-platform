/**
 * Weekly timesheets (ticket W5) — Strapi /timesheets/*.
 */
import strapiClient from '../strapiClient'

const timesheetService = {
  async getWeek(weekStart, userId) {
    const res = await strapiClient.get('/timesheets/week', { weekStart, ...(userId ? { userId } : {}) })
    return res?.data
  },
  /** Sets (not adds) hours for one task on one day; 0 clears the cell. */
  async setCell({ date, taskId, hours, billable }) {
    const res = await strapiClient.put('/timesheets/cell', { data: { date, taskId, hours, ...(typeof billable === 'boolean' ? { billable } : {}) } })
    return res?.data
  },
  async setRowBillable(weekStart, taskId, billable) {
    const res = await strapiClient.put('/timesheets/row', { data: { weekStart, taskId, billable } })
    return res?.data
  },
  async submit(weekStart) {
    const res = await strapiClient.post('/timesheets/submit', { data: { weekStart } })
    return res?.data
  },
  async approvals(status = 'submitted') {
    const res = await strapiClient.get('/timesheets/approvals', { status })
    return Array.isArray(res?.data) ? res.data : []
  },
  async approve(id) {
    return (await strapiClient.post(`/timesheets/${id}/approve`, {}))?.data
  },
  async reject(id, note) {
    return (await strapiClient.post(`/timesheets/${id}/reject`, { data: { note } }))?.data
  },
  /** groupBy: person | project | client; status: approved (default) | all */
  async report({ from, to, groupBy = 'person', status = 'approved', userId }) {
    const res = await strapiClient.get('/timesheets/report', { from, to, groupBy, status, ...(userId ? { userId } : {}) })
    return { data: res?.data, meta: res?.meta || {} }
  },
  async entries({ from, to, status = 'approved', userId }) {
    const res = await strapiClient.get('/timesheets/entries', { from, to, status, ...(userId ? { userId } : {}) })
    return Array.isArray(res?.data) ? res.data : []
  },
}

export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function addDays(dayStr, n) {
  const [y, m, d] = dayStr.split('-').map(Number)
  return ymd(new Date(y, m - 1, d + n))
}

export function downloadCsv(filename, rows, columns) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => esc(c.label)).join(',')]
  for (const r of rows) lines.push(columns.map((c) => esc(c.get ? c.get(r) : r[c.key])).join(','))
  const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default timesheetService
