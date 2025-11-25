import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type SupportPayload = {
  subject: string;
  message: string;
  user_id: string;
  order_id?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as SupportPayload;
    if (!payload.subject || !payload.message || !payload.user_id) {
      throw new Error('subject, message and user_id are required');
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        subject: payload.subject,
        message: payload.message,
        user_id: payload.user_id,
        order_id: payload.order_id,
        status: 'open',
      })
      .select()
      .maybeSingle();
    if (error) {
      throw error;
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: payload.user_id,
      title: 'Support Quickly',
      message: 'Votre ticket a été reçu, nous revenons vers vous rapidement.',
      type: 'system',
      link: ticket?.id ?? null,
    });

    return new Response(JSON.stringify({ success: true, ticket }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[support-ticket] error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
