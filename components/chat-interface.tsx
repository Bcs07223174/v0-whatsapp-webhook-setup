'use client'

import { useState, useEffect } from 'react'
import { ConversationsList } from './conversations-list'
import { ChatWindow } from './chat-window'

export interface Conversation {
  id: string
  appointmentId: string
  patientId: string
  patientName: string
  patientPhone: string
  lastMessage: string
  lastMessageTime: number
  unreadCount: number
}

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      // Load conversations from Firebase (placeholder - will be replaced with real Firebase integration)
      setConversations([])
    } catch (error) {
      console.error('[v0] Failed to load conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)

  return (
    <div className="flex h-screen bg-white">
      {/* Conversations List - Left Sidebar */}
      <div className="w-full sm:w-96 border-r border-gray-200 bg-white flex flex-col">
        <ConversationsList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          loading={loading}
        />
      </div>

      {/* Chat Window - Right Side */}
      <div className="hidden sm:flex flex-1 flex-col bg-gray-50">
        {selectedConversation ? (
          <ChatWindow conversation={selectedConversation} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
