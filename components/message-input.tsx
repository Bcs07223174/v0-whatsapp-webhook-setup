'use client'

import { useState, useRef } from 'react'

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isSending) return

    try {
      setIsSending(true)
      await onSend(message)
      setMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('[v0] Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      {/* Attachment Button */}
      <button
        type="button"
        disabled={disabled || isSending}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 5.23 11.08 5 12 5c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 15.98 24 14.08 24 12c0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>
      </button>

      {/* Message Input */}
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aa"
          disabled={disabled || isSending}
          className="w-full px-4 py-3 rounded-full bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        />
      </div>

      {/* Send Button */}
      <button
        type="submit"
        disabled={!message.trim() || isSending || disabled}
        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
      >
        {isSending ? (
          <svg className="w-6 h-6 animate-spin" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.41,22.99 3.50612381,23.1 4.13399899,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13399899,1.16865956 C3.50612381,0.9115621 2.40999797,1.02298849 1.77946707,1.4942806 C0.994623095,2.16758537 0.837654326,3.25703284 1.15159189,3.99570201 L3.03521743,10.4366950 C3.03521743,10.5937924 3.34915502,10.7508998 3.50612381,10.7508998 L16.6915026,11.5364010 C16.6915026,11.5364010 17.1624089,11.5364010 17.1624089,12.0076932 C17.1624089,12.4744748 16.6915026,12.4744748 16.6915026,12.4744748 Z" />
          </svg>
        )}
      </button>
    </form>
  )
}
