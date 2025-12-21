// prefer VITE_API_URL. In dev use relative paths so Vite proxy can forward to backend and avoid CORS.
const BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:5291')

export async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const token = localStorage.getItem('ct_token')
  const headers = new Headers(options.headers || {})

  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    options.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res
  try {
    // debug: log outgoing request info to help diagnose network/CORS issues
    try { console.debug('apiFetch ->', url, { ...options, headers: Object.fromEntries(headers.entries()) }) } catch(e){}
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new Error(`Network error when fetching ${url}: ${err.message || 'failed to fetch'}`)
  }

  if (res.status === 401) {
    try { clearToken() } catch {}
    try { window.dispatchEvent(new CustomEvent('auth:unauthorized')) } catch {}
    const text401 = await res.text().catch(() => '')
    const e401 = new Error(text401 || res.statusText || 'Unauthorized')
    e401.status = 401
    throw e401
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(text || res.statusText || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return res.json()
  return res.text()
}

// Similar to apiFetch but returns both parsed data and the response headers
export async function apiFetchWithMeta(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? '' : '/'}${path}`
  const token = localStorage.getItem('ct_token')
  const headers = new Headers(options.headers || {})

  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    options.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  if (token) headers.set('Authorization', `Bearer ${token}`)

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch (err) {
    throw new Error(`Network error when fetching ${url}: ${err.message || 'failed to fetch'}`)
  }

  if (res.status === 401) {
    try { clearToken() } catch {}
    try { window.dispatchEvent(new CustomEvent('auth:unauthorized')) } catch {}
    const text401 = await res.text().catch(() => '')
    const e401 = new Error(text401 || res.statusText || 'Unauthorized')
    e401.status = 401
    throw e401
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const err = new Error(text || res.statusText || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  const contentType = res.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await res.json() : await res.text()
  return { data, headers: res.headers }
}

export function saveToken(token) {
  if (token) localStorage.setItem('ct_token', token)
}

export function clearToken() {
  localStorage.removeItem('ct_token')
}
