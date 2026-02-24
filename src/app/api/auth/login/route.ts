import { NextResponse } from 'next/server'
import { tigerListServices } from '@/lib/tiger-api'
import { setAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, accessKey, secretKey } = body

    if (!projectId || !accessKey || !secretKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    const creds = { projectId, accessKey, secretKey }

    // Validate by attempting to list services
    await tigerListServices(creds)

    const response = NextResponse.json({ ok: true })
    response.headers.set('Set-Cookie', setAuthCookie(creds))
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid credentials'
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
