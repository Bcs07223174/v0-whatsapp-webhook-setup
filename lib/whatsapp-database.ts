import { WhatsAppMessageRecord } from '@/lib/whatsapp-types'

const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || 'https://health-37caa-default-rtdb.firebaseio.com'
const WHATSAPP_TRACKING_PATH = `${FIREBASE_DATABASE_URL}/whatsappMessageTracking`
const APPOINTMENTS_PATH = `${FIREBASE_DATABASE_URL}/appointments`

function toJsonQueryValue(value: string) {
  return encodeURIComponent(JSON.stringify(value))
}

async function readResponseBody(response: Response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function saveWhatsAppMessageRecord(record: WhatsAppMessageRecord) {
  const response = await fetch(`${WHATSAPP_TRACKING_PATH}.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  })

  if (!response.ok) {
    const details = await readResponseBody(response)
    throw new Error(`Failed to save WhatsApp message record: ${response.status} ${JSON.stringify(details)}`)
  }

  return readResponseBody(response)
}

export async function findWhatsAppMessageRecordByWamid(wamid: string) {
  const response = await fetch(
    `${WHATSAPP_TRACKING_PATH}.json?orderBy=${toJsonQueryValue('wamid')}&equalTo=${toJsonQueryValue(wamid)}&limitToFirst=1`,
    {
      method: 'GET',
    }
  )

  if (!response.ok) {
    const details = await readResponseBody(response)
    throw new Error(`Failed to query WhatsApp message record: ${response.status} ${JSON.stringify(details)}`)
  }

  const data = await readResponseBody(response)

  if (!data || typeof data !== 'object') {
    return null
  }

  const [key, record] = Object.entries(data as Record<string, WhatsAppMessageRecord>)[0] || []

  if (!key || !record) {
    return null
  }

  return { key, record }
}

export async function updateWhatsAppMessageRecordByWamid(
  wamid: string,
  patch: Partial<WhatsAppMessageRecord>
) {
  const match = await findWhatsAppMessageRecordByWamid(wamid)

  if (!match) {
    return false
  }

  const response = await fetch(`${WHATSAPP_TRACKING_PATH}/${match.key}.json`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    const details = await readResponseBody(response)
    throw new Error(`Failed to update WhatsApp message record: ${response.status} ${JSON.stringify(details)}`)
  }

  return true
}

export async function updateAppointmentWhatsAppFields(
  appointmentId: string,
  patch: {
    whatsappStatus: 'sent' | 'failed'
    whatsappMessageId?: string
    whatsappSentAt: string
    whatsappError?: string
    messageStatus?: 'sent' | 'failed'
    lastMessageTime?: string
  }
) {
  const response = await fetch(`${APPOINTMENTS_PATH}/${encodeURIComponent(appointmentId)}.json`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    const details = await readResponseBody(response)
    throw new Error(`Failed to update appointment WhatsApp fields: ${response.status} ${JSON.stringify(details)}`)
  }

  return readResponseBody(response)
}
