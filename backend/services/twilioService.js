const twilio = require('twilio');

let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || accountSid.startsWith('ACXXXXXX')) {
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch (err) {
    console.error('[Twilio] Initialization error:', err.message);
    return null;
  }
}

/**
 * Sends a WhatsApp message.
 * Priority:
 * 1. Meta WhatsApp Cloud API (Free for first 1,000 conversations/month)
 * 2. Twilio WhatsApp API (Paid)
 * 3. Mock Console Logs (Fallback)
 * 
 * @param {string} to - The recipient's phone number
 * @param {string} body - The message content
 * @returns {Promise<{success: boolean, sid?: string, mock?: boolean, error?: string}>}
 */
async function sendWhatsApp(to, body, templateOptions = null) {
  const metaAccessToken = process.env.META_ACCESS_TOKEN;
  const metaPhoneId = process.env.META_PHONE_NUMBER_ID;

  // 1. Meta WhatsApp Cloud API (100% Free Tier available)
  if (metaAccessToken && metaPhoneId && !metaAccessToken.startsWith('your_meta_')) {
    let cleanedTo = to.replace(/\D/g, ''); // Digits only
    if (cleanedTo.startsWith('0091')) {
      cleanedTo = cleanedTo.substring(4);
    } else if (cleanedTo.startsWith('0') && cleanedTo.length === 11) {
      cleanedTo = cleanedTo.substring(1);
    }
    if (cleanedTo.length === 10) {
      cleanedTo = '91' + cleanedTo;
    }
    
    try {
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanedTo
      };

      if (templateOptions && templateOptions.name) {
        payload.type = "template";
        payload.template = {
          name: templateOptions.name,
          language: {
            code: templateOptions.languageCode || 'en_US'
          }
        };

        if (templateOptions.parameters && templateOptions.parameters.length > 0) {
          payload.template.components = [
            {
              type: "body",
              parameters: templateOptions.parameters.map(param => ({
                type: "text",
                text: String(param)
              }))
            }
          ];
        }
      } else {
        payload.type = "text";
        payload.text = {
          preview_url: false,
          body: body
        };
      }

      const response = await fetch(`https://graph.facebook.com/v25.0/${metaPhoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const resData = await response.json();
      if (!response.ok) {
        console.error('[Meta WhatsApp] API Error Response:', JSON.stringify(resData, null, 2));
        throw new Error(resData.error?.message || 'Meta API error');
      }
      
      const messageId = resData.messages?.[0]?.id;
      console.log(`[Meta WhatsApp] Message sent to ${to}, ID: ${messageId}`);
      return { success: true, sid: messageId };
    } catch (err) {
      console.error(`[Meta WhatsApp] Failed to send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // 2. Twilio WhatsApp API
  const client = getTwilioClient();
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;

  if (client && twilioFrom && !twilioFrom.startsWith('whatsapp:+14155238886')) {
    let cleanedTo = to.replace(/\D/g, '');
    if (cleanedTo.startsWith('0091')) {
      cleanedTo = cleanedTo.substring(4);
    } else if (cleanedTo.startsWith('0') && cleanedTo.length === 11) {
      cleanedTo = cleanedTo.substring(1);
    }
    if (cleanedTo.length === 10) {
      cleanedTo = '91' + cleanedTo;
    }
    const formattedTo = `whatsapp:+${cleanedTo}`;
    const formattedFrom = twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`;

    try {
      const message = await client.messages.create({
        body: body,
        from: formattedFrom,
        to: formattedTo
      });
      console.log(`[Twilio WhatsApp] Message sent to ${to}, SID: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (err) {
      console.error(`[Twilio WhatsApp] Error details:`, err);
      console.error(`[Twilio WhatsApp] Failed to send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Fallback to Mock Log (Useful for sandbox testing)
  console.log(`[Messaging Mock] Send to ${to}: ${body}`);
  return { success: true, mock: true };
}

/**
 * Sends a standard SMS using Twilio SMS.
 * 
 * @param {string} to - The recipient's phone number
 * @param {string} body - The message content
 * @returns {Promise<{success: boolean, sid?: string, mock?: boolean, error?: string}>}
 */
async function sendSMS(to, body) {
  const client = getTwilioClient();
  const smsFrom = process.env.TWILIO_SMS_NUMBER;

  if (client && smsFrom && !smsFrom.startsWith('+1XXXXXXXXXX')) {
    let cleanedTo = to.replace(/\D/g, ''); // Digits only
    if (cleanedTo.startsWith('0091')) {
      cleanedTo = cleanedTo.substring(4);
    } else if (cleanedTo.startsWith('0') && cleanedTo.length === 11) {
      cleanedTo = cleanedTo.substring(1);
    }
    if (cleanedTo.length === 10) {
      cleanedTo = '91' + cleanedTo;
    }
    const formattedTo = `+${cleanedTo}`;

    try {
      const message = await client.messages.create({
        body: body,
        from: smsFrom,
        to: formattedTo
      });
      console.log(`[Twilio SMS] Message sent to ${to}, SID: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (err) {
      console.error(`[Twilio SMS] Error details:`, err);
      console.error(`[Twilio SMS] Failed to send to ${to}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Fallback to Mock Log (Useful for sandbox/test environments)
  console.log(`[SMS Mock] Send to ${to}: ${body}`);
  return { success: true, mock: true };
}

module.exports = {
  sendWhatsApp,
  sendSMS
};
