import { saveWhatsAppMessageRecord } from '@/lib/whatsapp-database'
import {
  WhatsAppCloudApiError,
  WhatsAppCloudApiResponse,
  WhatsAppSendTemplateResult,
  WhatsAppTemplateButtonComponent,
  WhatsAppTemplateButtonConfig,
  WhatsAppTemplateComponent,
  WhatsAppTemplateConfig,
  WhatsAppTemplatePayload,
  WhatsAppTemplateParameter,
  WhatsAppTemplateParameterKey,
} from '@/lib/whatsapp-types'

const DEFAULT_GRAPH_VERSION = 'v25.0'
const DEFAULT_TEMPLATE_NAME = 'appointment'
const DEFAULT_TEMPLATE_LANGUAGE = 'en_US'

export const WHATSAPP_TEMPLATE_CONFIGS = {
  appointment: {
    name: 'appointment',
    language: 'en_US',
    bodyParams: ['patientName', 'clinicName', 'appointmentDate', 'appointmentTime'],
    headerParams: [],
    // Removed button config: real Meta template appears to accept only body params
    // Keep buttons empty to avoid sending unexpected button components
    buttons: [],
  },
  appointment_confirmation_1: {
    name: 'appointment_confirmation_1',
    language: 'en_US',
    bodyParams: ['patientName', 'businessName', 'serviceName', 'appointmentDate', 'appointmentTime'],
    headerParams: [],
    buttons: [],
  },
  dfcgvhjk: {
    name: 'dfcgvhjk',
    language: 'en_US',
    bodyParams: [],
    headerParams: [],
    buttons: [],
  },
} as const satisfies Record<string, WhatsAppTemplateConfig>

export type WhatsAppTemplateName = keyof typeof WHATSAPP_TEMPLATE_CONFIGS

export interface WhatsAppTemplateValues extends Partial<Record<WhatsAppTemplateParameterKey, unknown>> {
  templateParameters?: unknown[]
  headerParameters?: unknown[]
  buttonParameters?: Record<string, unknown[]>
}

export interface SendWhatsAppTemplateMessageInput {
  to: unknown
  templateName?: string
  languageCode?: string
  phoneNumberId?: string
  accessToken?: string
  values?: WhatsAppTemplateValues
  persist?: boolean
}

function readEnvValue(name: string) {
  return process.env[name]?.trim()
}

export function getWhatsAppGraphVersion() {
  const graphVersion = readEnvValue('WHATSAPP_GRAPH_VERSION') || DEFAULT_GRAPH_VERSION
  return graphVersion.startsWith('v') ? graphVersion : `v${graphVersion}`
}

export function getDefaultWhatsAppTemplateName() {
  return readEnvValue('WHATSAPP_TEMPLATE_NAME') || DEFAULT_TEMPLATE_NAME
}

export function getDefaultWhatsAppTemplateLanguage() {
  return readEnvValue('WHATSAPP_TEMPLATE_LANGUAGE') || DEFAULT_TEMPLATE_LANGUAGE
}

export function normalizePakistanPhoneNumber(phoneNumber: unknown) {
  const digitsOnly = typeof phoneNumber === 'string' ? phoneNumber.replace(/\D/g, '') : ''

  if (!digitsOnly) {
    return ''
  }

  if (digitsOnly.startsWith('92') && digitsOnly.length === 12) {
    return digitsOnly
  }

  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return `92${digitsOnly.slice(1)}`
  }

  if (digitsOnly.startsWith('3') && digitsOnly.length === 10) {
    return `92${digitsOnly}`
  }

  return ''
}

function safeTemplateText(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value == null) {
    return ''
  }

  return String(value).trim()
}

function requireText(value: unknown, label: string) {
  const text = safeTemplateText(value)

  if (!text) {
    throw new WhatsAppTemplateValidationError(`Missing required template value: ${label}`)
  }

  return text
}

function getTemplateConfig(templateName: string) {
  return WHATSAPP_TEMPLATE_CONFIGS[templateName as WhatsAppTemplateName]
}

function textParameters(values: string[]): WhatsAppTemplateParameter[] {
  return values.map((text) => ({ type: 'text', text }))
}

