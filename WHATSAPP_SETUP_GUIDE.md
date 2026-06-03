# WhatsApp Integration & Chat Setup Guide

## Overview

This app provides a complete WhatsApp messaging solution with:

1. **Template Message Sender** - Send WhatsApp appointment reminders using Meta templates
2. **Chat Interface** - WhatsApp-like messaging interface for agents and system
3. **Real-time Messaging** - Firebase-backed messaging system

---

## 🚀 Quick Start

### 1. Configure Environment Variables

In your Vercel project settings, add these variables to the **Vars** section:

```
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

Get these from:
- Meta Business Suite → WhatsApp → API Setup
- Copy your **Phone Number ID**
- Generate an **Access Token**

### 2. Firebase Configuration

Firebase config is already set in `/lib/firebase.ts` with your health-37caa project credentials.

### 3. Access the App

- **Chat Interface**: `https://your-app.vercel.app/` (WhatsApp-like messaging)
- **Appointments**: `https://your-app.vercel.app/appointments` (Send template messages)

---

## 📱 Features

### Template Message Sender

Send appointment reminders via WhatsApp template with one click:

```
POST /api/whatsapp/send-appointment

{
  "appointmentId": "apt_123",
  "patientPhone": "03267564405",
  "patientName": "Ahmed Hassan",
  "clinicName": "Health Clinic",
  "appointmentDate": "2024-06-15",
  "appointmentTime": "2:30 PM"
}
```

**Template Features:**
- Supports Pakistani phone numbers (03xx or 923xx format)
- Auto-normalizes to WhatsApp format (923xx)
- Stores WhatsApp message ID in appointment record
- Tracks send status and errors

### Chat Interface

Real-time messaging system with:
- Conversations list with patient info
- Message bubbles (agent: green, system: gray)
- Message status tracking (sent, delivered, read)
- Real-time updates via Firebase listeners

### Message APIs

**Send Agent Message:**
```
POST /api/send-message

{
  "conversationId": "conv_123",
  "content": "Your appointment is confirmed",
  "senderType": "agent",
  "senderName": "Support Team"
}
```

**Send System Message:**
```
POST /api/system-message

{
  "conversationId": "conv_123",
  "content": "Automated reminder: Your appointment is tomorrow",
  "appointmentId": "apt_123"
}
```

---

## 🔧 API Reference

### POST `/api/whatsapp/send-appointment`

Send WhatsApp appointment template.

**Request:**
```json
{
  "appointmentId": "string (required)",
  "patientPhone": "string (required) - 03xx or 923xx format",
  "patientName": "string (required)",
  "clinicName": "string (required)",
  "appointmentDate": "string (required) - YYYY-MM-DD",
  "appointmentTime": "string (required) - HH:MM format"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.xxx",
  "phone": "923267564405"
}
```

**Error Response:**
```json
{
  "error": "Invalid phone number format"
}
```

### POST `/api/send-message`

Send agent message to conversation.

**Request:**
```json
{
  "conversationId": "string (required)",
  "content": "string (required)",
  "senderType": "agent",
  "senderName": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xxx",
  "timestamp": 1234567890
}
```

### POST `/api/system-message`

Send automated system message.

**Request:**
```json
{
  "conversationId": "string (required)",
  "content": "string (required)",
  "appointmentId": "string (optional) - Will also send WhatsApp message"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_xxx",
  "timestamp": 1234567890
}
```

---

## 📊 Firebase Database Schema

### Appointments Collection

```
appointments/
  {appointmentId}/
    patientName: string
    patientPhone: string
    appointmentDate: string
    appointmentTime: string
    whatsappStatus: "sent" | "failed" | null
    whatsappMessageId: string (Meta message ID)
    whatsappSentAt: string (ISO timestamp)
    whatsappError: string (Error message if failed)
```

### Conversations Collection

```
conversations/
  {conversationId}/
    appointmentId: string
    patientId: string
    patientName: string
    patientPhone: string
    lastMessage: string
    lastMessageTime: number (timestamp)
    unreadCount: number
```

### Messages Collection

```
messages/
  {conversationId}/
    {messageId}/
      senderType: "agent" | "system"
      senderName: string
      content: string
      timestamp: number
      status: "sent" | "delivered" | "read"
```

---

## 🔐 Phone Number Normalization

The system automatically normalizes Pakistani phone numbers:

| Input | Output |
|-------|--------|
| 03267564405 | 923267564405 |
| 03001234567 | 923001234567 |
| +923267564405 | 923267564405 |
| 923267564405 | 923267564405 |

---

## 🧪 Testing

### Test Template Message

```bash
curl -X POST http://localhost:3000/api/whatsapp/send-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentId": "test_123",
    "patientPhone": "03267564405",
    "patientName": "Test Patient",
    "clinicName": "Test Clinic",
    "appointmentDate": "2024-06-15",
    "appointmentTime": "2:30 PM"
  }'
```

### Test Agent Message

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv_test",
    "content": "Test message from agent",
    "senderType": "agent",
    "senderName": "Support Agent"
  }'
```

---

## 🐛 Debugging

Check the browser console and server logs for debugging information:

```javascript
// Client-side logs
console.log('[v0] Message sent successfully')

// Server logs appear in Vercel dashboard
```

---

## 📝 WhatsApp Template Configuration

The system uses a pre-configured template called `appointment` with:

- **Template Name**: appointment
- **Language**: en_US
- **Parameters**: {{1}} patientName, {{2}} clinicName, {{3}} appointmentDate, {{4}} appointmentTime
- **Button**: Dynamic URL with appointment ID

Make sure this template is approved in your Meta Business Account before using.

---

## ⚠️ Common Issues

### "WhatsApp credentials not configured"
- Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to environment variables
- Restart dev server after adding variables

### "Invalid phone number format"
- Ensure phone number starts with 03xx (Pakistan) or 923xx format
- Remove special characters like spaces or hyphens

### "Template not found"
- Verify the `appointment` template is approved in Meta Business Account
- Check template language is set to en_US

### "No conversations appear in chat"
- Conversations are created automatically when messages are sent
- Check Firebase console to verify data is being saved

---

## 📞 Support

For issues or questions:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Firebase database has proper read/write permissions
4. Test APIs with curl commands provided above
