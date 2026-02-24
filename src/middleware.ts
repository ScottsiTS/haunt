import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip auth check for these paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next()
  }

  // In dev, skip auth entirely — use Ghost MCP bridge
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

  const hasCreds = request.cookies.has('haunt_creds')
  if (!hasCreds) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
