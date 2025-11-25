import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type BroadcastPayload = {
  order_id: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as BroadcastPayload;
    if (!body?.order_id) {
      throw new Error('order_id is required');
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, client_id, product_id, product_name, quantity, total_amount, service_fee, delivery_fee, latitude, longitude, status, created_at',
      )
      .eq('id', body.order_id)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!order) {
      throw new Error('Order not found');
    }

    const result = supabaseAdmin.rpc("broadcast_from_db", {
      topic: `orders_feed`,
      event_name: 'new_order',
      payload: order,
    });
    
    if (result.error) {
      throw result.error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[orders-broadcast] error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
