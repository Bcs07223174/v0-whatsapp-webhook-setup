'use client'

import { useState, useEffect } from 'react'
import { database } from '@/lib/firebase'
import { ref, onValue, update } from 'firebase/database'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2, Clock, Send } from 'lucide-react'

interface Appointment {
  appointmentId: string
  patientName: string
  patientId: string
  patientPhone?: string
  appointmentDate: string
  appointmentTime: string
  doctorName: string
  status: string
  messageStatus?: 'pending' | 'sent' | 'failed'
  lastMessageTime?: string
}

export function AppointmentsDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // Load appointments from Firebase
  useEffect(() => {
    const appointmentsRef = ref(database, 'appointments')
    const unsubscribe = onValue(appointmentsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const appointmentsList = Object.entries(data).map(([key, value]: any) => ({
          appointmentId: key,
          ...value,
        }))
        setAppointments(appointmentsList)
      }
    })

    return () => unsubscribe()
  }, [])

  // Update phone number for an appointment
  const updatePhoneNumber = (appointmentId: string, phone: string) => {
    const appointmentRef = ref(database, `appointments/${appointmentId}`)
    update(appointmentRef, {
      patientPhone: phone.replace(/[^0-9+]/g, ''),
    })
    setPhoneNumbers((prev) => ({
      ...prev,
      [appointmentId]: '',
    }))
    setMessage(`Phone number updated for ${appointmentId}`)
  }

  // Send WhatsApp message
  const sendWhatsAppMessage = async (appointment: Appointment) => {
    if (!appointment.patientPhone) {
      setMessage('Please add phone number first')
      return
    }

    setSendingId(appointment.appointmentId)
    try {
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientPhone: appointment.patientPhone,
          patientName: appointment.patientName,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          doctorName: appointment.doctorName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update appointment with message status
        const appointmentRef = ref(
          database,
          `appointments/${appointment.appointmentId}`
        )
        update(appointmentRef, {
          messageStatus: 'sent',
          lastMessageTime: new Date().toISOString(),
        })
        setMessage(
          `Message sent successfully to ${appointment.patientName}!`
        )
      } else {
        setMessage(
          `Failed to send message: ${data.error}`
        )
      }
    } catch (error) {
      console.error('[v0] Send message error:', error)
      setMessage('Error sending message')
    } finally {
      setSendingId(null)
    }
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

      {appointments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No appointments found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {appointments.map((apt) => (
            <Card
              key={apt.appointmentId}
              className="p-6 space-y-4 hover:shadow-lg transition-shadow"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left side - Appointment details */}
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

                {/* Right side - Phone & Message status */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      Patient Phone Number
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="+1234567890"
                        value={phoneNumbers[apt.appointmentId] || apt.patientPhone || ''}
                        onChange={(e) =>
                          setPhoneNumbers((prev) => ({
                            ...prev,
                            [apt.appointmentId]: e.target.value,
                          }))
                        }
                        className="flex-1"
                      />
                      {phoneNumbers[apt.appointmentId] && (
                        <Button
                          onClick={() =>
                            updatePhoneNumber(
                              apt.appointmentId,
                              phoneNumbers[apt.appointmentId]
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Message Status */}
                  {apt.messageStatus === 'sent' ? (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm">
                        Sent on {new Date(apt.lastMessageTime!).toLocaleString()}
                      </span>
                    </div>
                  ) : apt.messageStatus === 'failed' ? (
                    <div className="flex items-center gap-2 text-red-700 bg-red-50 p-2 rounded">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Failed to send</span>
                    </div>
                  ) : null}

                  {/* Send Button */}
                  <Button
                    onClick={() => sendWhatsAppMessage(apt)}
                    disabled={!apt.patientPhone || sendingId === apt.appointmentId}
                    className="w-full"
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sendingId === apt.appointmentId
                      ? 'Sending...'
                      : 'Send WhatsApp'}
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
