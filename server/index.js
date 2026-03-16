/**
 * Node Controller — Express server
 *
 * Responsibilities:
 *  1. Serve the React SPA from /dist
 *  2. Handle Logto OIDC callback: exchange code → token → inject into SPA
 *  3. Expose /api/config so the SPA can discover auth settings
 *  4. Proxy /api/portal/* to the LGL-Ingest / orchestrate backend
 *     (forwarding the Authorization header from the browser)
 *  5. Validate Logto JWTs server-side on proxied calls via JWKS
 *
 * Environment variables:
 *   PORT               Express listen port (default 3001)
 *   ORCHESTRATE_URL    Base URL of the LGL-Ingest / orchestrate server
 *   LOGTO_ENDPOINT     Logto OIDC base (e.g. https://auth.lgl-os.com)
 *   LOGTO_APP_ID       Logto app (client) ID
 *   LOGTO_APP_SECRET   Logto app secret
 *   LOGTO_REDIRECT_URI Callback URL
 *   LOGTO_API_RESOURCE API resource identifier (aud claim)
 *   LOGTO_JWKS_URL     JWKS endpoint (default: {LOGTO_ENDPOINT}/oidc/jwks)
 *   LOGTO_ISSUER       Token issuer (default: {LOGTO_ENDPOINT}/oidc)
 *   SESSION_SECRET     Cookie signing secret
 *   CORS_ORIGIN        Allowed CORS origin
 */

import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createHmac, randomBytes } from 'crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ORCHESTRATE_URL = process.env.ORCHESTRATE_URL ?? 'http://localhost:3000'
const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT ?? 'https://auth.lgl-os.com'
const LOGTO_APP_ID = process.env.LOGTO_APP_ID ?? ''
const LOGTO_APP_SECRET = process.env.LOGTO_APP_SECRET ?? ''
const LOGTO_REDIRECT_URI = process.env.LOGTO_REDIRECT_URI ?? `http://localhost:${PORT}/auth/callback`
const LOGTO_API_RESOURCE = process.env.LOGTO_API_RESOURCE ?? 'https://api.orchestrate.lgl-os.com'
const LOGTO_JWKS_URL = process.env.LOGTO_JWKS_URL ?? `${LOGTO_ENDPOINT}/oidc/jwks`
const LOGTO_ISSUER = process.env.LOGTO_ISSUER ?? `${LOGTO_ENDPOINT}/oidc`
const SESSION_SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString('hex')

// JWKS set — lazily initialised, caches keys, auto-refreshes on rotation
let _jwks = null
function getJwks() {
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(LOGTO_JWKS_URL))
  return _jwks
}

/**
 * Validate a Logto JWT. Returns the decoded payload or throws.
 */
async function validateLogtoToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: LOGTO_ISSUER,
      audience: LOGTO_API_RESOURCE,
    })
    return payload
  } catch {
    // Invalidate cached JWKS on failure to pick up key rotations
    _jwks = null
    throw new Error('Invalid or expired token')
  }
}

const app = express()
app.use(express.json())

// ─── CORS ─────────────────────────────────────────────────────────────────────

const corsOrigin = process.env.CORS_ORIGIN
if (corsOrigin) {
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
}

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.GIT_SHA ?? 'dev' })
})

// ─── Auth config (for SPA bootstrap) ─────────────────────────────────────────

app.get('/api/config', (_req, res) => {
  res.json({
    logto_endpoint: LOGTO_ENDPOINT,
    logto_app_id: LOGTO_APP_ID,
    logto_redirect_uri: LOGTO_REDIRECT_URI,
    logto_api_resource: LOGTO_API_RESOURCE,
  })
})

// ─── Logto OIDC flow ──────────────────────────────────────────────────────────

function signState(value) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('hex')
}

function parseCookies(req) {
  const header = req.headers.cookie ?? ''
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    }),
  )
}

