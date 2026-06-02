import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_DATABASE_URL = 'https://health-37caa-default-rtdb.firebaseio.com';

function readEnvValue(name: string) {
  return process.env[name]?.trim();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = readEnvValue('WHATSAPP_VERIFY_TOKEN');

  if (!verifyToken) {
    console.log('[v0] WHATSAPP_VERIFY_TOKEN not set');
    return new NextResponse('Webhook not configured', { status: 500 });
  }

  // Verify webhook
  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[v0] Webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.log('[v0] Webhook verification failed - invalid token');
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Missing parameters', { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[v0] Webhook received:', JSON.stringify(body, null, 2));

    // Process messages from WhatsApp
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value;

          // Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const phoneNumberId = value.metadata.phone_number_id;
              const from = message.from;
              const messageId = message.id;
              const text = message.text?.body || 'No text';

              console.log(`[v0] Message from ${from}: ${text}`);

              await saveIncomingMessage({
                phoneNumberId,
                from,
                messageId,
                text,
                receivedAt: new Date().toISOString(),
              });

              // Keep webhook delivery resilient even if the follow-up actions fail.
              markMessageAsRead(phoneNumberId, messageId).catch((error) => {
                console.error('[v0] Error marking message as read:', error);
              });

              sendReply(phoneNumberId, from, 'Message received! Thanks for contacting us.').catch((error) => {
                console.error('[v0] Error sending reply:', error);
              });
            }
          }

          // Handle status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log(`[v0] Message ${status.id} status: ${status.status}`);
              // Persist status update for debugging/delivery tracking
              try {
                await fetch(`${FIREBASE_DATABASE_URL}/whatsappStatuses.json`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    id: status.id,
                    status: status.status,
                    recipient: status.recipient_id || null,
                    raw: status,
                  }),
                })
              } catch (e) {
                console.error('[v0] Failed to persist status update:', e)
              }
            }
          }
        }
      }

      // Always return 200 to acknowledge receipt
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: false }, { status: 400 });
  } catch (error) {
    console.error('[v0] Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function markMessageAsRead(
  phoneNumberId: string,
  messageId: string
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('[v0] WHATSAPP_ACCESS_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    if (!response.ok) {
      console.error('[v0] Failed to mark message as read:', response.statusText);
    }
  } catch (error) {
    console.error('[v0] Error marking message as read:', error);
  }
}

async function sendReply(
  phoneNumberId: string,
  to: string,
  text: string
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('[v0] WHATSAPP_ACCESS_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      console.error('[v0] Failed to send reply:', response.statusText);
    } else {
      const data = await response.json();
      console.log('[v0] Reply sent successfully:', data);
    }
  } catch (error) {
    console.error('[v0] Error sending reply:', error);
  }
}

async function saveIncomingMessage(message: {
  phoneNumberId: string;
  from: string;
  messageId: string;
  text: string;
  receivedAt: string;
}): Promise<void> {
  try {
    const response = await fetch(`${FIREBASE_DATABASE_URL}/whatsappMessages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      ...message,
      direction: 'inbound',
      status: 'received',
      }),
    });

    if (!response.ok) {
      console.error('[v0] Failed to save WhatsApp message:', response.statusText);
    }
  } catch (error) {
    console.error('[v0] Error saving incoming message:', error);
  }
}