function buttonParameters(
  values: string[],
  parameterType: WhatsAppTemplateButtonConfig['parameterType']
): WhatsAppTemplateParameter[] {
  if (parameterType === 'coupon_code') {
    return values.map((coupon_code) => ({ type: 'coupon_code', coupon_code }))
  }

  return textParameters(values)
}

function resolveOrderedParameters(
  componentType: 'BODY' | 'HEADER',
  templateName: string,
  keys: readonly WhatsAppTemplateParameterKey[],
  values: WhatsAppTemplateValues,
  directValues: readonly unknown[]
) {
  if (keys.length === 0) {
    if (directValues.length > 0) {
      throw new WhatsAppTemplateValidationError(
        `${templateName} has no ${componentType} variables, but ${directValues.length} ${componentType} parameter(s) were provided.`
      )
    }

    return []
  }

  if (directValues.length > 0 && directValues.length !== keys.length) {
    throw new WhatsAppTemplateValidationError(
      `${templateName} requires exactly ${keys.length} ${componentType} parameter(s), but received ${directValues.length}.`
    )
  }

  const resolvedValues =
    directValues.length > 0
      ? directValues.map((value, index) => requireText(value, `${componentType} {{${index + 1}}}`))
      : keys.map((key, index) => requireText(values[key], `${componentType} {{${index + 1}}} (${key})`))

  if (resolvedValues.length !== keys.length) {
    throw new WhatsAppTemplateValidationError(
      `${templateName} requires exactly ${keys.length} ${componentType} parameter(s), but resolved ${resolvedValues.length}.`
    )
  }

  return resolvedValues
}

function buildButtonComponents(
  templateName: string,
  buttons: readonly WhatsAppTemplateButtonConfig[],
  values: WhatsAppTemplateValues
): WhatsAppTemplateButtonComponent[] {
  return buttons.map((button) => {
    const directValues = values.buttonParameters?.[String(button.index)] || []

    if (button.params.length === 0) {
      if (directValues.length > 0) {
        throw new WhatsAppTemplateValidationError(
          `${templateName} button ${button.index} is static, but ${directValues.length} button parameter(s) were provided.`
        )
      }

      throw new WhatsAppTemplateValidationError(
        `${templateName} has a static button in config. Static buttons must not be included in the WhatsApp components payload.`
      )
    }

    if (directValues.length > 0 && directValues.length !== button.params.length) {
      throw new WhatsAppTemplateValidationError(
        `${templateName} button ${button.index} requires exactly ${button.params.length} parameter(s), but received ${directValues.length}.`
      )
    }

    const parameterValues =
      directValues.length > 0
        ? directValues.map((value, index) => requireText(value, `BUTTON ${button.index} {{${index + 1}}}`))
        : button.params.map((key, index) =>
            requireText(values[key], `BUTTON ${button.index} {{${index + 1}}} (${key})`)
          )

    return {
      type: 'button',
      sub_type: button.type,
      index: String(button.index),
      parameters: buttonParameters(parameterValues, button.parameterType),
    }
  })
}

export function buildWhatsAppTemplatePayload(input: {
  to: unknown
  templateName: string
  languageCode: string
  values?: WhatsAppTemplateValues
}) {
  const to = normalizePakistanPhoneNumber(input.to)
  const templateName = safeTemplateText(input.templateName)
  const languageCode = safeTemplateText(input.languageCode)
  const values = input.values || {}

  if (!to) {
    throw new WhatsAppTemplateValidationError(
      'Invalid patient phone number. Use a Pakistani number like 03267564405, +923267564405, or 923267564405.'
    )
  }

  if (!templateName) {
    throw new WhatsAppTemplateValidationError('Missing template name.')
  }

  if (!languageCode) {
    throw new WhatsAppTemplateValidationError('Missing template language code.')
  }

  const config = getTemplateConfig(templateName)

  if (!config) {
    throw new WhatsAppTemplateValidationError(
      `Unsupported templateName: ${templateName}. Add the approved template structure to WHATSAPP_TEMPLATE_CONFIGS before sending.`
    )
  }

  const bodyValues = resolveOrderedParameters(
    'BODY',
    templateName,
    config.bodyParams,
    values,
    Array.isArray(values.templateParameters) ? values.templateParameters : []
  )
  const headerValues = resolveOrderedParameters(
    'HEADER',
    templateName,
    config.headerParams,
    values,
    Array.isArray(values.headerParameters) ? values.headerParameters : []
  )

  const components: WhatsAppTemplateComponent[] = []

  if (headerValues.length > 0) {
    components.push({
      type: 'header',
      parameters: textParameters(headerValues),
    })
  }

  if (bodyValues.length > 0) {
    components.push({
      type: 'body',
      parameters: textParameters(bodyValues),
    })
  }

  components.push(...buildButtonComponents(templateName, config.buttons, values))

  const payload: WhatsAppTemplatePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      ...(components.length > 0 ? { components } : {}),
    },
  }

  return {
    payload,
    to,
    config,
    bodyParameterValues: bodyValues,
    headerParameterValues: headerValues,
  }
}

