import { NextResponse } from 'next/server'
import { getAuthCreds } from '@/lib/auth'

export async function GET(request: Request) {
  // In dev, always authenticated
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ authenticated: true })
  }
  const creds = getAuthCreds(request)
  return NextResponse.json({ authenticated: creds !== null })
}
