import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { ref, update } from 'firebase/database'
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  buildTemplatePayload,
} from '@/lib/whatsapp-utils'

const WHATSAPP_API_URL = 'https://graph.instagram.com/v21.0'
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, patientPhone, patientName, clinicName, appointmentDate, appointmentTime } =
      await request.json()

    // Validate required fields
    if (!appointmentId || !patientPhone || !patientName || !clinicName || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate WhatsApp credentials
    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      console.error('[v0] Missing WhatsApp credentials')
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured' },
        { status: 500 }
      )
    }

    // Validate phone number
    if (!isValidPhoneNumber(patientPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Build template payload
    const payload = buildTemplatePayload(patientPhone, {
      patientName,
      clinicName,
      appointmentDate,
      appointmentTime,
      appointmentId,
    })

    console.log('[v0] Sending WhatsApp template to:', normalizePhoneNumber(patientPhone))

    // Send to Meta WhatsApp API
    const response = await fetch(`${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[v0] WhatsApp API error:', data)

      // Update appointment with error status
      try {
        const appointmentRef = ref(db, `appointments/${appointmentId}`)
        await update(appointmentRef, {
          whatsappStatus: 'failed',
          whatsappError: data.error?.message || 'Unknown error',
          whatsappErrorAt: new Date().toISOString(),
        })
      } catch (dbError) {
        console.error('[v0] Failed to update appointment error status:', dbError)
      }

      return NextResponse.json(
        { error: data.error?.message || 'Failed to send WhatsApp message' },
        { status: response.status }
      )
    }

    // Success - update appointment record
    const messageId = data.messages[0].id
    console.log('[v0] WhatsApp message sent successfully:', messageId)

    try {
      const appointmentRef = ref(db, `appointments/${appointmentId}`)
      await update(appointmentRef, {
        whatsappStatus: 'sent',
        whatsappMessageId: messageId,
        whatsappSentAt: new Date().toISOString(),
        whatsappError: null,
        whatsappErrorAt: null,
      })
    } catch (dbError) {
      console.error('[v0] Failed to update appointment:', dbError)
      // Still return success to user since message was sent
    }

    return NextResponse.json({
      success: true,
      messageId,
      phone: normalizePhoneNumber(patientPhone),
    })
  } catch (error) {
    console.error('[v0] WhatsApp send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
