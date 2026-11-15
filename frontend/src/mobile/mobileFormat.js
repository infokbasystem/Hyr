const DAY_MS = 24 * 60 * 60 * 1000

const dayMonthFmt = new Intl.DateTimeFormat('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })
const longDayFmt = new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('sv-SE', { hour: '2-digit', minute: '2-digit' })

export const ITEM_STATES = {
  BOOKED: 'booked',
  OUT: 'out',
  RETURNED: 'returned',
  CHECKED_IN: 'checkedIn',
}

export const ITEM_STATE_LABELS = {
  booked: 'Bokad',
  out: 'Utlämnad',
  returned: 'Återlämnad',
  checkedIn: 'Incheckad',
}

export function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function startOfDay(value) {
  const day = new Date(value)
  day.setHours(0, 0, 0, 0)
  return day
}

export function roundToQuarterHour(value = new Date()) {
  const date = new Date(value)
  const minutes = Math.round(date.getMinutes() / 15) * 15
  date.setMinutes(minutes, 0, 0)
  return date
}

/** Local time in the format used by datetime-local inputs and the API ("YYYY-MM-DDTHH:mm"). */
export function toLocalInputValue(value) {
  const date = toDate(value)
  if (!date) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatTime(value) {
  const date = toDate(value)
  return date ? timeFmt.format(date) : ''
}

export function formatDayLabel(value, now = new Date()) {
  const date = toDate(value)
  if (!date) return ''
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS)
  if (diffDays === 0) return 'Idag'
  if (diffDays === 1) return 'Imorgon'
  if (diffDays === -1) return 'Igår'
  const label = longDayFmt.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatDateTime(value, now = new Date()) {
  const date = toDate(value)
  if (!date) return ''
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS)
  const day = Math.abs(diffDays) <= 1 ? formatDayLabel(date, now).toLowerCase() : dayMonthFmt.format(date)
  return `${day} ${timeFmt.format(date)}`
}

/** Whole calendar days a date lies before today (0 when today or in the future). */
export function daysOverdue(value, now = new Date()) {
  const date = toDate(value)
  if (!date || date >= now) return 0
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS))
}

/** Groups events by calendar day; everything before today is collected in one overdue group. */
export function groupEventsByDay(events, now = new Date()) {
  const today = startOfDay(now)
  const groups = new Map()
  const sorted = [...events].sort((a, b) => toDate(a.date) - toDate(b.date))

  for (const event of sorted) {
    const date = toDate(event.date)
    if (!date) continue
    const overdue = date < today
    const key = overdue ? 'overdue' : toLocalInputValue(startOfDay(date)).slice(0, 10)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        overdue,
        label: overdue ? 'Försenade' : formatDayLabel(date, now),
        events: [],
      })
    }
    groups.get(key).events.push(event)
  }

  return [...groups.values()]
}

export function matchesSearch(values, searchText) {
  const needle = String(searchText || '').trim().toLowerCase()
  if (!needle) return true
  return values.some((value) => String(value ?? '').toLowerCase().includes(needle))
}

export function getItemState(item) {
  if (!item?.actualFrom) return ITEM_STATES.BOOKED
  if (!item.actualTo) return ITEM_STATES.OUT
  return item.isCheckedIn ? ITEM_STATES.CHECKED_IN : ITEM_STATES.RETURNED
}

/** Mirrors the eligibility rules of POST /api/mobile/reservations/{id}/item-status. */
export function isEligibleForAction(item, action) {
  switch (action) {
    case 'deliver':
      return !item?.actualFrom
    case 'return':
      return Boolean(item?.actualFrom) && !item?.actualTo
    case 'checkin':
      return Boolean(item?.actualTo) && !item?.isCheckedIn
    default:
      return false
  }
}

const normalizeType = (item) => String(item?.itemTypeCode || '').trim().toUpperCase()
export const isVehicleRow = (item) => normalizeType(item) === 'VEHICLE'
export const isAccessoryRow = (item) => normalizeType(item) === 'ACCESSORY'

export function getItemDisplayName(item) {
  const name = String(item?.itemName || item?.itemNr || '').trim()
  const model = String(item?.model || item?.itemModelName || '').trim()
  const regNr = String(item?.regNr || '').trim()
  const manufacturer = String(item?.manufacturer || '').trim()
  return [name, model].filter(Boolean).join(', ') || regNr || manufacturer || 'Artikel'
}

/** Chip key for items without an item type (kept apart from '' which means "all types"). */
export const NO_ITEM_TYPE = '__none__'

export const getItemTypeKey = (item) => String(item?.itemTypeCode || '').trim().toUpperCase() || NO_ITEM_TYPE

export function filterAvailableItems(items, typeCode, search) {
  return items.filter((item) => (!typeCode || getItemTypeKey(item) === typeCode) && matchesSearch(
    [item.itemNr, item.regNr, item.serialNr, item.manufacturer, item.itemModelName, item.itemCategoryName, item.itemTypeName],
    search,
  ))
}

/** Groups items by category name (falling back to item type) in their API order. */
export function groupItemsByCategory(items) {
  const groups = new Map()
  for (const item of items) {
    const label = item.itemCategoryName || item.itemTypeName || 'Övrigt'
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(item)
  }
  return [...groups.entries()].map(([label, groupItems]) => ({ label, items: groupItems }))
}
