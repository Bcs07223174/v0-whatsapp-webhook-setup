export type WhatsAppMessageStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppSendResponse {
  success: boolean
  wamid: string
  phoneNumberId: string
  to: string
  templateName: string
  templateLanguage: string
  deliveryMode: 'template'
}

export interface WhatsAppStatusWebhookPayload {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        statuses?: Array<{
          id?: string
          status?: WhatsAppMessageStatus
          timestamp?: string | number
          recipient_id?: string
          errors?: Array<{
            code?: number
            title?: string
            message?: string
          }>
        }>
        messages?: Array<{
          id?: string
          from?: string
          text?: {
            body?: string
          }
        }>
        metadata?: {
          phone_number_id?: string
        }
      }
    }>
  }>
}

export interface WhatsAppMessageRecord {
  to: string
  phoneNumberId: string
  templateName: string
  templateLanguage: string
  templateParameters?: string[]
  wamid: string
  status: WhatsAppMessageStatus
  createdAt: string
  updatedAt: string
  statusTimestamp?: string
  recipientId?: string
  errorCode?: number
  errorTitle?: string
  errorMessage?: string
  metaResponse?: unknown
}
