'use client'

import { useState, useEffect } from 'react'
import { ConversationsList } from './conversations-list'
import { ChatWindow } from './chat-window'
import { SentMessagesTab } from './sent-messages-tab'

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

type TabType = 'messages' | 'templates'

export function ChatInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('messages')

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
      {/* Left Sidebar - Tabs */}
      <div className="w-full sm:w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'messages'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Messages
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'templates'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sent Templates
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'messages' ? (
            <ConversationsList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
              loading={loading}
            />
          ) : (
            <SentMessagesTab />
          )}
        </div>
      </div>

      {/* Chat Window - Right Side */}
      <div className="hidden sm:flex flex-1 flex-col bg-gray-50">
        {activeTab === 'messages' ? (
          selectedConversation ? (
            <ChatWindow conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-sm">Select a message from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
