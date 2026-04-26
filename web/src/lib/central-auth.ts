import { jwtVerify, SignJWT } from 'jose'

const LOGIN_STATE_COOKIE = 'sizzle_auth_state'
const APP_SESSION_COOKIE = 'sizzle_app_session'
const STATE_TTL_SECONDS = 10 * 60
const APP_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60

export type SizzleSession = {
  user: {
    id: string
    email?: string
    name?: string
    image?: string
  }
}

type SsoConfig = {
  baseUrl: string
  source: string
  redirectUri: string
  exchangeSecret?: string
}

function readRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function readOptionalEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }
  return undefined
}

function getSsoConfig(): SsoConfig {
  return {
    baseUrl: readRequiredEnv('ALDER_SSO_BASE_URL'),
    source: process.env.ALDER_SSO_SOURCE ?? 'sizzle',
    redirectUri: readRequiredEnv('ALDER_SSO_REDIRECT_URI'),
    exchangeSecret: readOptionalEnv(
      'ALDER_SSO_EXCHANGE_SECRET',
      'SSO_EXCHANGE_SHARED_SECRET',
    ),
  }
}

function getSigningSecret() {
  return (
    readOptionalEnv('ALDER_SSO_SIGNING_SECRET', 'SSO_SIGNING_SECRET') ??
    readRequiredEnv('ALDER_SSO_SIGNING_SECRET')
  )
}

function encodingKey(secret: string) {
  return new TextEncoder().encode(secret)
}

function buildStateCookie(state: string) {
  return `${LOGIN_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_TTL_SECONDS}`
}

function clearStateCookie() {
  return `${LOGIN_STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

function buildAppSessionCookie(token: string) {
  return `${APP_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${APP_SESSION_TTL_SECONDS}`
}

function clearAppSessionCookie() {
  return `${APP_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=')
    if (rawName === name) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return null
}

function createState() {
  return crypto.randomUUID()
}

function buildLoginUrl(state: string) {
  const config = getSsoConfig()
  const url = new URL('/api/sso/authorize', config.baseUrl)
  url.searchParams.set('source', config.source)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('state', state)
  return url.toString()
}

async function verifyInboundToken(token: string) {
  const config = getSsoConfig()
  const verified = await jwtVerify(token, encodingKey(getSigningSecret()), {
    algorithms: ['HS256'],
    issuer: 'alder.so',
    audience: config.source,
  })
  return verified.payload
}

async function issueAppSession(payload: {
  sub: string
  email?: string
  name?: string
  image?: string
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('sizzle.alder.so')
    .setAudience('sizzle')
    .setIssuedAt()
    .setExpirationTime(`${APP_SESSION_TTL_SECONDS}s`)
    .sign(encodingKey(getSigningSecret()))
}

async function exchangeCodeForToken(input: {
  code: string
  state: string
  source: string
}) {
  const config = getSsoConfig()
  const response = await fetch(new URL('/api/sso/exchange', config.baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(config.exchangeSecret
        ? { 'x-sso-secret': config.exchangeSecret }
        : {}),
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('SSO exchange failed')
  }

  const json = (await response.json()) as { token?: string }
  if (!json.token) {
    throw new Error('SSO exchange response missing token')
  }
  return json.token
}

async function upsertLocalSizzleUser(user: SizzleSession['user']) {
  // Placeholder for app profile persistence keyed by central user ID.
  // Keep this centralized so adding Convex persistence is a narrow follow-up.
  return user
}

export function createLoginRedirectResponse() {
  const state = createState()
  return new Response(null, {
    status: 302,
    headers: {
      location: buildLoginUrl(state),
      'set-cookie': buildStateCookie(state),
    },
  })
}

export async function handleAuthCallback(request: Request) {
  const config = getSsoConfig()
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const source = url.searchParams.get('source')

  if (!code || !state || !source) {
    console.warn('SSO callback rejected: missing callback fields')
    return new Response('Invalid callback request', {
      status: 400,
      headers: { 'set-cookie': clearStateCookie() },
    })
  }

  if (source !== config.source) {
    console.warn('SSO callback rejected: invalid source')
    return new Response('Invalid source', {
      status: 400,
      headers: { 'set-cookie': clearStateCookie() },
    })
  }

  const stateFromCookie = readCookieValue(
    request.headers.get('cookie'),
    LOGIN_STATE_COOKIE,
  )
  if (!stateFromCookie || stateFromCookie !== state) {
    console.warn('SSO callback rejected: invalid state')
    return new Response('Invalid auth state', {
      status: 400,
      headers: { 'set-cookie': clearStateCookie() },
    })
  }

  try {
    const inboundToken = await exchangeCodeForToken({ code, state, source })
    const payload = await verifyInboundToken(inboundToken)

    if (!payload.sub) {
      console.warn('SSO callback rejected: token missing sub')
      return new Response('Invalid token payload', {
        status: 401,
        headers: { 'set-cookie': clearStateCookie() },
      })
    }

    const user = {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      image: typeof payload.picture === 'string' ? payload.picture : undefined,
    }
    await upsertLocalSizzleUser(user)

    const appSessionToken = await issueAppSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    })

    const headers = new Headers({ location: '/' })
    headers.append('set-cookie', clearStateCookie())
    headers.append('set-cookie', buildAppSessionCookie(appSessionToken))
    return new Response(null, { status: 302, headers })
  } catch {
    console.warn('SSO callback rejected: exchange or verification failure')
    return new Response('Authentication failed', {
      status: 401,
      headers: { 'set-cookie': clearStateCookie() },
    })
  }
}

export async function getSizzleSession(request: Request): Promise<SizzleSession | null> {
  const token = readCookieValue(request.headers.get('cookie'), APP_SESSION_COOKIE)
  if (!token) return null

  try {
    const verified = await jwtVerify(token, encodingKey(getSigningSecret()), {
      algorithms: ['HS256'],
      issuer: 'sizzle.alder.so',
      audience: 'sizzle',
    })

    if (!verified.payload.sub) return null

    return {
      user: {
        id: verified.payload.sub,
        email:
          typeof verified.payload.email === 'string'
            ? verified.payload.email
            : undefined,
        name:
          typeof verified.payload.name === 'string'
            ? verified.payload.name
            : undefined,
        image:
          typeof verified.payload.image === 'string'
            ? verified.payload.image
            : undefined,
      },
    }
  } catch {
    return null
  }
}

export function createLogoutResponse() {
  return new Response(null, {
    status: 302,
    headers: {
      location: '/',
      'set-cookie': clearAppSessionCookie(),
    },
  })
}

