'use client'

import { useEffect, useMemo, useState } from 'react'
import { ref, onValue, limitToLast, query, orderByChild } from 'firebase/database'
import {
  Archive,
  BellOff,
  Check,
  CheckCheck,
  CircleHelp,
  FileText,
  Filter,
  Menu,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Smile,
  Star,
  Video,
  X,
} from 'lucide-react'

import { database } from '@/lib/firebase'

interface Appointment {
  appointmentId: string
  patientName: string
  patientId: string
  patientPhone?: string
  businessName?: string
  clinicName?: string
  serviceName?: string
  reason?: string
  appointmentDate: string
  appointmentTime: string
  doctorName: string
  status: string
  messageStatus?: 'pending' | 'sent' | 'failed'
  lastMessageTime?: string
  whatsappStatus?: 'sent' | 'failed'
  whatsappMessageId?: string
  whatsappSentAt?: string
  whatsappError?: string
}

interface WhatsappMessage {
  id: string
  from: string
  to?: string
  text: string
  receivedAt: string
  status: string
  direction: 'inbound' | 'outbound'
}

interface LocalSentMessage {
  appointmentId: string
  text: string
  sentAt: string
}

interface Conversation {
  id: string
  name: string
  phone: string
  preview: string
  time: string
  unread: number
  color: string
  appointment?: Appointment
}

const demoConversations: Conversation[] = [
  { id: 'sarah', name: 'Sarah Khan', phone: '+92 300 1234567', preview: 'Your appointment is confirmed for tomorrow.', time: '10:42 AM', unread: 2, color: '#e8b4b8' },
  { id: 'usman', name: 'Usman Raza', phone: '+92 301 8843021', preview: 'Thank you, see you then!', time: '9:18 AM', unread: 0, color: '#c8b8e8' },
  { id: 'ayesha', name: 'Ayesha Malik', phone: '+92 333 7654012', preview: 'Can I reschedule my visit?', time: 'Yesterday', unread: 1, color: '#f0c98f' },
  { id: 'hamza', name: 'Hamza Ahmed', phone: '+92 312 4589011', preview: 'Appointment reminder sent', time: 'Yesterday', unread: 0, color: '#a8d4c4' },
]

const avatarColors = ['#d9b6c0', '#b6c9df', '#e5c590', '#a9d4c4', '#c6b7d9']

