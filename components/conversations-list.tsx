'use client'

import { Conversation } from './chat-interface'
import { formatPhoneForDisplay } from '@/lib/whatsapp-utils'

interface ConversationsListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (id: string) => void
  loading: boolean
}

export function ConversationsList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationsListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full px-4 py-2 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No conversations yet
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              selected={selectedId === conversation.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conversation: Conversation
  selected: boolean
  onSelect: (id: string) => void
}

function ConversationItem({
  conversation,
  selected,
  onSelect,
}: ConversationItemProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={`w-full px-3 py-3 border-b border-gray-100 text-left transition-colors ${
        selected ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm">
          {conversation.patientName.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">
              {conversation.patientName}
            </p>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {formatTime(conversation.lastMessageTime)}
            </span>
          </div>

          <p className="text-sm text-gray-600 truncate">
            {conversation.lastMessage || 'No messages yet'}
          </p>

          {conversation.unreadCount > 0 && (
            <div className="mt-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">
                {conversation.unreadCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
