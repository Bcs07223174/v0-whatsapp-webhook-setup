import { NextRequest, NextResponse } from 'next/server'

import { updateAppointmentWhatsAppFields } from '@/lib/whatsapp-database'
import {
  AppointmentTemplateRequest,
  normalizePakistanPhoneNumber,
  sendAppointmentWhatsAppTemplate,
} from '@/lib/whatsapp-appointment'

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://health-37caa-default-rtdb.firebaseio.com'
const APPOINTMENTS_PATH = `${FIREBASE_DATABASE_URL}/appointments`

function toTrimmedString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value == null) {
    return ''
  }

  return String(value).trim()
}

function getAnyField(sources: Array<Record<string, unknown>>, ...keys: string[]) {
  for (const source of sources) {
    for (const key of keys) {
      const v = source[key]

      if (typeof v === 'string') {
        const t = v.trim()
        if (t) return t
      }

      if (v != null && typeof v !== 'object') {
        const s = String(v).trim()
        if (s) return s
      }
    }
  }

  return ''
}

async function fetchAppointmentRecord(appointmentId: string) {
  if (!appointmentId) {
    return null
  }

  const response = await fetch(`${APPOINTMENTS_PATH}/${encodeURIComponent(appointmentId)}.json`, {
    method: 'GET',
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Failed to load appointment record: ${response.status} ${details}`)
  }

  const data = await response.json()

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null
  }

  return data as Record<string, unknown>
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown WhatsApp send error'
}

async function markAppointmentFailed(appointmentId: string, errorMessage: string) {
  const now = new Date().toISOString()

  try {
    await updateAppointmentWhatsAppFields(appointmentId, {
      whatsappStatus: 'failed',
      whatsappMessageId: '',
      whatsappSentAt: now,
      whatsappError: errorMessage,
      messageStatus: 'failed',
      lastMessageTime: now,
    })
  } catch (databaseError) {
    console.error('[WhatsApp Appointment] Failed to update appointment after send failure', {
      appointmentId,
      databaseError,
    })
  }
}

export async function POST(request: NextRequest) {
  let appointmentId = ''

  try {
    const body = await request.json()
    appointmentId = toTrimmedString(body.appointmentId)
    const appointmentRecord = appointmentId ? await fetchAppointmentRecord(appointmentId).catch((error) => {
      console.warn('[WhatsApp Appointment] Unable to load appointment record, falling back to request body', {
        appointmentId,
        error,
      })
      return null
    }) : null

    // Map incoming body fields more forgivingly (support common variants)
    const appointmentSources = [body, appointmentRecord || {}]
    const input: AppointmentTemplateRequest = {
      appointmentId,
      patientName: getAnyField(appointmentSources, 'patientName', 'patient_name', 'name', 'patient'),
      patientPhone: getAnyField(appointmentSources, 'patientPhone', 'patient_phone', 'phone', 'to'),
      clinicName: getAnyField(
        appointmentSources,
        'clinicName',
        'clinic_name',
        'businessName',
        'business_name',
        'clinic'
      ),
      businessName: getAnyField(appointmentSources, 'businessName', 'business_name', 'clinicName'),
      doctorName: getAnyField(appointmentSources, 'doctorName', 'doctor_name', 'doctor'),
      appointmentDate: getAnyField(appointmentSources, 'appointmentDate', 'appointment_date', 'date'),
      appointmentTime: getAnyField(appointmentSources, 'appointmentTime', 'appointment_time', 'time'),
      serviceName: getAnyField(appointmentSources, 'serviceName', 'service_name', 'service'),
      reason: getAnyField(appointmentSources, 'reason'),
    }

    console.log('[WhatsApp Appointment] Incoming body:', JSON.stringify(body))
    console.log('[WhatsApp Appointment] Mapped input:', JSON.stringify(input))

    const requiredFields = {
      appointmentId: input.appointmentId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
    }
    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      const errorMessage = `Missing required field(s): ${missingFields.join(', ')}`

      if (appointmentId) {
        await markAppointmentFailed(appointmentId, errorMessage)
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const normalizedPhone = normalizePakistanPhoneNumber(input.patientPhone)

    if (!normalizedPhone) {
      const errorMessage =
        'Invalid patientPhone. Use a Pakistani number like 03267564405, +923267564405, or 923267564405.'
      await markAppointmentFailed(appointmentId, errorMessage)
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const result = await sendAppointmentWhatsAppTemplate({
      ...input,
      patientPhone: normalizedPhone,
    })
    const now = new Date().toISOString()

    await updateAppointmentWhatsAppFields(appointmentId, {
      whatsappStatus: 'sent',
      whatsappMessageId: result.whatsappMessageId,
      whatsappSentAt: now,
      whatsappError: '',
      messageStatus: 'sent',
      lastMessageTime: now,
    })

    console.log('[WhatsApp Appointment] Appointment template sent successfully', {
      appointmentId,
      whatsappMessageId: result.whatsappMessageId,
      to: result.to,
    })

    return NextResponse.json(
      {
        success: true,
        appointmentId,
        to: result.to,
        phone: result.to,
        whatsappStatus: 'sent',
        whatsappMessageId: result.whatsappMessageId,
        whatsappSentAt: now,
        templateName: result.templateName,
        templateLanguage: result.templateLanguage,
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)
    console.error('[WhatsApp Appointment] Failed to send appointment template', {
      appointmentId,
      error,
    })

    if (appointmentId) {
      await markAppointmentFailed(appointmentId, errorMessage)
    }

    return NextResponse.json(
      {
        success: false,
        appointmentId,
        whatsappStatus: 'failed',
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
