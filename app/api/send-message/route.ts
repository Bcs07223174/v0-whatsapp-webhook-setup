import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { ref, push, update, get } from 'firebase/database'

export async function POST(request: NextRequest) {
  try {
    const { conversationId, content, senderType, senderName } = await request.json()

    // Validate required fields
    if (!conversationId || !content || !senderType || !senderName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const timestamp = new Date().getTime()

    // Create message object
    const messageData = {
      senderType,
      senderName,
      content,
      timestamp,
      status: 'sent',
    }

    // Save message to Firebase
    const messagesRef = ref(db, `messages/${conversationId}`)
    const newMessageRef = await push(messagesRef, messageData)
    const messageId = newMessageRef.key

    console.log('[v0] Message saved:', messageId)

    // Update conversation with latest message
    const conversationRef = ref(db, `conversations/${conversationId}`)
    await update(conversationRef, {
      lastMessage: content,
      lastMessageTime: timestamp,
    })

    return NextResponse.json({
      success: true,
      messageId,
      timestamp,
    })
  } catch (error) {
    console.error('[v0] Send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
