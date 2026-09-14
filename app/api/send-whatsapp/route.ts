import { NextRequest, NextResponse } from 'next/server'

import {
  getDefaultWhatsAppTemplateLanguage,
  getDefaultWhatsAppTemplateName,
  sendWhatsAppTemplateMessage,
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

function getStatusForError(error: unknown) {
  if (error instanceof WhatsAppTemplateValidationError) {
    return 400
  }

  if (error instanceof WhatsAppTemplateSendError) {
    return error.status || 502
  }

  return 500
}

function getErrorResponse(error: unknown) {
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

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: false,
    error: 'Failed to send WhatsApp template.',
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const templateName = toTrimmedString(body.templateName) || getDefaultWhatsAppTemplateName()
    const templateLanguage =
      toTrimmedString(body.templateLanguage || body.languageCode) || getDefaultWhatsAppTemplateLanguage()
    const to = toTrimmedString(body.patientPhone || body.to)

    const result = await sendWhatsAppTemplateMessage({
      to,
      phoneNumberId: toTrimmedString(body.phoneNumberId),
      templateName,
      languageCode: templateLanguage,
      values: {
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
            ? body.buttonParameters
            : undefined,
      },
    })

    return NextResponse.json(
      {
        ...result,
        phone: result.to,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[WhatsApp Template] Send route failed', {
      error,
    })

    return NextResponse.json(getErrorResponse(error), { status: getStatusForError(error) })
  }
}
