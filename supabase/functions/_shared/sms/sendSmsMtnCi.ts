import { removeAccents, sanitizeRecipients } from '../utils.ts';

interface SmsResponse {
  success: boolean;
  data?: unknown;
  status?: number;
  error?: unknown;
  skipped?: boolean;
}

const WORKSPACE = (Deno.env.get('APP_ENV') ?? 'dev').toUpperCase();
const API_URL = Deno.env.get('SMS_MTN_CI_API_URL');
const SENDER_ID = Deno.env.get('SMS_MTN_CI_SENDER_ID');
const API_TOKEN = Deno.env.get('SMS_MTN_CI_TOKEN');
const DLR_URL = Deno.env.get('SMS_MTN_CI_DLR_URL') ?? '';

if (WORKSPACE === 'PROD' && (!API_URL || !SENDER_ID || !API_TOKEN)) {
  throw new Error('SMS MTN CI configuration missing required environment variables.');
}

export async function sendSmsMtnCi(recipients: string[], message: string): Promise<SmsResponse> {
  const cleanedRecipients = sanitizeRecipients(recipients);
  if (cleanedRecipients.length === 0) {
    return { success: false, error: 'Aucun numéro valide fourni.' };
  }

  const textMessageSansAccent = removeAccents(message);

  if (WORKSPACE !== 'PROD') {
    console.log('[sendSmsMtnCi] mock send', { cleanedRecipients, textMessageSansAccent });
    return { success: true, skipped: true };
  }

  try {
    const payload = {
      sender: SENDER_ID,
      content: textMessageSansAccent,
      dlrUrl: DLR_URL,
      recipients: cleanedRecipients,
    };

    const response = await fetch(API_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'cache-control': 'no-cache',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      console.log('[sendSmsMtnCi] success', data);
      return { success: true, data, status: response.status };
    }

    console.error('[sendSmsMtnCi] failed', response.status, data);
    return { success: false, status: response.status, data };
  } catch (error) {
    console.error('[sendSmsMtnCi] error', error);
    return { success: false, error };
  }
}
