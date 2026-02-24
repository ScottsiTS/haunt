import type { TigerCreds } from './tiger-api'

const COOKIE_NAME = 'haunt_creds'

/**
 * Returns a Set-Cookie header string that stores credentials.
 */
export function setAuthCookie(creds: TigerCreds): string {
  const encoded = Buffer.from(JSON.stringify(creds)).toString('base64')
  return `${COOKIE_NAME}=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
}

/**
 * Reads credentials from the request cookie, falling back to env vars in dev.
 */
export function getAuthCreds(request: Request): TigerCreds | null {
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const match = cookieHeader.split(';').find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
    if (match) {
      try {
        const value = match.split('=')[1]!.trim()
        const decoded = JSON.parse(Buffer.from(value, 'base64').toString('utf-8'))
        if (decoded.projectId && decoded.accessKey && decoded.secretKey) {
          return decoded as TigerCreds
        }
      } catch {}
    }
  }

  // Dev fallback: use env vars so you stay "logged in" without a cookie
  const { TIGER_PROJECT_ID, TIGER_ACCESS_KEY, TIGER_SECRET_KEY } = process.env
  if (TIGER_PROJECT_ID && TIGER_ACCESS_KEY && TIGER_SECRET_KEY) {
    return { projectId: TIGER_PROJECT_ID, accessKey: TIGER_ACCESS_KEY, secretKey: TIGER_SECRET_KEY }
  }

  return null
}

/**
 * Returns a Set-Cookie header string that clears the auth cookie.
 */
export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}