app.get('/auth/login', (_req, res) => {
  const state = randomBytes(16).toString('hex')
  const sig = signState(state)
  const returnTo = typeof _req.query.return_to === 'string' ? _req.query.return_to : '/'

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LOGTO_APP_ID,
    redirect_uri: LOGTO_REDIRECT_URI,
    scope: 'openid profile email offline_access',
    resource: LOGTO_API_RESOURCE,
    state: `${state}.${sig}`,
  })

  res.setHeader('Set-Cookie', `nc_return_to=${encodeURIComponent(returnTo)}; HttpOnly; Max-Age=300; SameSite=Lax; Path=/`)
  res.redirect(`${LOGTO_ENDPOINT}/oidc/auth?${params}`)
})

app.get('/auth/callback', async (req, res) => {
  const { code, state, error } = req.query

  if (error) return res.redirect(`/?auth_error=${encodeURIComponent(String(error))}`)
  if (!code) return res.status(400).send('Missing code')

  if (typeof state === 'string' && state.includes('.')) {
    const [value, sig] = state.split('.')
    if (signState(value) !== sig) return res.status(400).send('Invalid state')
  }

  let tokenRes
  try {
    tokenRes = await fetch(`${LOGTO_ENDPOINT}/oidc/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: LOGTO_REDIRECT_URI,
        client_id: LOGTO_APP_ID,
        client_secret: LOGTO_APP_SECRET,
        resource: LOGTO_API_RESOURCE,
      }),
    })
  } catch {
    return res.status(502).send('Token exchange failed')
  }

  if (!tokenRes.ok) {
    const body = await tokenRes.text()
    console.error('Token exchange error:', tokenRes.status, body)
    return res.redirect('/?auth_error=token_exchange_failed')
  }

  const tokens = await tokenRes.json()
  const cookies = parseCookies(req)
  const returnTo = decodeURIComponent(cookies.nc_return_to ?? '/')

  res.setHeader('Set-Cookie', 'nc_return_to=; HttpOnly; Max-Age=0; Path=/')

  const accessToken = tokens.access_token ?? ''
  const refreshToken = tokens.refresh_token ?? ''
  const expiresIn = tokens.expires_in ?? 3600

  // Store tokens in localStorage via a small bridging HTML page
  res.send(`<!doctype html><html><head><title>Authenticating…</title></head><body>
<script>
try {
  localStorage.setItem('nc_token', ${JSON.stringify(accessToken)});
  localStorage.setItem('nc_refresh_token', ${JSON.stringify(refreshToken)});
  localStorage.setItem('nc_token_expires_at', String(Date.now() + ${expiresIn} * 1000));
} catch(e) {}
location.replace(${JSON.stringify(returnTo)});
</script>
</body></html>`)
})

app.get('/auth/logout', (req, res) => {
  const postLogoutUri = encodeURIComponent(
    typeof req.query.post_logout_redirect_uri === 'string'
      ? req.query.post_logout_redirect_uri
      : `${req.protocol}://${req.get('host')}/`,
  )
  res.redirect(`${LOGTO_ENDPOINT}/oidc/session/end?client_id=${LOGTO_APP_ID}&post_logout_redirect_uri=${postLogoutUri}`)
})

// ─── JWT validation middleware for proxied API calls ─────────────────────────

async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const token = header.slice(7)
  try {
    const payload = await validateLogtoToken(token)
    if (!payload.organization_id) return res.status(403).json({ error: 'Forbidden' })
    req.logtoPayload = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// ─── API proxy to LGL-Ingest / orchestrate ────────────────────────────────────

app.use(
  '/api/portal',
  requireAuth,
  createProxyMiddleware({
    target: ORCHESTRATE_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward the original Authorization header so LGL-Ingest can validate it
        const auth = req.headers.authorization
        if (auth) proxyReq.setHeader('Authorization', auth)
      },
    },
  }),
)

// ─── Serve React SPA ──────────────────────────────────────────────────────────

const distDir = join(__dirname, '..', 'dist')

app.use(express.static(distDir))

app.get('*', (_req, res) => {
  res.sendFile(join(distDir, 'index.html'))
})

// ─── Start ────────────────────────────────────────────────────────────────────

const server = createServer(app)

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => process.exit(0))
})

server.listen(PORT, () => {
  console.log(`Node Controller server listening on port ${PORT}`)
})
