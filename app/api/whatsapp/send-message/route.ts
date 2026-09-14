import { NextRequest, NextResponse } from 'next/server'
import { normalizePakistanPhoneNumber } from '@/lib/whatsapp-template'

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://health-37caa-default-rtdb.firebaseio.com'

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const to = normalizePakistanPhoneNumber(body.to || body.patientPhone)
    const text = textValue(body.text || body.message)
    const accessToken = textValue(process.env.WHATSAPP_ACCESS_TOKEN)
    const phoneNumberId = textValue(process.env.WHATSAPP_PHONE_NUMBER_ID)

    if (!to || !text) {
      return NextResponse.json({ error: 'Customer phone number and message are required.' }, { status: 400 })
    }

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'WhatsApp credentials are not configured.' }, { status: 500 })
    }

    const graphVersion = textValue(process.env.WHATSAPP_GRAPH_VERSION) || 'v25.0'
    const response = await fetch(`https://graph.facebook.com/${graphVersion.startsWith('v') ? graphVersion : `v${graphVersion}`}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: true, body: text },
      }),
    })
    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message || 'WhatsApp rejected the message.', details: data }, { status: response.status })
    }

    const now = new Date().toISOString()
    const messageId = data?.messages?.[0]?.id || ''
    const savedMessage = await fetch(`${FIREBASE_DATABASE_URL}/whatsappMessages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        to,
        text,
        receivedAt: now,
        direction: 'outbound',
        status: 'sent',
      }),
    })

    if (!savedMessage.ok) {
      console.error('[WhatsApp Message] Sent through Meta but local history save failed', {
        status: savedMessage.status,
      })
    }

    return NextResponse.json({ success: true, messageId, sentAt: now }, { status: 200 })
  } catch (error) {
    console.error('[WhatsApp Message] Send route failed', error)
    return NextResponse.json({ error: 'Failed to send WhatsApp message.' }, { status: 500 })
  }
}