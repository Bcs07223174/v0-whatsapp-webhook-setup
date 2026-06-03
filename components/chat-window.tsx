'use client'

import { useState, useEffect, useRef } from 'react'
import { Conversation } from './chat-interface'
import { MessageInput } from './message-input'
import { MessageBubble } from './message-bubble'
import { formatPhoneForDisplay } from '@/lib/whatsapp-utils'

export interface Message {
  id: string
  senderType: 'agent' | 'system'
  senderName: string
  content: string
  timestamp: number
  status: 'sent' | 'delivered' | 'read'
}

interface ChatWindowProps {
  conversation: Conversation
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
  }, [conversation.id])

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    try {
      setLoading(true)
      // Load messages from Firebase (placeholder)
      setMessages([])
    } catch (error) {
      console.error('[v0] Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (content: string) => {
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          content,
          senderType: 'agent',
          senderName: 'Support Agent',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Message will be loaded via Firebase listener in real implementation
      await loadMessages()
    } catch (error) {
      console.error('[v0] Failed to send message:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{conversation.patientName}</h2>
            <p className="text-sm text-gray-600">{formatPhoneForDisplay(conversation.patientPhone)}</p>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">👋</div>
              <p>Start a conversation with {conversation.patientName}</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <MessageInput onSend={handleSendMessage} />
      </div>
    </div>
  )
}
