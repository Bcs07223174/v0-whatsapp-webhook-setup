import { NextRequest, NextResponse } from 'next/server'

import { getWhatsAppGraphVersion } from '@/lib/whatsapp-template'

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

    const res = await fetch(`https://graph.facebook.com/${getWhatsAppGraphVersion()}/${encodeURIComponent(messageId)}?fields=status`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
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
