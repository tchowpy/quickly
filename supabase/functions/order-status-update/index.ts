import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type StatusPayload = {
  order_id: string;
  status: string;
  note?: string;
  metadata?: Record<string, unknown>;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as StatusPayload;
    if (!payload?.order_id || !payload?.status) {
      throw new Error('order_id and status are required');
    }

    if (payload.status === 'confirmed') {
      if (!payload.metadata || typeof payload.metadata !== 'object') {
        throw new Error('metadata is required when status is confirmed');
      }
      if (!payload.metadata?.provider_id || !payload.metadata?.delivery_fee || !payload.metadata?.total_amount) {
        throw new Error('provider_id, delivery_fee and total_amount are required in metadata when status is confirmed');
      }
    }

    const { data: event, error: insertError } = await supabaseAdmin
      .from('order_status_events')
      .insert({
        order_id: payload.order_id,
        status: payload.status,
        note: payload.note,
        metadata: payload.metadata,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      throw insertError;
    }

    const updatePayload: Record<string, unknown> = payload.status === 'confirmed' ? { status: payload.status, provider_id: payload.metadata?.provider_id, delivery_fee: payload.metadata?.delivery_fee, total_amount: payload.metadata?.total_amount } : { status: payload.status };
    if (payload.location?.latitude && payload.location?.longitude) {
      updatePayload.latitude = payload.location.latitude;
      updatePayload.longitude = payload.location.longitude;
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', payload.order_id);
    if (updateError) {
      throw updateError;
    }

    const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
      payload: event,
      event_name: "status_update",
      topic: `order_${payload.order_id}`
    });

    if (statusResult.error) {
      console.error('[order-status-update] broadcast status error', statusResult.error);
    }

    if (payload.location?.latitude && payload.location?.longitude) {
      const locationResult = await supabaseAdmin.rpc("broadcast_from_db", {
        topic: `order_${payload.order_id}`,
        event_name: 'location_update',
        payload: payload.location,
      });
      if (locationResult.error) {
        console.error('[order-status-update] broadcast location error', locationResult.error);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[order-status-update] error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
