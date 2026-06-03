/**
 * Normalize Pakistani phone numbers to WhatsApp format
 * Examples: 03267564405 → 923267564405, +923267564405 → 923267564405
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except leading +
  let cleaned = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')

  // If it starts with 0, replace with 92 (Pakistan country code)
  if (cleaned.startsWith('0')) {
    cleaned = '92' + cleaned.substring(1)
  }

  // If it's 10 digits (without country code), add 92
  if (cleaned.length === 10) {
    cleaned = '92' + cleaned
  }

  // Ensure it starts with 92 for Pakistan
  if (!cleaned.startsWith('92')) {
    cleaned = '92' + cleaned
  }

  return cleaned
}

/**
 * Validate if phone number is valid format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone)
  // Should be 12 digits (92 + 10 digits)
  return /^92\d{10}$/.test(normalized)
}

/**
 * Format phone number for display
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone)
  // 923267564405 → +92 326 756 4405
  return `+${normalized.substring(0, 2)} ${normalized.substring(2, 5)} ${normalized.substring(5, 8)} ${normalized.substring(8)}`
}

/**
 * Build WhatsApp template message payload
 */
export interface TemplateParams {
  patientName: string
  clinicName: string
  appointmentDate: string
  appointmentTime: string
  appointmentId: string
}

export function buildTemplatePayload(
  phoneNumber: string,
  templateParams: TemplateParams
) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber)

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: 'appointment',
      language: {
        code: 'en_US',
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: templateParams.patientName },
            { type: 'text', text: templateParams.clinicName },
            { type: 'text', text: templateParams.appointmentDate },
            { type: 'text', text: templateParams.appointmentTime },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: templateParams.appointmentId,
            },
          ],
        },
      ],
    },
  }
}
