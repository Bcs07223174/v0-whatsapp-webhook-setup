import { NextRequest, NextResponse } from 'next/server'

const GRAPH_API = 'https://graph.facebook.com/v18.0'

function readEnvValue(name: string) {
  return process.env[name]?.trim()
}

export async function GET(request: NextRequest) {
  try {
    const messageId = request.nextUrl.searchParams.get('messageId')
    const accessToken = readEnvValue('WHATSAPP_ACCESS_TOKEN')

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId query param' }, { status: 400 })
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'WHATSAPP_ACCESS_TOKEN not configured' }, { status: 500 })
    }

    const res = await fetch(`${GRAPH_API}/${encodeURIComponent(messageId)}?fields=status&access_token=${encodeURIComponent(accessToken)}`)
    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Graph API error', details: data }, { status: res.status })
    }

    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (err) {
    console.error('[v0] Message status error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
