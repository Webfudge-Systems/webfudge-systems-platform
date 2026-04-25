/**
 * Normalize Strapi / API user shapes (flat or { attributes }) for UI.
 * @param {object|null|undefined} user
 * @returns {object|null}
 */
export function flattenUser(user) {
  if (!user || typeof user !== 'object') return null
  if (user.attributes && typeof user.attributes === 'object') {
    return { ...user, ...user.attributes }
  }
  return user
}

function looksLikeEmail(str) {
  if (typeof str !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim())
}

/** Strapi / REST may use camelCase or snake_case; merge with flattened `attributes`. */
function pickFirstName(u) {
  if (!u) return ''
  const v = u.firstName ?? u.first_name ?? u.given_name
  return v != null ? String(v).trim() : ''
}

function pickLastName(u) {
  if (!u) return ''
  const v = u.lastName ?? u.last_name ?? u.family_name
  return v != null ? String(v).trim() : ''
}

/**
 * Greeting / welcome line: DB firstName + lastName only, then a plain full name.
 * Never uses email, username-as-email, or Strapi "name" when it equals an email.
 * @param {object|null|undefined} user
 * @returns {string}
 */
export function resolveUserGreetingName(user) {
  const u = flattenUser(user)
  if (!u) return 'User'
  const fn = pickFirstName(u)
  const ln = pickLastName(u)
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')

  const name = u.name != null ? String(u.name).trim() : ''
  if (name && !looksLikeEmail(name)) return name

  const username = u.username != null ? String(u.username).trim() : ''
  if (username && !looksLikeEmail(username)) return username

  return 'User'
}

/**
 * Display name: prefer DB first + last name, then name, username, email local part.
 * @param {object|null|undefined} user
 * @returns {string}
 */
export function resolveUserDisplayName(user) {
  const u = flattenUser(user)
  if (!u) return 'User'
  const fn = pickFirstName(u)
  const ln = pickLastName(u)
  if (fn || ln) return [fn, ln].filter(Boolean).join(' ')
  const name = u.name != null ? String(u.name).trim() : ''
  if (name && !looksLikeEmail(name)) return name
  const username = u.username != null ? String(u.username).trim() : ''
  if (username && !looksLikeEmail(username)) return username
  if (u.email) return u.email.split('@')[0]
  return 'User'
}

/**
 * Initials from first/last name when present; otherwise from email local part.
 * @param {object|null|undefined} user
 * @returns {string}
 */
export function resolveUserInitials(user) {
  const u = flattenUser(user)
  if (!u) return 'U'
  const fn = pickFirstName(u)
  const ln = pickLastName(u)
  if (fn && ln) return (fn.charAt(0) + ln.charAt(0)).toUpperCase()
  if (fn.length >= 2) return fn.slice(0, 2).toUpperCase()
  if (fn.length === 1 && ln) return (fn.charAt(0) + ln.charAt(0)).toUpperCase()
  if (u.email) {
    const local = u.email.split('@')[0] || ''
    if (local.length >= 2) return local.slice(0, 2).toUpperCase()
    return u.email.charAt(0).toUpperCase()
  }
  return 'U'
}

/**
 * Role label for UI (primaryRole, userRoles, or plugin role relation).
 * @param {object|null|undefined} user
 * @returns {string}
 */
export function resolveUserRole(user) {
  const userData = flattenUser(user)
  if (!userData) return 'User'

  if (userData.primaryRole) {
    const roleName =
      typeof userData.primaryRole === 'object'
        ? userData.primaryRole.name ||
          userData.primaryRole.attributes?.name ||
          userData.primaryRole.data?.attributes?.name ||
          userData.primaryRole.data?.name
        : userData.primaryRole
    if (roleName) return roleName
  }

  if (userData.userRoles && Array.isArray(userData.userRoles) && userData.userRoles.length > 0) {
    const firstRole = userData.userRoles[0]
    const roleName =
      typeof firstRole === 'object'
        ? firstRole.name ||
          firstRole.attributes?.name ||
          firstRole.data?.attributes?.name ||
          firstRole.data?.name
        : firstRole
    if (roleName) return roleName
  }

  if (userData.role) {
    const roleName =
      typeof userData.role === 'object'
        ? userData.role.name ||
          userData.role.attributes?.name ||
          userData.role.data?.attributes?.name ||
          userData.role.data?.name ||
          userData.role
        : userData.role
    if (roleName) {
      return roleName
    }
  }

  return 'User'
}
