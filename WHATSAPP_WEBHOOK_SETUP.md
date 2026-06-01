# WhatsApp Webhook Setup Guide

## Configuration Steps

### 1. Deploy Your App
First, deploy your Next.js app to get a public URL. You can use Vercel:
```bash
npm install -g vercel
vercel
```

### 2. Get Your Webhook URL
After deployment, your webhook endpoint will be available at:
```
https://your-app.vercel.app/api/webhook/whatsapp
```

### 3. Set Environment Variables
Add these to your `.env.local` file:
```
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token_here
```

You can get your access token from:
- Meta Business Manager → Your App → WhatsApp → API Setup

### 4. Configure Webhook in Meta Dashboard

1. Go to your Meta app dashboard
2. Navigate to **WhatsApp → Configuration**
3. In the **Webhooks** section:
   - **Callback URL**: `https://your-app.vercel.app/api/webhook/whatsapp`
   - **Verify Token**: `Hussainahmad8888` (or set your own)

4. Click **Verify and Save**

### 5. Subscribe to Events
In the same Webhooks section, subscribe to:
- `messages` - to receive incoming messages
- `message_status` - to track delivery/read status
- `account_alerts` - for important notifications

## What the Webhook Does

- **GET request**: Verifies the webhook with Meta using the verify token
- **POST request**: Receives incoming messages and status updates
  - Automatically marks messages as read
  - Sends an auto-reply confirmation
  - Logs all events for debugging

## Testing

You can test the webhook from Meta's dashboard:
1. Go to **WhatsApp → Configuration → Webhooks**
2. Click the **Test** button
3. Check your app logs to see the webhook response

## Environment Variables Needed

```env
WHATSAPP_ACCESS_TOKEN=your_access_token_here
```

Get this from:
1. Meta Business Manager
2. Your App Settings
3. Tools → All Tools
4. Search for "Access Token"
5. Generate a long-lived token with `whatsapp_business_messaging` scope

## API Response Format

The webhook expects Meta to send JSON like:
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "account_id",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "phone_number_id": "phone_id"
            },
            "messages": [
              {
                "from": "whatsapp_phone_number",
                "id": "message_id",
                "text": {
                  "body": "Hello!"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

## Troubleshooting

- **Webhook verification fails**: Check that your verify token matches exactly
- **Not receiving messages**: Ensure webhook is subscribed to "messages" field
- **Auto-reply not sending**: Check that `WHATSAPP_ACCESS_TOKEN` is set in environment
- **Can't verify webhook**: Make sure your app is publicly accessible and responding to GET requests
