// supabase/functions/delivery-status-update/index.ts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
      if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
      }

  try {
    const {
      order_id,
      tracking_id,
      status,               // 'pending','rejected','assigned','retrieved','in_transit','at_destination','delivered','failed'
      note,
      latitude,
      longitude,
      proof_url
    } = await req.json();

    if (!order_id || !tracking_id || !status) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    // ----------------------------------------------
    // 1. Récupérer la ligne delivery_tracking
    // ----------------------------------------------
    const { data: tracking, error: trErr } = await supabaseAdmin
    .from("delivery_tracking")
    .select(`
        *,
        order:orders!order_id (
            *,
            client:users!client_id(*)
        ),
        assigned_user:users!assigned_to(*)
    `)
    .eq("id", tracking_id)
    .not("status", "in", "(rejected,delivered,failed)")
    .single();
    
    if (trErr || !tracking) {
      console.error("[delivery-status-update] trErr ",trErr)
      return new Response(JSON.stringify({ error: "Tracking not found" }), {
        status: 404,
      });
    }

    const previousStatus = tracking.status;

    // ----------------------------------------------
    // 2. Préparer la mise à jour
    // ----------------------------------------------
    const updatePayload: any = {
      status,
      updated_at: new Date(),
    };

    if (latitude && longitude) {
      updatePayload.latitude = latitude;
      updatePayload.longitude = longitude;
    }
    if (note) updatePayload.note = note;
    if (proof_url) updatePayload.proof_url = proof_url;

    // ----------------------------------------------
    // 3. Mise à jour de delivery_tracking
    // ----------------------------------------------
    await supabaseAdmin
      .from("delivery_tracking")
      .update(updatePayload)
      .eq("id", tracking_id);

    const message = {
      order_id,
      tracking_id,
      previous_status: previousStatus,
      new_status: status,
      latitude,
      longitude,
      note,
      proof_url
    };

    // ----------------------------------------------
    // 4. Mise à jour éventuelle orders.status
    // ----------------------------------------------
    let payload = {};
    if (status === "in_transit") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "in_delivery" })
        .eq("id", order_id);

        payload = {
            order_id: order_id,
            status: "in_delivery" ,
            note: "Commande en cours de livraison",
            metadata: message
        }
    }

    if (status === "delivered") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", order_id);

        payload = {
            order_id: order_id,
            status ,
            note: "Commande livrée",
            metadata: message
        }
    }

    if (status === "failed") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order_id);
 
        payload = {
            order_id: order_id,
            status: "cancelled" ,
            note: "Livraison annulée par le livreur",
            metadata: message
        }
    }

    if (payload?.status){
    const { data: event, error: insertError } = await supabaseAdmin
      .from('order_status_events')
      .insert(payload)
      .select()
      .maybeSingle();

      if (insertError) {
        throw insertError;
      }

    const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: message,
        event: "status_update",
        topic: `order_${order_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[delivery-status-update] broadcast status_update error for order.id ', order_id, statusResult.error);
      }

    }

    // ----------------------------------------------
    // 5. Notifs realtime (clients + prestataire + livreur)
    // ----------------------------------------------

    const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: message,
        event: "status_update",
        topic: `tracking_${tracking_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[delivery-status-update] broadcast status_update error for delivery_tracking.id ', tracking_id, statusResult.error);
      }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });

  } catch (error) {
    console.error("delivery-status-update error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

