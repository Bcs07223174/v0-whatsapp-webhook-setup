import { database } from './firebase'
import { ref, push, set, get, query, orderByChild, limitToLast } from 'firebase/database'

export interface WhatsAppMessage {
  to: string
  phoneNumberId: string
  templateName: string
  templateLanguage: string
  templateParameters: string[]
  wamid: string
  status: 'accepted' | 'sent' | 'delivered' | 'read' | 'failed'
  createdAt: string
  updatedAt: string
  metaResponse?: any
}

/**
 * Save WhatsApp message record to Firebase
 */
export async function saveWhatsAppMessageRecord(message: WhatsAppMessage) {
  try {
    const messagesRef = ref(database, 'whatsapp_messages')
    const newMessageRef = push(messagesRef)
    
    await set(newMessageRef, {
      ...message,
      id: newMessageRef.key,
      timestamp: new Date().getTime(),
    })

    console.log('[v0] WhatsApp message saved:', newMessageRef.key)
    return newMessageRef.key
  } catch (error) {
    console.error('[v0] Error saving WhatsApp message:', error)
    throw error
  }
}

/**
 * Get all WhatsApp messages (recent first)
 */
export async function getWhatsAppMessages(limit: number = 50) {
  try {
    const messagesRef = ref(database, 'whatsapp_messages')
    const messagesQuery = query(
      messagesRef,
      orderByChild('timestamp'),
      limitToLast(limit)
    )

    const snapshot = await get(messagesQuery)
    
    if (!snapshot.exists()) {
      return []
    }

    const messages: any[] = []
    snapshot.forEach((child) => {
      messages.unshift(child.val())
    })

    return messages
  } catch (error) {
    console.error('[v0] Error fetching WhatsApp messages:', error)
    throw error
  }
}

/**
 * Get WhatsApp messages for a specific phone number
 */
export async function getWhatsAppMessagesByPhone(phoneNumber: string) {
  try {
    const messagesRef = ref(database, 'whatsapp_messages')
    const snapshot = await get(messagesRef)

    if (!snapshot.exists()) {
      return []
    }

    const messages: any[] = []
    snapshot.forEach((child) => {
      const message = child.val()
      if (message.to === phoneNumber) {
        messages.push(message)
      }
    })

    return messages.reverse()
  } catch (error) {
    console.error('[v0] Error fetching WhatsApp messages by phone:', error)
    throw error
  }
}

/**
 * Update WhatsApp message status
 */
export async function updateWhatsAppMessageStatus(messageId: string, status: string) {
  try {
    const messageRef = ref(database, `whatsapp_messages/${messageId}`)
    await set(messageRef, {
      status,
      updatedAt: new Date().toISOString(),
    }, { merge: true })

    console.log('[v0] WhatsApp message status updated:', messageId, status)
  } catch (error) {
    console.error('[v0] Error updating WhatsApp message status:', error)
    throw error
  }
}
