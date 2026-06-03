import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { ref, push, update, get } from 'firebase/database'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, content, appointmentId } = await request.json()

    // Validate required fields
    if (!conversationId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const timestamp = new Date().getTime()

    // Create system message object
    const messageData = {
      senderType: 'system',
      senderName: 'System',
      content,
      timestamp,
      status: 'delivered',
      appointmentId,
    }

    // Save message to Firebase
    const messagesRef = ref(db, `messages/${conversationId}`)
    const newMessageRef = await push(messagesRef, messageData)
    const messageId = newMessageRef.key

    console.log('[v0] System message saved:', messageId)

    // Update conversation with latest message
    const conversationRef = ref(db, `conversations/${conversationId}`)
    await update(conversationRef, {
      lastMessage: content,
      lastMessageTime: timestamp,
    })

    // Send actual WhatsApp message if appointmentId provided
    if (appointmentId) {
      try {
        const appointmentRef = ref(db, `appointments/${appointmentId}`)
        const snapshot = await get(appointmentRef)
        const appointment = snapshot.val()

        if (appointment) {
          // Send WhatsApp text message (not template)
          const phone = appointment.patientPhone
          const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
          const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

          if (accessToken && phoneNumberId) {
            const response = await fetch(
              `https://graph.instagram.com/v21.0/${phoneNumberId}/messages`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: phone.replace(/[^0-9]/g, '').startsWith('0')
                    ? '92' + phone.replace(/[^0-9]/g, '').substring(1)
                    : phone.replace(/[^0-9]/g, ''),
                  type: 'text',
                  text: { body: content },
                }),
              }
            )

            if (response.ok) {
              const data = await response.json()
              console.log('[v0] WhatsApp message sent:', data.messages[0].id)
            } else {
              console.error('[v0] Failed to send WhatsApp message:', response.statusText)
            }
          }
        }
      } catch (whatsappError) {
        console.error('[v0] Error sending WhatsApp message:', whatsappError)
        // Don't fail the entire request if WhatsApp send fails
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      timestamp,
    })
  } catch (error) {
    console.error('[v0] System message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
