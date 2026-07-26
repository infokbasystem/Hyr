import { requestJson } from './apiClient'

export async function searchUsers({ searchTerm = '' } = {}) {
  const query = new URLSearchParams()

  if (typeof searchTerm === 'string' && searchTerm.trim()) {
    query.set('searchTerm', searchTerm.trim())
  }

  const data = await requestJson(`/users${query.toString() ? `?${query.toString()}` : ''}`)
  const rows = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])

  return rows.map(mapApiUser)
}

export async function getUserById(userId) {
  const data = await requestJson(`/users/${userId}`)
  return mapApiUser(data)
}

export async function createUser(body) {
  const data = await requestJson('/users', {
    method: 'POST',
    body: toUserCreateDto(body),
  })

  return mapApiUser(data)
}

export async function updateUser(userId, body) {
  const data = await requestJson(`/users/${userId}`, {
    method: 'PUT',
    body: toUserUpdateDto(body),
  })

  return mapApiUser(data)
}

export function deleteUser(userId) {
  return requestJson(`/users/${userId}`, {
    method: 'DELETE',
  })
}

export function resetOwnPassword(newPassword) {
  return requestJson('/users/me/password', {
    method: 'POST',
    body: { newPassword },
  })
}

export function resetUserPassword(userId, newPassword) {
  return requestJson(`/users/${userId}/password`, {
    method: 'POST',
    body: { newPassword },
  })
}

function mapApiUser(user) {
  return {
    id: normalizeId(user?.id ?? user?.Id),
    name: `${user?.name ?? user?.Name ?? ''}`,
    email: `${user?.email ?? user?.Email ?? ''}`,
    role: normalizeRole(user?.role ?? user?.Role),
  }
}

function toUserCreateDto(user) {
  return {
    name: `${user?.name ?? ''}`.trim(),
    email: `${user?.email ?? ''}`.trim(),
    password: `${user?.password ?? ''}`,
    role: normalizeRole(user?.role),
  }
}

function toUserUpdateDto(user) {
  return {
    name: `${user?.name ?? ''}`.trim(),
    email: `${user?.email ?? ''}`.trim(),
    role: normalizeRole(user?.role),
  }
}

function normalizeId(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function normalizeRole(value) {
  return `${value ?? 'User'}`.trim().toLowerCase() === 'admin' ? 'Admin' : 'User'
}