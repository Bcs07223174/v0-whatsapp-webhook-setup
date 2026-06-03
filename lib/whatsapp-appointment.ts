import {
  getDefaultWhatsAppTemplateLanguage,
  getDefaultWhatsAppTemplateName,
  normalizePakistanPhoneNumber,
  sendWhatsAppTemplateMessage,
} from '@/lib/whatsapp-template'

export { normalizePakistanPhoneNumber }

export interface AppointmentTemplateRequest {
  appointmentId: string
  patientName: string
  patientPhone: string
  clinicName?: string
  businessName?: string
  doctorName?: string
  appointmentDate: string
  appointmentTime: string
  serviceName?: string
  reason?: string
}

export async function sendAppointmentWhatsAppTemplate(input: AppointmentTemplateRequest) {
  const templateName = getDefaultWhatsAppTemplateName()
  const templateLanguage = getDefaultWhatsAppTemplateLanguage()
  const clinicName = input.clinicName || input.businessName || input.doctorName || 'Clinic'
  const serviceName = input.serviceName || input.reason || 'Appointment'

  return sendWhatsAppTemplateMessage({
    to: input.patientPhone,
    templateName,
    languageCode: templateLanguage,
    values: {
      appointmentId: input.appointmentId,
      patientName: input.patientName,
      clinicName,
      businessName: input.businessName || clinicName,
      doctorName: input.doctorName,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      serviceName,
      reason: input.reason || serviceName,
    },
  })
}
