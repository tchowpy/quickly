// supabase/functions/delivery-reject/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { tracking_id, order_id, courier_id, reason } = await req.json();

    if (!tracking_id || !order_id || !courier_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    // ---------------------------------------
    // 1. Charger tracking
    // ---------------------------------------
    const { data: tracking, error: trErr } = await supabaseAdmin
      .from("delivery_tracking")
      .select("*, order:orders!order_id(*)")
      .eq("id", tracking_id)
      .single();

    if (trErr || !tracking) {
      return new Response(JSON.stringify({ error: "Tracking not found" }), { status: 404 });
    }

    if (tracking.status !== "pending") {
      return new Response(JSON.stringify({ error: "Already processed" }), { status: 409 });
    }

    // ---------------------------------------
    // 2. Mettre en "rejected"
    // ---------------------------------------
    const {data, error } = await supabaseAdmin
      .from("delivery_tracking")
      .update({
        status: "rejected",
        note: reason ?? "Refus par le livreur",
      })
      .eq("id", tracking_id);

    if (error) {
      return new Response(JSON.stringify({ error: error }), { status: 404 });
    }
    // ---------------------------------------
    // 3. Order repasse en "in_preparation"
    // ---------------------------------------
    await supabaseAdmin
      .from("orders")
      .update({ status: "in_preparation" })
      .eq("id", order_id);

    // ---------------------------------------
    // 4. Realtime → client + prestataire
    // ---------------------------------------
    const eventPayload = {
      order_id,
      tracking_id,
      courier_id,
      status: "rejected",
      reason,
      message: "Le livreur a refusé la mission.",
    };

    await realtimeNotifyStatusDeliveryTracking(tracking_id, eventPayload)

    // ---------------------------------------
    // 5. SMS
    // ---------------------------------------
    await sendSMS(
      tracking.phone,
      "Quickly : Le livreur a refusé la livraison. Nous cherchons un nouveau livreur."
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("delivery-reject error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// Fake SMS — à remplacer Twilio / HubSMS CI
async function sendSMS(phone: string, message: string) {
  console.log(`📩 SMS to ${phone}: ${message}`);
}

async function realtimeNotifyStatusDeliveryTracking(tracking_id: string, payload: any) {
  const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: payload,
        event: "status_update",
        topic: `tracking_${tracking_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[delivery-reject] broadcast status_update error for delivery_tracking.id ', tracking_id, statusResult.error);
      }
}