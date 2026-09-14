import { NextRequest, NextResponse } from 'next/server'

import {
  buildWhatsAppTemplatePayload,
  getDefaultWhatsAppTemplateLanguage,
  getDefaultWhatsAppTemplateName,
  sendWhatsAppTemplateMessage,
  WHATSAPP_TEMPLATE_CONFIGS,
  WhatsAppTemplateSendError,
  WhatsAppTemplateValidationError,
} from '@/lib/whatsapp-template'

function toTrimmedString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value == null) {
    return ''
  }

  return String(value).trim()
}

function buildValues(body: Record<string, unknown>) {
  return {
    appointmentId: toTrimmedString(body.appointmentId),
    patientName: toTrimmedString(body.patientName),
    doctorName: toTrimmedString(body.doctorName),
    businessName: toTrimmedString(body.businessName || body.clinicName),
    clinicName: toTrimmedString(body.clinicName || body.businessName),
    serviceName: toTrimmedString(body.serviceName || body.reason),
    reason: toTrimmedString(body.reason || body.serviceName),
    appointmentDate: toTrimmedString(body.appointmentDate),
    appointmentTime: toTrimmedString(body.appointmentTime),
    templateParameters: Array.isArray(body.templateParameters) ? body.templateParameters : [],
    headerParameters: Array.isArray(body.headerParameters) ? body.headerParameters : [],
    buttonParameters:
      body.buttonParameters && typeof body.buttonParameters === 'object' && !Array.isArray(body.buttonParameters)
        ? (body.buttonParameters as Record<string, unknown[]>)
        : undefined,
  }
}

function errorStatus(error: unknown) {
  if (error instanceof WhatsAppTemplateValidationError) {
    return 400
  }

  if (error instanceof WhatsAppTemplateSendError) {
    return error.status || 502
  }

  return 500
}

function errorBody(error: unknown) {
  if (error instanceof WhatsAppTemplateSendError) {
    return {
      success: false,
      error: error.message,
      details: {
        metaErrorMessage: error.metaError.message,
        metaErrorCode: error.metaError.code,
        metaErrorSubcode: error.metaError.subcode,
        fbtraceId: error.metaError.fbtrace_id,
      },
    }
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : 'Failed to build WhatsApp template payload.',
  }
}

export async function GET() {
  return NextResponse.json({
    defaultTemplateName: getDefaultWhatsAppTemplateName(),
    defaultTemplateLanguage: getDefaultWhatsAppTemplateLanguage(),
    configuredTemplates: WHATSAPP_TEMPLATE_CONFIGS,
    examples: {
      noVariables: {
        to: '03267564405',
        templateName: 'dfcgvhjk',
        templateLanguage: 'en_US',
      },
      bodyVariables: {
        to: '03267564405',
        templateName: 'appointment_confirmation_1',
        templateLanguage: 'en_US',
        patientName: 'Ali',
        businessName: 'Fashion Styles',
        serviceName: "Men's haircut",
        appointmentDate: '04 June 2026',
        appointmentTime: '05:00 PM',
      },
      dynamicUrlButton: {
        to: '03267564405',
        templateName: 'appointment',
        templateLanguage: 'en_US',
        appointmentId: 'APT12345',
        patientName: 'Ali',
        clinicName: 'Fashion Styles',
        appointmentDate: '04 June 2026',
        appointmentTime: '05:00 PM',
      },
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const templateName = toTrimmedString(body.templateName) || getDefaultWhatsAppTemplateName()
    const languageCode = toTrimmedString(body.templateLanguage || body.languageCode) || getDefaultWhatsAppTemplateLanguage()
    const to = toTrimmedString(body.to || body.patientPhone)

    if (body.send === true) {
      const result = await sendWhatsAppTemplateMessage({
        to,
        templateName,
        languageCode,
        values: buildValues(body),
        persist: body.persist !== false,
      })

      return NextResponse.json({ ...result, phone: result.to }, { status: 200 })
    }

    const built = buildWhatsAppTemplatePayload({
      to,
      templateName,
      languageCode,
      values: buildValues(body),
    })

    return NextResponse.json({
      success: true,
      dryRun: true,
      payload: built.payload,
      bodyParameterCount: built.bodyParameterValues.length,
      headerParameterCount: built.headerParameterValues.length,
      componentTypes: built.payload.template.components?.map((component) => component.type) || [],
    })
  } catch (error) {
    console.error('[WhatsApp Template Debug] Failed', {
      error,
    })

    return NextResponse.json(errorBody(error), { status: errorStatus(error) })
  }
}