async function readWhatsAppResponse(response: Response): Promise<WhatsAppCloudApiResponse | string | null> {
  const responseText = await response.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return responseText
  }
}

function extractMetaError(data: WhatsAppCloudApiResponse | string | null, fallback: string): WhatsAppCloudApiError {
  if (typeof data === 'string') {
    return { message: data }
  }

  return {
    message: data?.error?.error_user_msg || data?.error?.message || fallback,
    code: data?.error?.code,
    subcode: data?.error?.error_subcode,
    error_data: data?.error?.error_data,
    fbtrace_id: data?.error?.fbtrace_id,
    type: data?.error?.type,
  }
}

export function logWhatsAppTemplatePayload(payload: WhatsAppTemplatePayload) {
  const components = payload.template.components || []

  console.log('[WhatsApp Template] Sending template', {
    templateName: payload.template.name,
    languageCode: payload.template.language.code,
    to: payload.to,
    componentTypes: components.map((component) => component.type),
    parameterCount: components.reduce((count, component) => count + component.parameters.length, 0),
    components: components.map((component) => ({
      type: component.type,
      subType: 'sub_type' in component ? component.sub_type : undefined,
      index: 'index' in component ? component.index : undefined,
      parameterCount: component.parameters.length,
    })),
  })
}

function validatePayloadBeforeSend(payload: WhatsAppTemplatePayload, config: WhatsAppTemplateConfig) {
  const templateName = payload.template.name
  const languageCode = payload.template.language?.code
  const components = payload.template.components || []

  if (!templateName) {
    throw new WhatsAppTemplateValidationError('Payload missing template.name')
  }

  if (!languageCode) {
    throw new WhatsAppTemplateValidationError('Payload missing template.language.code')
  }

  // Specific strict validation for the `appointment` template as requested
  if (templateName === 'appointment') {
    if (languageCode !== 'en_US') {
      throw new WhatsAppTemplateValidationError('appointment template must use language code en_US')
    }

    // There must be exactly one body component and no header component
    const headerComponents = components.filter((c) => c.type === 'header')
    if (headerComponents.length > 0) {
      throw new WhatsAppTemplateValidationError('appointment template must not include a header component')
    }

    const bodyComponents = components.filter((c) => c.type === 'body')
    if (bodyComponents.length !== 1) {
      throw new WhatsAppTemplateValidationError('appointment template must include exactly one body component')
    }

    const bodyParams = bodyComponents[0].parameters || []
    if (bodyParams.length !== config.bodyParams.length) {
      throw new WhatsAppTemplateValidationError(
        `appointment template requires exactly ${config.bodyParams.length} body parameters, received ${bodyParams.length}`
      )
    }

    for (let i = 0; i < bodyParams.length; i++) {
      const p = bodyParams[i]
      if (p.type !== 'text' || !p.text || String(p.text).trim() === '') {
        throw new WhatsAppTemplateValidationError(`BODY parameter ${i + 1} must be a non-empty text string`)
      }
    }

    // No button component unless the template config expects a dynamic button param
    const buttonComponents = components.filter((c) => c.type === 'button')
    if (buttonComponents.length > 0) {
      const hasDynamicButtonInConfig = Array.isArray(config.buttons) && config.buttons.some((b) => b.params.length > 0)
      if (!hasDynamicButtonInConfig) {
        throw new WhatsAppTemplateValidationError('appointment template must not include button components')
      }
    }
  }
}

export class WhatsAppTemplateValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WhatsAppTemplateValidationError'
  }
}

