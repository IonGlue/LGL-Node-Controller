/**
 * Auth helpers for the Node Controller SPA.
 *
 * The Logto OIDC flow runs through the Express server:
 *   /auth/login    → redirects to Logto
 *   /auth/callback → exchanges code, stores token in localStorage, redirects to SPA
 *
 * The SPA reads/stores tokens from localStorage and attaches the access token
 * as a Bearer header on every API request.
 */

const TOKEN_KEY = 'nc_token'
const REFRESH_KEY = 'nc_refresh_token'
const EXPIRES_KEY = 'nc_token_expires_at'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  const expiresAt = parseInt(localStorage.getItem(EXPIRES_KEY) ?? '0', 10)
  // Consider expired 60 s before actual expiry
  return Date.now() < expiresAt - 60_000
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(EXPIRES_KEY)
}

export function redirectToLogin(): void {
  const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
  window.location.href = `/auth/login?return_to=${returnTo}`
}

export function logout(): void {
  clearSession()
  window.location.href = `/auth/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/')}`
}
