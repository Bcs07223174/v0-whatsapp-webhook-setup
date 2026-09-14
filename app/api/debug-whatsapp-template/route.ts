import { NextRequest, NextResponse } from 'next/server'
import { getWhatsAppGraphVersion } from '@/lib/whatsapp-template'

function readEnvValue(name: string) {
  return process.env[name]?.trim()
}

function extractMetaError(data: any) {
  if (!data || typeof data !== 'object') return { message: String(data) }

  return {
    message: data?.error?.error_user_msg || data?.error?.message || 'Unknown Meta error',
    code: data?.error?.code,
    error_subcode: data?.error?.error_subcode,
    error_data: data?.error?.error_data,
    fbtrace_id: data?.error?.fbtrace_id,
  }
}

export async function POST(request: NextRequest) {
  // Hardcoded payload as requested
  const payload = {
    messaging_product: 'whatsapp',
    to: '923267564405',
    type: 'template',
    template: {
      name: 'appointment',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'John' },
            { type: 'text', text: 'Fashion Styles' },
            { type: 'text', text: 'December 31, 2025' },
            { type: 'text', text: '1:00 PM' },
          ],
        },
      ],
    },
  }

  try {
    const phoneNumberId = readEnvValue('WHATSAPP_PHONE_NUMBER_ID')
    const accessToken = readEnvValue('WHATSAPP_ACCESS_TOKEN')

    if (!phoneNumberId) {
      return NextResponse.json({ success: false, error: 'Missing WHATSAPP_PHONE_NUMBER_ID' }, { status: 500 })
    }

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Missing WHATSAPP_ACCESS_TOKEN' }, { status: 500 })
    }

    const endpoint = `https://graph.facebook.com/${getWhatsAppGraphVersion()}/${phoneNumberId}/messages`

    // Log selected template config placeholder (no config lookup here)
    console.log('[WHATSAPP_TEMPLATE_SELECTED]', { name: 'appointment', language: 'en_US' })

    // Log exact final payload (do not log tokens)
    console.log('[WHATSAPP_FINAL_PAYLOAD]', JSON.stringify(payload, null, 2))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()
    let data = null

    try {
      data = text ? JSON.parse(text) : null
    } catch (e) {
      data = text
    }

    if (!response.ok) {
      const metaError = extractMetaError(data)

      console.error('[DEBUG WHATSAPP TEMPLATE] Meta API failed', {
        status: response.status,
        metaErrorMessage: metaError.message,
        metaErrorCode: metaError.code,
        metaErrorSubcode: metaError.error_subcode,
        metaErrorData: metaError.error_data,
        fbtraceId: metaError.fbtrace_id,
      })

      return NextResponse.json({ success: false, metaError }, { status: response.status })
    }

    return NextResponse.json({ success: true, metaResponse: data }, { status: 200 })
  } catch (error) {
    console.error('[DEBUG WHATSAPP TEMPLATE] Unexpected error', error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