export class WhatsAppTemplateSendError extends Error {
  status: number
  metaError: WhatsAppCloudApiError
  metaResponse: WhatsAppCloudApiResponse | string | null

  constructor(status: number, metaError: WhatsAppCloudApiError, metaResponse: WhatsAppCloudApiResponse | string | null) {
    super(metaError.message || 'WhatsApp API request failed')
    this.name = 'WhatsAppTemplateSendError'
    this.status = status
    this.metaError = metaError
    this.metaResponse = metaResponse
  }
}

export async function sendWhatsAppTemplateMessage(input: SendWhatsAppTemplateMessageInput): Promise<WhatsAppSendTemplateResult> {
  const phoneNumberId = safeTemplateText(input.phoneNumberId) || readEnvValue('WHATSAPP_PHONE_NUMBER_ID')
  const accessToken = safeTemplateText(input.accessToken) || readEnvValue('WHATSAPP_ACCESS_TOKEN')
  const templateName = safeTemplateText(input.templateName) || getDefaultWhatsAppTemplateName()
  const languageCode = safeTemplateText(input.languageCode) || getDefaultWhatsAppTemplateLanguage()

  if (!phoneNumberId) {
    throw new WhatsAppTemplateValidationError('Missing WHATSAPP_PHONE_NUMBER_ID.')
  }

  if (!accessToken) {
    throw new WhatsAppTemplateValidationError('Missing WHATSAPP_ACCESS_TOKEN.')
  }

  const built = buildWhatsAppTemplatePayload({
    to: input.to,
    templateName,
    languageCode,
    values: input.values,
  })
  const endpoint = `https://graph.facebook.com/${getWhatsAppGraphVersion()}/${phoneNumberId}/messages`

  // Log selected template config for debugging
  console.log('[WHATSAPP_TEMPLATE_SELECTED]', built.config)

  // Log the exact final payload that will be sent (do not log tokens)
  console.log('[WHATSAPP_FINAL_PAYLOAD]', JSON.stringify(built.payload, null, 2))

  // Run strict validations before making the Meta Graph API call
  validatePayloadBeforeSend(built.payload, built.config)

  logWhatsAppTemplatePayload(built.payload)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(built.payload),
  })

  const data = await readWhatsAppResponse(response)

  if (!response.ok) {
    const metaError = extractMetaError(data, response.statusText || 'WhatsApp API request failed')

    console.error('[WhatsApp Template] Meta API failed', {
      status: response.status,
      templateName,
      languageCode,
      componentTypes: built.payload.template.components?.map((component) => component.type) || [],
      parameterCount:
        built.payload.template.components?.reduce((count, component) => count + component.parameters.length, 0) || 0,
      metaErrorMessage: metaError.message,
      metaErrorCode: metaError.code,
      metaErrorSubcode: metaError.subcode,
      metaErrorData: (metaError as any).error_data,
      fbtraceId: metaError.fbtrace_id,
    })

    throw new WhatsAppTemplateSendError(response.status, metaError, data)
  }

  const wamid = typeof data === 'object' && data ? data.messages?.[0]?.id || '' : ''

  if (!wamid) {
    console.warn('[WhatsApp Template] Meta response did not include a message id', {
      templateName,
      languageCode,
      response: data,
    })
  }

  if (wamid && input.persist !== false) {
    const now = new Date().toISOString()

    try {
      await saveWhatsAppMessageRecord({
        to: built.to,
        phoneNumberId,
        templateName,
        templateLanguage: languageCode,
        templateParameters: built.bodyParameterValues.length > 0 ? built.bodyParameterValues : undefined,
        wamid,
        status: 'accepted',
        createdAt: now,
        updatedAt: now,
        metaResponse: data,
      })
    } catch (error) {
      console.error('[WhatsApp Template] Failed to persist WhatsApp send record', {
        templateName,
        wamid,
        error,
      })
    }
  }

  console.log('[WhatsApp Template] Template accepted by Meta', {
    templateName,
    languageCode,
    wamid,
    to: built.to,
  })

  return {
    success: true,
    wamid,
    messageId: wamid,
    whatsappMessageId: wamid,
    phoneNumberId,
    to: built.to,
    templateName,
    templateLanguage: languageCode,
    deliveryMode: 'template',
    metaResponse: data,
  }
}
