import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { hashOtp, isValidPhone, normalizePhone } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OTP_SECRET = Deno.env.get('OTP_SECRET');

if (!OTP_SECRET) {
  throw new Error('OTP_SECRET must be set for auth-verify-otp function.');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, code } = await req.json();
    if (typeof phone !== 'string' || typeof code !== 'string') {
      return jsonResponse({ error: 'Requête invalide.' }, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      return jsonResponse({ error: 'Format de numéro non supporté.' }, 400);
    }

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('phone_otp_codes')
      .select('*')
      .eq('phone', normalizedPhone)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (otpError) {
      console.error('[auth-verify-otp] otp query error', otpError);
      return jsonResponse({ success: false, error: 'Erreur de vérification.' }, 200);
    }

    if (!otpRecord) {
      return jsonResponse({ success: false, error: 'Code invalide.' }, 200);
    }

    if (otpRecord.expires_at && new Date(otpRecord.expires_at).getTime() < Date.now()) {
      return jsonResponse({ success: false, error: 'Code expiré.' }, 200);
    }

    const hashed = await hashOtp(normalizedPhone, code, OTP_SECRET);

    if (otpRecord.code_hash !== hashed) {
      console.warn('[auth-verify-otp] wrong code provided', {
        phone: normalizedPhone,
        attemptCount: otpRecord.attempt_count,
      });

      await supabaseAdmin
        .from('phone_otp_codes')
        .update({ attempt_count: (otpRecord.attempt_count ?? 0) + 1 })
        .eq('id', otpRecord.id);

      return jsonResponse({ success: false, error: 'Code invalide.' }, 200);
    }

    await supabaseAdmin
      .from('phone_otp_codes')
      .update({ used_at: new Date().toISOString(), attempt_count: (otpRecord.attempt_count ?? 0) + 1 })
      .eq('id', otpRecord.id);

    const password = crypto.randomUUID();

    const existingUser = await getUserByPhone(normalizedPhone);
    let user = existingUser;
    console.log('[auth-verify-otp] existingUser ',existingUser)
    if (!existingUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        phone: normalizedPhone,
        password,
        phone_confirm: true,
        user_metadata: { source: 'otp' },
      });
      if (error || !data.user) {
        console.error('[auth-verify-otp] create user error', error);
        return jsonResponse({ success: false, error: "Impossible de créer l'utilisateur." }, 200);
      }
      user = data.user;
      console.log('[auth-verify-otp] user ',user)
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        phone_confirm: true,
      });
      if (error) {
        console.error('[auth-verify-otp] update user error', error);
        return jsonResponse({ success: false, error: "Impossible de mettre à jour l'utilisateur." }, 200);
      }
    }

    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      phone: normalizedPhone,
      password,
    });

    if (signInError || !signInData.session || !signInData.user) {
      console.error('[auth-verify-otp] signIn error', signInError, signInData);
      return jsonResponse({
        success: false,
        error:
          signInError?.message ??
          (signInError as any)?.error_description ??
          (signInError as any)?.error ??
          'Authentification impossible.',
      }, 200);
    }

    return jsonResponse({ success: true, session: signInData.session, user: signInData.user });
  } catch (error) {
    console.error('[auth-verify-otp] unexpected error', error);
    return jsonResponse({ success: false, error: 'Erreur interne.' }, 200);
  }
});

async function getUserByPhone(phone: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    filter: `phone.eq.${phone}`, //Ca ne marche pas
    page: 1,
    perPage: 1000,
  });
  if (error) {
    console.error('[auth-verify-otp] listUsers error', error);
    return null;
  }
  if (!data.users) return null;
  console.log('[auth-verify-otp] listUsers data.users', data.users);
  const user = data.users.find((u) => phone.includes(u.phone)) ?? null ;
  console.log('[auth-verify-otp] listUsers user', user);
  return user //data.users?.[0] ?? null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
