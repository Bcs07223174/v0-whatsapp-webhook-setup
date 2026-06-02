import { NextRequest, NextResponse } from 'next/server'

import {
  saveWhatsAppMessageRecord,
} from '@/lib/whatsapp-database'
import { WhatsAppSendResponse } from '@/lib/whatsapp-types'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v25.0'
const DEFAULT_WHATSAPP_TEMPLATE_NAME = 'dfcgvhjk'

function readEnvValue(name: string) {
  return process.env[name]?.trim()
}

function normalizePakistanPhoneNumber(patientPhone: unknown) {
  const phoneValue = typeof patientPhone === 'string' ? patientPhone : ''
  const digitsOnly = phoneValue.replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  if (digitsOnly.startsWith('92') && digitsOnly.length === 12) {
    return digitsOnly
  }

  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return `92${digitsOnly.slice(1)}`
  }

  if (digitsOnly.length === 10) {
    return `92${digitsOnly}`
  }

  return ''
}

export async function POST(request: NextRequest) {
  try {
    const {
      patientPhone,
      to,
      phoneNumberId: requestPhoneNumberId,
      templateName: requestTemplateName,
      templateLanguage: requestTemplateLanguage,
      templateParameters: requestTemplateParameters,
      patientName,
      appointmentDate,
      appointmentTime,
      doctorName,
    } =
      await request.json()

    const phoneNumberId =
      (typeof requestPhoneNumberId === 'string' ? requestPhoneNumberId.trim() : '') ||
      readEnvValue('WHATSAPP_PHONE_NUMBER_ID')
    const accessToken = readEnvValue('WHATSAPP_ACCESS_TOKEN')
    const templateName =
      (typeof requestTemplateName === 'string' ? requestTemplateName.trim() : '') ||
      readEnvValue('WHATSAPP_TEMPLATE_NAME') ||
      DEFAULT_WHATSAPP_TEMPLATE_NAME
    const templateLanguage =
      (typeof requestTemplateLanguage === 'string' ? requestTemplateLanguage.trim() : '') ||
      readEnvValue('WHATSAPP_TEMPLATE_LANGUAGE') ||
      'en_US'

    if (!accessToken || !phoneNumberId) {
      console.error('[v0] Missing WhatsApp credentials')
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to environment variables.' },
        { status: 500 }
      )
    }

    const phoneToUse =
      typeof patientPhone === 'string'
        ? patientPhone.trim()
        : typeof to === 'string'
          ? to.trim()
          : ''

    if (!phoneToUse) {
      return NextResponse.json(
        { error: 'Missing required phone number. Provide patientPhone or to.' },
        { status: 400 }
      )
    }

    // Normalize local Pakistan numbers to international format without changing
    // numbers that are already international.
    const phoneWithCountryCode = normalizePakistanPhoneNumber(phoneToUse)

    if (!phoneWithCountryCode) {
      return NextResponse.json(
        {
          error:
            'Invalid patient phone number. Enter a valid Pakistan number like 0305xxxxxxx or 92305xxxxxxx.',
        },
        { status: 400 }
      )
    }

    const templateParameters = Array.isArray(requestTemplateParameters)
      ? requestTemplateParameters
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
      : []

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: phoneWithCountryCode,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: templateLanguage,
        },
      },
    }

    if (templateParameters.length > 0) {
      payload.template = {
        ...(payload.template as Record<string, unknown>),
        components: [
          {
            type: 'body',
            parameters: templateParameters.map((text) => ({
              type: 'text',
              text,
            })),
          },
        ],
      }
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('[v0] WhatsApp API error:', data)
      const apiErrorMessage =
        data?.error?.message || data?.error?.error_user_msg || response.statusText || 'Unknown WhatsApp API error'
      return NextResponse.json(
        { error: apiErrorMessage, details: data },
        { status: response.status }
      )
    }

    const wamid = data?.messages?.[0]?.id

    if (!wamid) {
      console.warn('[v0] WhatsApp API response did not include a wamid:', data)
    }

    const now = new Date().toISOString()
    const persistedRecord = wamid
      ? {
          to: phoneWithCountryCode,
          phoneNumberId,
          templateName,
          templateLanguage,
          templateParameters: templateParameters.length > 0 ? templateParameters : undefined,
          wamid,
          status: 'accepted' as const,
          createdAt: now,
          updatedAt: now,
          metaResponse: data,
        }
      : null

    if (persistedRecord) {
      try {
        await saveWhatsAppMessageRecord(persistedRecord)
      } catch (error) {
        console.error('[v0] Failed to persist WhatsApp send record:', error)
      }
    }

    const responseBody: WhatsAppSendResponse & { messageId: string } = {
      success: true,
      wamid: wamid || '',
      messageId: wamid || '',
      phoneNumberId,
      to: phoneWithCountryCode,
      templateName,
      templateLanguage,
      deliveryMode: 'template',
    }

    console.log('[v0] Message sent successfully:', wamid)
    return NextResponse.json(
      {
        ...responseBody,
        phone: phoneWithCountryCode,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Send WhatsApp error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
