import { SignJWT } from 'jose'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createLogoutResponse,
  createLoginRedirectResponse,
  getSizzleSession,
  handleAuthCallback,
} from './central-auth'

const SIGNING_SECRET = 'test-signing-secret'

async function createInboundToken(options?: {
  secret?: string
  issuer?: string
  audience?: string
  exp?: string
}) {
  return new SignJWT({
    email: 'user@alder.so',
    name: 'Alder User',
    picture: 'https://example.com/avatar.png',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(options?.issuer ?? 'alder.so')
    .setAudience(options?.audience ?? 'sizzle')
    .setSubject('alder-user-123')
    .setIssuedAt()
    .setExpirationTime(options?.exp ?? '10m')
    .sign(new TextEncoder().encode(options?.secret ?? SIGNING_SECRET))
}

describe('central sso auth flow', () => {
  beforeEach(() => {
    process.env.ALDER_SSO_BASE_URL = 'https://alder.so'
    process.env.ALDER_SSO_SOURCE = 'sizzle'
    process.env.ALDER_SSO_REDIRECT_URI = 'https://sizzle.alder.so/auth/callback'
    process.env.ALDER_SSO_SIGNING_SECRET = SIGNING_SECRET
    process.env.ALDER_SSO_EXCHANGE_SECRET = 'exchange-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.SIZZLE_APP_URL
  })

  it('redirects login attempts to Alder SSO authorize', () => {
    const response = createLoginRedirectResponse()
    const location = response.headers.get('location')

    expect(response.status).toBe(302)
    expect(location).toMatch(/^https:\/\/alder\.so\/api\/sso\/authorize\?/)
    expect(location).toContain('source=sizzle')
    expect(location).toContain(
      'redirect_uri=https%3A%2F%2Fsizzle.alder.so%2Fauth%2Fcallback',
    )
    expect(location).toContain('state=')
    expect(response.headers.get('set-cookie')).toContain('sizzle_auth_state=')
  })

  it('derives redirect URI from SIZZLE_APP_URL when ALDER_SSO_REDIRECT_URI is unset', () => {
    delete process.env.ALDER_SSO_REDIRECT_URI
    process.env.SIZZLE_APP_URL = 'https://sizzle.alder.so'

    const response = createLoginRedirectResponse()
    const location = response.headers.get('location')

    expect(location).toContain(
      'redirect_uri=https%3A%2F%2Fsizzle.alder.so%2Fauth%2Fcallback',
    )
  })

  it('prefers ALDER_SSO_REDIRECT_URI over SIZZLE_APP_URL', () => {
    process.env.ALDER_SSO_REDIRECT_URI = 'https://custom.example/auth/callback'
    process.env.SIZZLE_APP_URL = 'https://sizzle.alder.so'

    const response = createLoginRedirectResponse()
    expect(response.headers.get('location')).toContain(
      'redirect_uri=https%3A%2F%2Fcustom.example%2Fauth%2Fcallback',
    )
  })

  it('successful callback exchanges token and issues local Sizzle session', async () => {
    const token = await createInboundToken()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token }), { status: 200 }),
      ),
    )

    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=ok&source=sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=ok' },
      },
    )

    const response = await handleAuthCallback(request)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/')
    expect(response.headers.get('set-cookie')).toContain('sizzle_app_session=')
  })

  it('invalid callback state is rejected', async () => {
    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=bad-state-from-url&source=sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=stored-state' },
      },
    )

    const response = await handleAuthCallback(request)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid auth state')
  })

  it('invalid callback source is rejected', async () => {
    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=ok&source=not-sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=ok' },
      },
    )

    const response = await handleAuthCallback(request)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid source')
  })

  it('rejects exchange tokens with invalid signature', async () => {
    const token = await createInboundToken({ secret: 'other-secret' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ token }), { status: 200 })),
    )

    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=ok&source=sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=ok' },
      },
    )
    const response = await handleAuthCallback(request)
    expect(response.status).toBe(401)
  })

  it('rejects exchange tokens with wrong audience', async () => {
    const token = await createInboundToken({ audience: 'another-app' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ token }), { status: 200 })),
    )

    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=ok&source=sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=ok' },
      },
    )
    const response = await handleAuthCallback(request)
    expect(response.status).toBe(401)
  })

  it('rejects exchange tokens with wrong issuer', async () => {
    const token = await createInboundToken({ issuer: 'other-issuer' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ token }), { status: 200 })),
    )

    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=ok&source=sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=ok' },
      },
    )
    const response = await handleAuthCallback(request)
    expect(response.status).toBe(401)
  })

  it('rejects expired exchange tokens', async () => {
    const token = await createInboundToken({ exp: '1s' })
    await new Promise((resolve) => setTimeout(resolve, 1200))
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ token }), { status: 200 })),
    )

    const request = new Request(
      'https://sizzle.alder.so/auth/callback?code=abc&state=ok&source=sizzle',
      {
        headers: { cookie: 'sizzle_auth_state=ok' },
      },
    )
    const response = await handleAuthCallback(request)
    expect(response.status).toBe(401)
  })

  it('logout clears session visibility in Sizzle', async () => {
    const token = await new SignJWT({
      sub: 'user-1',
      email: 'u@alder.so',
      name: 'User One',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('sizzle.alder.so')
      .setAudience('sizzle')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode(SIGNING_SECRET))

    const sessionBeforeLogout = await getSizzleSession(
      new Request('https://sizzle.alder.so/', {
        headers: { cookie: `sizzle_app_session=${encodeURIComponent(token)}` },
      }),
    )
    expect(sessionBeforeLogout?.user.id).toBe('user-1')

    const response = createLogoutResponse()
    expect(response.status).toBe(302)
    expect(response.headers.get('set-cookie')).toContain('sizzle_app_session=')
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})

