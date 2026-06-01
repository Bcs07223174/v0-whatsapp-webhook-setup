import { NextRequest, NextResponse } from 'next/server'

const WHATSAPP_API_URL = 'https://graph.instagram.com/v18.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  try {
    const { patientPhone, patientName, appointmentDate, appointmentTime, doctorName } =
      await request.json()

    if (!patientPhone || !patientName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const phoneWithCountryCode = patientPhone.startsWith('+')
      ? patientPhone.replace(/[^0-9]/g, '')
      : patientPhone.replace(/[^0-9]/g, '')

    const message = `Hello ${patientName}! 👋

This is a reminder about your appointment:
📅 Date: ${appointmentDate}
🕐 Time: ${appointmentTime}
👨‍⚕️ Doctor: ${doctorName}

Please arrive 10 minutes early. Reply "CONFIRM" to confirm your appointment.`

    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneWithCountryCode,
          type: 'text',
          text: {
            body: message,
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[v0] WhatsApp API error:', data)
      return NextResponse.json(
        { error: 'Failed to send message', details: data },
        { status: response.status }
      )
    }

    console.log('[v0] Message sent successfully:', data.messages[0].id)
    return NextResponse.json(
      {
        success: true,
        messageId: data.messages[0].id,
        phone: phoneWithCountryCode,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Send WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
