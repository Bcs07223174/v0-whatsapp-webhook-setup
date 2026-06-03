'use client'

import { useEffect, useRef, useState } from 'react'
import { ref, onValue, update, limitToLast, query, orderByChild } from 'firebase/database'
import { AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react'

import { database } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
  text: string
  receivedAt: string
  status: string
  direction: 'inbound' | 'outbound'
}

export function AppointmentsDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({})
  const [recentMessages, setRecentMessages] = useState<WhatsappMessage[]>([])
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [whatsAppConfigured, setWhatsAppConfigured] = useState(true)
  const autoSentAppointments = useRef(new Set<string>())

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

  const shouldAutoSendAppointment = (appointment: Appointment) => {
    if (!appointment.appointmentId) {
      return false
    }

    if (appointment.whatsappStatus === 'sent') {
      return false
    }

    if (appointment.whatsappStatus === 'failed' && autoSentAppointments.current.has(appointment.appointmentId)) {
      return false
    }

    return true
  }

  const updatePhoneNumber = async (appointment: Appointment, phone: string) => {
    const appointmentId = appointment.appointmentId
    const sanitizedPhone = phone.replace(/[^0-9+]/g, '')
    const appointmentRef = ref(database, `appointments/${appointmentId}`)
    await update(appointmentRef, {
      patientPhone: sanitizedPhone,
    })

    setPhoneNumbers((prev) => ({
      ...prev,
      [appointmentId]: '',
    }))

    setMessage(`Phone number updated for ${appointmentId}`)

    if (!whatsAppConfigured || !shouldAutoSendAppointment(appointment)) {
      return
    }

    autoSentAppointments.current.add(appointmentId)

    await sendWhatsAppMessage({
      ...appointment,
      patientPhone: sanitizedPhone,
    })
  }

  const getPhoneInputValue = (appointment: Appointment) => {
    return toTrimmedString(phoneNumbers[appointment.appointmentId]) || toTrimmedString(appointment.patientPhone)
  }

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
    const phoneInput = toTrimmedString(phoneNumbers[appointment.appointmentId])
    const savedPhone = toTrimmedString(appointment.patientPhone)
    return phoneInput || savedPhone
  }

  return (
    <div className="w-full space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Appointments & WhatsApp</h1>
        <p className="text-gray-600">
          Manage appointments and send automatic WhatsApp reminders to patients
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Recent WhatsApp Messages</h2>
          <p className="text-sm text-gray-600">
            Inbound messages received by the webhook are stored here.
          </p>
        </div>

        {recentMessages.length === 0 ? (
          <p className="text-sm text-gray-500">No webhook messages received yet.</p>
        ) : (
          <div className="grid gap-3">
            {recentMessages.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">From {item.from}</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {item.direction}
                  </p>
                </div>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{item.text}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {new Date(item.receivedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No appointments found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => (
            <Card key={apt.appointmentId} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Patient Name</p>
                    <p className="font-semibold text-lg">{apt.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Doctor</p>
                    <p className="font-medium">{apt.doctorName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {apt.appointmentDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">{apt.appointmentTime}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      Patient Phone Number
                    </label>
                    <p className="mb-1 text-xs text-gray-500">
                      Use a valid Pakistan number like 03xxxxxxxxx, 92xxxxxxxxxx, or 3xxxxxxxxx.
                    </p>
                    {getResolvedPhone(apt) ? null : (
                      <p className="mb-1 text-xs text-red-600">
                        Phone number is required before sending.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Input
                        placeholder="03xxxxxxxxx"
                        value={getPhoneInputValue(apt)}
                        aria-invalid={!getResolvedPhone(apt)}
                        onChange={(e) =>
                          setPhoneNumbers((prev) => ({
                            ...prev,
                            [apt.appointmentId]: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                      {toTrimmedString(phoneNumbers[apt.appointmentId]) && (
                        <Button
                          onClick={() => updatePhoneNumber(apt, phoneNumbers[apt.appointmentId])}
                          size="sm"
                          variant="outline"
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </div>

                  {(apt.whatsappStatus || apt.messageStatus) === 'sent' ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">
                        Sent on {new Date((apt.whatsappSentAt || apt.lastMessageTime)!).toLocaleString()}
                      </span>
                    </div>
                  ) : (apt.whatsappStatus || apt.messageStatus) === 'failed' ? (
                    <div className="flex items-center gap-2 text-red-700 bg-red-50 p-2 rounded">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{apt.whatsappError || 'Failed to send'}</span>
                    </div>
                  ) : null}

                  <Button
                    onClick={() => sendWhatsAppMessage(apt)}
                    disabled={sendingId === apt.appointmentId || !whatsAppConfigured}
                    className="w-full"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendingId === apt.appointmentId ? 'Sending...' : 'Send WhatsApp'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
