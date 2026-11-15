export const MOBILE_BASE_PATH = '/m'

const PREFER_DESKTOP_KEY = 'hyr.preferDesktop'

export function isMobilePath(pathname) {
  return pathname === MOBILE_BASE_PATH || pathname.startsWith(`${MOBILE_BASE_PATH}/`)
}

/** Maps desktop entry points to their mobile counterpart; other desktop pages stay on desktop. */
export function getMobileRedirectTarget(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (path === '/') return MOBILE_BASE_PATH
  if (path === '/login') return `${MOBILE_BASE_PATH}/login`

  const reservationMatch = /^\/operations\/reservation\/(\d+)$/.exec(path)
  if (reservationMatch) return `${MOBILE_BASE_PATH}/reservation/${reservationMatch[1]}`

  return null
}

/** Phones only: touch screen whose shortest side is below tablet size. */
export function isMobileDevice(win = globalThis.window) {
  if (!win?.matchMedia || !win.screen) return false
  const isTouch = win.matchMedia('(pointer: coarse)').matches
  return isTouch && Math.min(win.screen.width, win.screen.height) < 600
}

export function prefersDesktop(storage = globalThis.localStorage) {
  return storage?.getItem(PREFER_DESKTOP_KEY) === '1'
}

export function setPrefersDesktop(value, storage = globalThis.localStorage) {
  if (value) {
    storage?.setItem(PREFER_DESKTOP_KEY, '1')
  } else {
    storage?.removeItem(PREFER_DESKTOP_KEY)
  }
}
