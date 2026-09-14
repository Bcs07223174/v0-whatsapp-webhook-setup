# v0-whatsapp-webhook-setup

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_9NJyNC8L98o8xWVmZFSGazERXnPT)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## WhatsApp Appointment Template

Set these environment variables before sending appointment template messages:

```bash
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_meta_whatsapp_access_token
WHATSAPP_GRAPH_VERSION=v25.0
WHATSAPP_TEMPLATE_NAME=appointment
WHATSAPP_TEMPLATE_LANGUAGE=en_US
NEXT_PUBLIC_APP_URL=https://v0-whatsapp-webhook-setup-one.vercel.app
```

Test the appointment template route:

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "APT12345",
    "patientName": "John",
    "patientPhone": "03267564405",
    "clinicName": "Fashion Styles",
    "appointmentDate": "December 31, 2025",
    "appointmentTime": "1:00 PM"
  }'
```

The route uses the approved template config in `lib/whatsapp-template.ts`, normalizes Pakistani numbers to `92xxxxxxxxxx`, sends through WhatsApp Cloud API `WHATSAPP_GRAPH_VERSION` (default `v25.0`), and patches the existing appointment record with `whatsappStatus`, `whatsappMessageId`, `whatsappSentAt`, and `whatsappError` when applicable.

Debug template payloads without sending:

```bash
curl http://localhost:3000/api/whatsapp/debug-template
```

Build a no-variable template payload:

```bash
curl -X POST http://localhost:3000/api/whatsapp/debug-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "03267564405",
    "templateName": "dfcgvhjk",
    "templateLanguage": "en_US"
  }'
```

Build a BODY-variable template payload:

```bash
curl -X POST http://localhost:3000/api/whatsapp/debug-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "03267564405",
    "templateName": "appointment_confirmation_1",
    "templateLanguage": "en_US",
    "patientName": "Ali",
    "businessName": "Fashion Styles",
    "serviceName": "Men'\''s haircut",
    "appointmentDate": "04 June 2026",
    "appointmentTime": "05:00 PM"
  }'
```

Build a dynamic URL button template payload:

```bash
curl -X POST http://localhost:3000/api/whatsapp/debug-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "03267564405",
    "templateName": "appointment",
    "templateLanguage": "en_US",
    "appointmentId": "APT12345",
    "patientName": "Ali",
    "clinicName": "Fashion Styles",
    "appointmentDate": "04 June 2026",
    "appointmentTime": "05:00 PM"
  }'
```

To send from the debug route, add `"send": true`. Without it, the route returns a dry-run payload only.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
