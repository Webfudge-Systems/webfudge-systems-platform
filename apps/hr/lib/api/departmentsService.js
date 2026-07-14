import strapiClient from '../strapiClient'

function normalizeList(response) {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

function readField(row, key) {
  if (row == null) return undefined
  if (row[key] !== undefined) return row[key]
  if (row?.attributes && row.attributes[key] !== undefined) return row.attributes[key]
  return undefined
}

/** Same org-scoped `/departments` API used by Accounts → Departments. */
export async function listDepartments() {
  const response = await strapiClient.get('/departments', {
    'pagination[pageSize]': 100,
    sort: 'name:asc',
  })
  return normalizeList(response)
}

export async function listDepartmentCatalog() {
  const rows = await listDepartments()
  const catalog = rows
    .map((d) => ({
      id: readField(d, 'id') ?? d.id,
      name: String(readField(d, 'name') || '').trim(),
      isActive: readField(d, 'isActive') !== false,
    }))
    .filter((d) => d.isActive && d.name)

  const seen = new Set()
  return catalog.filter((row) => {
    const key = row.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
