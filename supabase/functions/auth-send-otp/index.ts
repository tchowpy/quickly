import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { generateOtpCode, hashOtp, isValidPhone, normalizePhone, removeAccents } from '../_shared/utils.ts';
import { sendSmsMtnCi } from '../_shared/sms/sendSmsMtnCi.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OTP_TTL_MINUTES = Number(Deno.env.get('OTP_TTL_MINUTES') ?? '5');
const OTP_SECRET = Deno.env.get('OTP_SECRET');
const BRAND_NAME = Deno.env.get('OTP_BRAND_NAME') ?? 'Quickly';

if (!OTP_SECRET) {
  throw new Error('OTP_SECRET must be set for auth-send-otp function.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (typeof phone !== 'string') {
      return jsonResponse({ error: 'Numéro de téléphone invalide.' }, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return jsonResponse({ error: 'Format de numéro non supporté.' }, 400);
    }

    const code = generateOtpCode();
    const codeHash = await hashOtp(normalizedPhone, code, OTP_SECRET);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    await supabaseAdmin.from('phone_otp_codes').delete().eq('phone', normalizedPhone);

    const { error: insertError } = await supabaseAdmin.from('phone_otp_codes').insert({
      phone: normalizedPhone,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempt_count: 0,
    });

    if (insertError) {
      console.error('[auth-send-otp] insert error', insertError);
      return jsonResponse({ error: "Impossible d'enregistrer le code OTP." }, 500);
    }

    const message = removeAccents(`${BRAND_NAME}: votre code est ${code}. Valide ${OTP_TTL_MINUTES} min.`);
    const smsResult = await sendSmsMtnCi([normalizedPhone], message);

    if (!smsResult.success) {
      return jsonResponse({ error: "L'envoi du SMS a échoué." }, 502);
    }

    return jsonResponse({ success: true, code });
  } catch (error) {
    console.error('[auth-send-otp] unexpected error', error);
    return jsonResponse({ error: 'Erreur interne.' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
