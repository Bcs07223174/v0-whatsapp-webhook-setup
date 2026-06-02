import { NextResponse } from 'next/server'

function readEnvValue(name: string) {
  return process.env[name]?.trim()
}

export async function GET() {
  const hasWhatsAppConfig =
    Boolean(readEnvValue('WHATSAPP_ACCESS_TOKEN')) &&
    Boolean(readEnvValue('WHATSAPP_PHONE_NUMBER_ID'))

  return NextResponse.json({
    configured: hasWhatsAppConfig,
  })
}