const DIACRITIC_REGEX = /[\u0300-\u036f]/g;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function removeAccents(input: string): string {
  return input.normalize('NFD').replace(DIACRITIC_REGEX, '');
}

const PHONE_REGEX = /^\+?\d{9,15}$/;

export function normalizePhone(rawPhone: string): string {
  const digits = rawPhone.replace(/[\s()-]/g, '');
  if (!digits.startsWith('+')) {
    if (digits.startsWith('0')) {
      return `+225${digits.slice(1)}`;
    }
    if (digits.length === 10) {
      return `+225${digits}`;
    }
    return `+${digits}`;
  }
  return digits;
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

export function sanitizeRecipients(recipients: string[]): string[] {
  return Array.from(
    new Set(
      recipients
        .map(normalizePhone)
        .filter((phone) => isValidPhone(phone)),
    ),
  );
}

export function generateOtpCode(length = 6): string {
  const digits = new Uint8Array(length);
  crypto.getRandomValues(digits);
  return Array.from(digits, (value) => (value % 10).toString()).join('');
}

export async function hashOtp(phone: string, code: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${phone}:${code}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
