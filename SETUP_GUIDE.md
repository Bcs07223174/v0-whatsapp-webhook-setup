# WhatsApp Patient Reminder System - Setup Guide

This app connects to your Firebase Realtime Database and automatically sends WhatsApp messages to patients about their upcoming appointments.

## Quick Setup

### 1. **Add Firebase Configuration**

Add these environment variables in your project settings (Settings → Vars):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://health-37caa-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get these values from your Firebase Console:
- Go to Project Settings → Service Accounts → SDK Admin
- Copy the configuration values

### 2. **Add WhatsApp Configuration**

Add these environment variables:

```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=Hussainahmad8888
```

### 3. **Get WhatsApp Credentials**

1. Create a WhatsApp Business Account (or use existing)
2. Create a Business App
3. Add WhatsApp API to your app
4. Get your Phone Number ID and Access Token from Meta's dashboard

For more details: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

### 4. **How to Use**

1. Open the app - it will show all appointments from your Firebase database
2. For each appointment, add the patient's phone number in the input field
3. Click "Save" to store the phone number in your database
4. Click "Send WhatsApp" to send a reminder message
5. Message status shows whether it was sent successfully

### 5. **Message Format**

The app sends personalized messages like:

```
Hello [Patient Name]! 👋

This is a reminder about your appointment:
📅 Date: [Appointment Date]
🕐 Time: [Appointment Time]
👨‍⚕️ Doctor: [Doctor Name]

Please arrive 10 minutes early. Reply "CONFIRM" to confirm your appointment.
```

### 6. **Features**

✅ Automatic appointment list from Firebase
✅ Add/update patient phone numbers
✅ Send WhatsApp reminders with one click
✅ Track message delivery status
✅ Shows sent timestamp
✅ Handle failed messages

### 7. **Troubleshooting**

**Messages not sending?**
- Check WhatsApp access token is valid
- Verify phone number format (should include country code, e.g., +12025551234)
- Check Firebase connection in console

**Can't see appointments?**
- Verify Firebase config is correct
- Check Firebase database has data in "appointments" node

**Phone numbers not saving?**
- Check Firebase database permissions
- Ensure Firebase is connected

## Database Structure

Your Firebase database should have appointments like:

```json
{
  "appointments": {
    "M8WdlTflhu5vCZrpIe1z": {
      "patientName": "John Doe",
      "patientPhone": "+12025551234",  // Added by this app
      "appointmentDate": "2026-05-31",
      "appointmentTime": "09:15",
      "doctorName": "Dr. Smith",
      ...
    }
  }
}
```

## Support

For issues with:
- **WhatsApp API**: Check Meta's documentation
- **Firebase**: Check your Firebase Console
- **App**: Check browser console logs (F12 → Console)