export function AppointmentsDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [recentMessages, setRecentMessages] = useState<WhatsappMessage[]>([])
  const [localSentMessages, setLocalSentMessages] = useState<LocalSentMessage[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [whatsAppConfigured, setWhatsAppConfigured] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [showDetails, setShowDetails] = useState(true)
  const [mobileListOpen, setMobileListOpen] = useState(true)

  useEffect(() => {
    const appointmentsRef = ref(database, 'appointments')
    const unsubscribe = onValue(appointmentsRef, (snapshot) => {
      const data = snapshot.val()

      if (!data) {
        setAppointments([])
        return
      }

      const appointmentsList = Object.entries(data).map(([key, value]: any) => ({
        appointmentId: key,
        ...value,
      }))

      setAppointments(appointmentsList)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const messagesRef = query(
      ref(database, 'whatsappMessages'),
      orderByChild('receivedAt'),
      limitToLast(10)
    )

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val()

      if (!data) {
        setRecentMessages([])
        return
      }

      const messagesList = Object.entries(data).map(([id, value]: any) => ({
        id,
        ...value,
      }))

      setRecentMessages(messagesList.reverse())
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const loadWhatsAppConfig = async () => {
      try {
        const response = await fetch('/api/whatsapp-config')
        if (!response.ok) {
          return
        }

        const data = await response.json()
        setWhatsAppConfigured(Boolean(data.configured))

        if (!data.configured) {
          setMessage(
            'WhatsApp is not configured yet. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to environment variables.'
          )
        }
      } catch (error) {
        console.error('[v0] Failed to load WhatsApp config:', error)
      }
    }

    loadWhatsAppConfig()
  }, [])

  const sendWhatsAppMessage = async (appointment: Appointment) => {
    if (!whatsAppConfigured) {
      setMessage(
        'WhatsApp credentials are missing. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID first.'
      )
      return
    }

    setSendingId(appointment.appointmentId)

    try {
      const phoneToSend = getResolvedPhone(appointment)

      if (!phoneToSend) {
        setMessage('Please add a phone number first')
        return
      }

      const clinicName = appointment.clinicName || appointment.businessName || appointment.doctorName

      const response = await fetch('/api/whatsapp/send-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: appointment.appointmentId,
          patientPhone: phoneToSend,
          patientName: appointment.patientName,
          clinicName,
          businessName: appointment.businessName,
          doctorName: appointment.doctorName,
          serviceName: appointment.serviceName,
          reason: appointment.reason,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const deliveredPhone = data.phone || phoneToSend

        setLocalSentMessages((current) => [
          ...current,
          {
            appointmentId: appointment.appointmentId,
            text: 'Your appointment is confirmed. See you soon!',
            sentAt: new Date().toISOString(),
          },
        ])

        setMessage(
          `WhatsApp appointment template accepted for ${appointment.patientName} at ${deliveredPhone}.`
        )
      } else {
        const errorDetail =
          data?.details?.metaErrorMessage ||
          data?.details?.error?.message ||
          data?.details?.error?.error_user_msg ||
          data?.details?.error?.error_data?.details ||
          data?.error ||
          'Unknown WhatsApp error'

        setMessage(`Failed to send message: ${errorDetail}`)
      }
    } catch (error) {
      console.error('[v0] Send message error:', error)
      setMessage('Error sending message')
    } finally {
      setSendingId(null)
    }
  }

  const toTrimmedString = (value: unknown) => {
    if (typeof value === 'string') {
      return value.trim()
    }

    if (value == null) {
      return ''
    }

    return String(value).trim()
  }

  const getResolvedPhone = (appointment: Appointment) => {
    const savedPhone = toTrimmedString(appointment.patientPhone)
    return savedPhone
  }

  const conversations = useMemo<Conversation[]>(() => {
    if (appointments.length === 0) return demoConversations
    return appointments.map((appointment, index) => ({
      id: appointment.appointmentId,
      name: appointment.patientName || 'Unknown patient',
      phone: appointment.patientPhone || 'Phone not added',
      preview: appointment.whatsappStatus === 'sent' ? 'Appointment reminder sent' : 'Appointment ready to send',
      time: appointment.appointmentTime || 'Today',
      unread: appointment.whatsappStatus === 'sent' ? 0 : 1,
      color: avatarColors[index % avatarColors.length],
      appointment,
    }))
  }, [appointments])

  useEffect(() => {
    if (!selectedId && conversations[0]) setSelectedId(conversations[0].id)
    if (selectedId && !conversations.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations[0]?.id || '')
    }
  }, [conversations, selectedId])

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) || conversations[0]
  const selectedAppointment = selectedConversation?.appointment
  const selectedIncomingMessages = recentMessages.filter((recentMessage) => {
    if (!selectedAppointment?.patientPhone) return false

    const messagePhone = recentMessage.from.replace(/\D/g, '').replace(/^0/, '92')
    const appointmentPhone = selectedAppointment.patientPhone.replace(/\D/g, '').replace(/^0/, '92')
    return messagePhone === appointmentPhone
  })
  const latestIncomingMessage = selectedIncomingMessages.find((recentMessage) => recentMessage.direction === 'inbound')
  const isWithinCustomerWindow = latestIncomingMessage
    ? Date.now() - new Date(latestIncomingMessage.receivedAt).getTime() < 24 * 60 * 60 * 1000
    : false
  const selectedOutgoingMessages = recentMessages.filter((recentMessage) => {
    if (!selectedAppointment?.patientPhone || recentMessage.direction !== 'outbound') return false

    const messagePhone = (recentMessage.to || '').replace(/\D/g, '').replace(/^0/, '92')
    const appointmentPhone = selectedAppointment.patientPhone.replace(/\D/g, '').replace(/^0/, '92')
    return messagePhone === appointmentPhone
  })
  const selectedSentMessages = localSentMessages.filter(
    (sentMessage) => sentMessage.appointmentId === selectedAppointment?.appointmentId,
  )
  const filteredConversations = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.phone}`.toLowerCase().includes(search.toLowerCase()),
  )

  const handleSend = async () => {
    const text = draft.trim()
    const phone = selectedAppointment?.patientPhone?.trim()

    if (!text || !phone) return
    if (!isWithinCustomerWindow) {
      setMessage('Free-form messages are available for 24 hours after the customer’s latest message. Send an approved template instead.')
      return
    }

    try {
      const response = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, text }),
      })
      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || 'Message could not be sent.')
        return
      }

      setRecentMessages((current) => [...current, {
        id: data.messageId || `local-${Date.now()}`,
        to: phone,
        from: '',
        text,
        receivedAt: data.sentAt || new Date().toISOString(),
        status: 'sent',
        direction: 'outbound',
      }])
      setDraft('')
      setMessage('Message sent.')
    } catch (error) {
      console.error('[v0] Send customer message error:', error)
      setMessage('Message could not be sent.')
    }
  }

  const initials = (name = '') => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="whatsapp-shell">
      <aside className={`chat-sidebar ${mobileListOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-topbar">
          <div className="brand-mark"><span>WA</span></div>
          <div className="sidebar-actions">
            <button className="icon-button" aria-label="Status"><CircleHelp size={20} /></button>
            <button className="icon-button" aria-label="New chat"><FileText size={20} /></button>
            <button className="icon-button" aria-label="More options"><MoreVertical size={20} /></button>
          </div>
        </div>
        <div className="inbox-title-row"><div><p className="eyebrow">Workspace</p><h1>Inbox</h1></div><span className="online-pill"><i /> Live</span></div>
        <div className="search-wrap"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search or start new chat" /><Filter size={16} /></div>
        <div className="filter-tabs"><button className="active">All <span>{conversations.length}</span></button><button>Unread</button><button>Groups</button></div>
        <div className="conversation-list">
          {filteredConversations.map((conversation) => (
            <button key={conversation.id} className={`conversation-item ${selectedConversation?.id === conversation.id ? 'selected' : ''}`} onClick={() => { setSelectedId(conversation.id); setMobileListOpen(false) }}>
              <div className="avatar" style={{ backgroundColor: conversation.color }}>{initials(conversation.name)}</div>
              <div className="conversation-copy"><div className="conversation-heading"><strong>{conversation.name}</strong><time>{conversation.time}</time></div><div className="conversation-preview"><span>{conversation.preview}</span>{conversation.unread > 0 && <b>{conversation.unread}</b>}</div></div>
            </button>
          ))}
          {filteredConversations.length === 0 && <div className="no-results">No chats found</div>}
        </div>
        <div className="sidebar-footer"><span><Archive size={16} /> Archived</span><span className="muted">{recentMessages.length} recent webhook messages</span></div>
      </aside>

      <section className={`chat-panel ${mobileListOpen ? 'mobile-hidden' : ''}`}>
        {selectedConversation ? <>
          <header className="chat-header">
            <button className="mobile-menu-button" onClick={() => setMobileListOpen(true)} aria-label="Back to conversations"><Menu size={20} /></button>
            <div className="avatar small" style={{ backgroundColor: selectedConversation.color }}>{initials(selectedConversation.name)}</div>
            <div className="chat-contact"><strong>{selectedConversation.name}</strong><span>{selectedConversation.phone} <i /> online</span></div>
            <div className="chat-header-actions"><button className="icon-button" aria-label="Search conversation"><Search size={19} /></button><button className="icon-button" aria-label="Start video call"><Video size={19} /></button><button className="icon-button" onClick={() => setShowDetails(!showDetails)} aria-label="Toggle contact details"><MoreVertical size={19} /></button></div>
          </header>
          <div className="chat-body">
            <div className="date-divider"><span>Today</span></div>
            <div className="encryption-note"><span>🔒</span> Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.</div>
            {selectedAppointment ? <>
              <div className="message-bubble incoming"><p>Hi, I&apos;d like to confirm my appointment details.</p><time>{selectedAppointment.appointmentTime || '10:30 AM'}</time></div>
              <div className="message-bubble outgoing"><div className="appointment-card"><div className="appointment-icon"><FileText size={18} /></div><div><b>Appointment reminder</b><span>{selectedAppointment.appointmentDate} at {selectedAppointment.appointmentTime}</span><small>with {selectedAppointment.doctorName}</small></div></div><time>10:32 AM <CheckCheck size={14} /></time></div>
              {selectedAppointment.whatsappStatus === 'sent' && selectedSentMessages.length === 0 && <div className="message-bubble outgoing compact">Your appointment is confirmed. See you soon!<time>10:33 AM <CheckCheck size={14} /></time></div>}
              {selectedSentMessages.map((sentMessage) => <div className="message-bubble outgoing compact" key={sentMessage.sentAt}>{sentMessage.text}<time>{new Date(sentMessage.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} <CheckCheck size={14} /></time></div>)}
              {selectedIncomingMessages.map((incomingMessage) => <div className="message-bubble incoming" key={incomingMessage.id}>{incomingMessage.text}<time>{new Date(incomingMessage.receivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>)}
              {selectedOutgoingMessages.map((outgoingMessage) => <div className="message-bubble outgoing compact" key={outgoingMessage.id}>{outgoingMessage.text}<time>{new Date(outgoingMessage.receivedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} <CheckCheck size={14} /></time></div>)}
            </> : <>
              <div className="message-bubble incoming">Hi! I&apos;d like to know more about my upcoming visit.<time>10:24 AM</time></div>
              <div className="message-bubble outgoing">Absolutely. I have your appointment details ready below.<time>10:25 AM <CheckCheck size={14} /></time></div>
              <div className="message-bubble incoming">{selectedConversation.preview}<time>{selectedConversation.time}</time></div>
            </>}
            {message && <div className="status-toast"><Check size={14} /> {message}<button onClick={() => setMessage('')} aria-label="Dismiss"><X size={14} /></button></div>}
          </div>
          <div className="composer"><button className="icon-button" aria-label="Add attachment"><Paperclip size={20} /></button><button className="icon-button" aria-label="Add emoji"><Smile size={20} /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleSend() }} placeholder="Type a message" /><button className="send-button" aria-label="Send message" onClick={handleSend}><Send size={18} /></button></div>
        </> : <div className="blank-state"><div className="brand-mark large"><span>WA</span></div><h2>WhatsApp Web</h2><p>Send and receive messages without keeping your phone online.</p></div>}
      </section>

      {selectedConversation && showDetails && <aside className="details-panel">
        <div className="details-heading"><h2>Contact info</h2><button className="icon-button" onClick={() => setShowDetails(false)} aria-label="Close contact info"><X size={19} /></button></div>
        <div className="details-profile"><div className="avatar profile" style={{ backgroundColor: selectedConversation.color }}>{initials(selectedConversation.name)}</div><h3>{selectedConversation.name}</h3><span>{selectedConversation.phone}</span></div>
        <div className="details-section"><span className="section-label">About</span><p>Available for appointment questions</p></div>
        <div className="details-section"><span className="section-label">Appointment</span>{selectedAppointment ? <><div className="detail-row"><span>Date</span><b>{selectedAppointment.appointmentDate}</b></div><div className="detail-row"><span>Time</span><b>{selectedAppointment.appointmentTime}</b></div><div className="detail-row"><span>Doctor</span><b>{selectedAppointment.doctorName}</b></div><div className="detail-row"><span>WhatsApp</span><b className={selectedAppointment.whatsappStatus === 'sent' ? 'success-text' : 'warning-text'}>{selectedAppointment.whatsappStatus === 'sent' ? 'Sent' : 'Pending'}</b></div><button className="appointment-action" onClick={() => selectedAppointment && sendWhatsAppMessage(selectedAppointment)} disabled={sendingId === selectedAppointment.appointmentId || !whatsAppConfigured}><Send size={16} /> {sendingId === selectedAppointment.appointmentId ? 'Sending...' : 'Send appointment reminder'}</button></> : <p className="muted">Demo conversation. Live details will appear when an appointment is connected.</p>}</div>
        <div className="details-section details-actions"><button><BellOff size={17} /> Mute notifications</button><button><Star size={17} /> Starred messages</button><button className="danger"><Archive size={17} /> Archive chat</button></div>
      </aside>}
    </main>
  )
}
