import { NextResponse } from 'next/server'
import { ghostSchema } from '@/lib/ghost-mcp'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const schema = await ghostSchema(id)
    return NextResponse.json({ schema })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch schema' }, { status: 500 })
  }
}
