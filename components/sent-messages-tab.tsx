'use client'

import { useEffect, useState } from 'react'
import { getWhatsAppMessages } from '@/lib/whatsapp-database'
import { ChevronDown, Send, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

interface WhatsAppMessage {
  id: string
  to: string
  templateName: string
  wamid: string
  status: string
  createdAt: string
  templateParameters: string[]
}

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  accepted: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Clock },
  sent: { bg: 'bg-green-50', text: 'text-green-600', icon: CheckCircle2 },
  delivered: { bg: 'bg-green-50', text: 'text-green-600', icon: CheckCircle2 },
  read: { bg: 'bg-green-50', text: 'text-green-600', icon: CheckCircle2 },
  failed: { bg: 'bg-red-50', text: 'text-red-600', icon: AlertCircle },
}

export function SentMessagesTab() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  async function loadMessages() {
    try {
      setLoading(true)
      const data = await getWhatsAppMessages(50)
      setMessages(data)
    } catch (error) {
      console.error('[v0] Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function maskPhone(phone: string) {
    return phone.replace(/^92/, '+92').replace(/(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3')
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600"></div>
          <p className="text-sm text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Send className="mx-auto mb-2 h-12 w-12 text-gray-300" />
          <p className="text-gray-600">No sent messages yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Sent Template Messages</h3>
        <button
          onClick={loadMessages}
          className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {messages.map((message) => {
          const statusConfig = statusColors[message.status] || statusColors.sent
          const StatusIcon = statusConfig.icon
          const isExpanded = expandedId === message.id

          return (
            <div
              key={message.id}
              className="border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : message.id)}
                className="w-full px-4 py-3 flex items-start justify-between text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {maskPhone(message.to)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                      <StatusIcon className="h-3 w-3" />
                      {message.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(message.createdAt)}
                  </p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">TEMPLATE</p>
                    <p className="text-sm text-gray-900 font-mono bg-white rounded p-2">
                      {message.templateName}
                    </p>
                  </div>

                  {message.templateParameters && message.templateParameters.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">PARAMETERS</p>
                      <div className="space-y-1">
                        {message.templateParameters.map((param, idx) => (
                          <p
                            key={idx}
                            className="text-sm text-gray-700 bg-white rounded p-2 font-mono"
                          >
                            {`{{${idx + 1}}}`} {param}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">MESSAGE ID</p>
                    <p className="text-xs text-gray-500 font-mono bg-white rounded p-2 break-all">
                      {message.wamid}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
