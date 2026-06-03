export type WhatsAppMessageStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed'

export interface WhatsAppSendResponse {
  success: boolean
  wamid: string
  messageId?: string
  phoneNumberId: string
  to: string
  templateName: string
  templateLanguage: string
  deliveryMode: 'template'
}

export type WhatsAppTemplateParameterKey =
  | 'appointmentId'
  | 'patientName'
  | 'doctorName'
  | 'businessName'
  | 'serviceName'
  | 'reason'
  | 'clinicName'
  | 'appointmentDate'
  | 'appointmentTime'

export type WhatsAppTemplateTextParameter = {
  type: 'text'
  text: string
}

export type WhatsAppTemplateCouponCodeParameter = {
  type: 'coupon_code'
  coupon_code: string
}

export type WhatsAppTemplateParameter =
  | WhatsAppTemplateTextParameter
  | WhatsAppTemplateCouponCodeParameter

export type WhatsAppTemplateHeaderComponent = {
  type: 'header'
  parameters: WhatsAppTemplateParameter[]
}

export type WhatsAppTemplateBodyComponent = {
  type: 'body'
  parameters: WhatsAppTemplateParameter[]
}

export type WhatsAppTemplateButtonSubType = 'url' | 'quick_reply' | 'copy_code'

export type WhatsAppTemplateButtonComponent = {
  type: 'button'
  sub_type: WhatsAppTemplateButtonSubType
  index: string
  parameters: WhatsAppTemplateParameter[]
}

export type WhatsAppTemplateComponent =
  | WhatsAppTemplateHeaderComponent
  | WhatsAppTemplateBodyComponent
  | WhatsAppTemplateButtonComponent

export type WhatsAppTemplateButtonConfig = {
  type: WhatsAppTemplateButtonSubType
  index: number
  params: readonly WhatsAppTemplateParameterKey[]
  parameterType?: 'text' | 'coupon_code'
}

export type WhatsAppTemplateConfig = {
  name: string
  language: string
  bodyParams: readonly WhatsAppTemplateParameterKey[]
  headerParams: readonly WhatsAppTemplateParameterKey[]
  buttons: readonly WhatsAppTemplateButtonConfig[]
}

export type WhatsAppTemplatePayload = {
  messaging_product: 'whatsapp'
  to: string
  type: 'template'
  template: {
    name: string
    language: {
      code: string
    }
    components?: WhatsAppTemplateComponent[]
  }
}

export interface WhatsAppCloudApiError {
  message?: string
  error_user_msg?: string
  code?: number
  error_subcode?: number
  subcode?: number
  fbtrace_id?: string
  type?: string
}

export interface WhatsAppCloudApiResponse {
  messages?: Array<{
    id?: string
  }>
  error?: WhatsAppCloudApiError
}

export interface WhatsAppSendTemplateResult extends WhatsAppSendResponse {
  messageId: string
  whatsappMessageId: string
  metaResponse: WhatsAppCloudApiResponse | string | null
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
