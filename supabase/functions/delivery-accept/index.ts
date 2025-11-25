// supabase/functions/delivery-accept/index.ts

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
    const { tracking_id, order_id, courier_id, latitude, longitude } = await req.json();

    if (!tracking_id || !order_id || !courier_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    // ---------------------------------------
    // 1. Vérifier tracking actuel
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
    // 2. Le livreur accepte la mission
    // ---------------------------------------
    await supabaseAdmin
      .from("delivery_tracking")
      .update({
        status: "assigned",
        assigned_to: courier_id,
        latitude: latitude,
        longitude: longitude,
        start_time: new Date(),
      })
      .eq("id", tracking_id);

    // ---------------------------------------
    // 3. Mise à jour order
    // ---------------------------------------
    await supabaseAdmin
      .from("orders")
      .update({ status: "assigned", delivery_id: courier_id })
      .eq("id", order_id);

    // ---------------------------------------
    // 4. Realtime → client + prestataire + livreur
    // ---------------------------------------
    const eventPayload = {
      order_id,
      tracking_id,
      courier_id,
      status: "assigned",
      message: "Le livreur a accepté la livraison.",
    };

    await realtimeNotifyStatusDeliveryTracking(tracking_id,  eventPayload);

    await realtimeNotifyStatusDeliveryTracking(tracking_id,  eventPayload);

    // ---------------------------------------
    // 5. SMS facultatif
    // ---------------------------------------
    await sendSMS(
      tracking.phone,
      "Quickly : Un livreur a accepté de prendre votre commande en charge."
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("delivery-accept error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function realtimeNotifyStatusDeliveryTracking(tracking_id: string, payload: any) {
  const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: payload,
        event: "status_update",
        topic: `tracking_${tracking_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[delivery-accept] broadcast status_update error for delivery_tracking.id ', tracking_id, statusResult.error);
      }
}

async function realtimeNotifyStatusOrder(order_id: string, payload: any) {
  const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: payload,
        event: "status_update",
        topic: `order_${order_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[delivery-accept] broadcast status_update error for order.id ', order_id, statusResult.error);
      }
}


// Fake SMS — à remplacer Twilio / HubSMS CI
async function sendSMS(phone: string, message: string) {
  console.log(`📩 SMS to ${phone}: ${message}`);
}
