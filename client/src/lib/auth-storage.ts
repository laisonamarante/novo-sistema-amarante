export const AUTH_PERSIST_KEY = 'amarante-auth'
export const AUTH_TOKEN_KEY = 'token'

function hasLocalStorage() {
  return typeof localStorage !== 'undefined'
}

export function setStoredAuthToken(token: string) {
  if (!hasLocalStorage()) return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function getStoredAuthToken() {
  if (!hasLocalStorage()) return ''
  return localStorage.getItem(AUTH_TOKEN_KEY) || ''
}

export function clearStoredAuth() {
  if (!hasLocalStorage()) return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_PERSIST_KEY)
}

export function syncStoredAuthToken(token: string | null | undefined) {
  if (!token) {
    clearStoredAuthToken()
    return
  }

  setStoredAuthToken(token)
}

export function clearStoredAuthToken() {
  if (!hasLocalStorage()) return
  localStorage.removeItem(AUTH_TOKEN_KEY)
}
