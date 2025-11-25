// supabase/functions/assign-delivery/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';
import { sendSmsMtnCi } from '../_shared/sms/sendSmsMtnCi.ts';
import { isValidPhone, normalizePhone, removeAccents } from '../_shared/utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const OTP_TTL_MINUTES = Number(Deno.env.get('OTP_TTL_MINUTES') ?? '5');
const BRAND_NAME = Deno.env.get('OTP_BRAND_NAME') ?? 'Quickly';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, provider_id, courier_phone } = await req.json();

    if (!order_id || !provider_id || !courier_phone) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    if (typeof courier_phone !== 'string') {
      return jsonResponse({ error: 'Numéro de téléphone invalide.' }, 400);
    }

    const normalizedPhone = normalizePhone(courier_phone);
    if (!isValidPhone(normalizedPhone)) {
        return jsonResponse({ error: 'Format de numéro non supporté.' }, 400);
    }

    // ----------------------------------------------
    // 1. Récupérer l’ordre
    // ----------------------------------------------
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, provider_id, provider:users!provider_id(*), client:users!client_id(*), product_name, quantity, latitude, longitude")
      .eq("id", order_id)
      .eq("status","in_preparation")
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
      });
    }

    // ----------------------------------------------
    // 1. Vérifier qu'aucune assignation ou demande de livraison n'a encore été éffectuée
    // ----------------------------------------------
    
    await supabaseAdmin.from('delivery_tracking').delete().eq('order_id', order_id).eq('status','pending');

    const { data: tracking, error: trErr } = await supabaseAdmin
      .from("delivery_tracking")
      .select("*, order:orders!order_id(*)")
      .eq("order_id", order_id)
      .in("status", ["assigned","retrieved","in_transit","at_destination","delivered","failed"])
      .single();

    if (trErr?.code !== "PGRST116" || tracking) {
      return new Response(JSON.stringify({ error: 'Already processed' }), { status: 404 });
    }

    // ----------------------------------------------
    // 2. Vérifier si le livreur existe comme user Quickly
    // ----------------------------------------------
    const { data: courierUser } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", courier_phone)
      .eq("role", 'client')
      .maybeSingle();

    const courier_id = courierUser?.id ? courierUser.auth_user_id === order.provider.auth_user_id ? order.provider.id : courierUser?.id : null;

    if (courier_id === order.client.id){
        return new Response(JSON.stringify({ error: "Impossible d'assigner la livraison au client ayant passé la commande." }), { status: 404 });
    }

    // ----------------------------------------------
    // CALCUL DISTANCE (si provider position en DB)
    // ----------------------------------------------
    let distance_km = 0;

    if (order.provider?.latitude && order.provider?.longitude) {
      const rad = (x: number) => (x * Math.PI) / 180;

      const R = 6371;
      const dLat = rad(order.latitude - order.provider.latitude);
      const dLng = rad(order.longitude - order.provider.longitude);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(order.provider.latitude)) *
          Math.cos(rad(order.latitude)) *
          Math.sin(dLng / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance_km = Number((R * c).toFixed(2));
    }

    // ----------------------------------------------
    // SCÉNARIO 1 : Le prestataire = le livreur
    // ----------------------------------------------
    if (courier_id === provider_id) {

      const { data: event, error: insertError } = await supabaseAdmin
      .from('order_status_events')
      .insert({
        order_id: order_id,
        status: "assigned",
        note: "La commande a été assignée",
        metadata: {
          assigned_to: courier_id,
          courier_phone
        },
      })
      .select()
      .maybeSingle();

      if (insertError) {
        throw insertError;
      }

      // ➤ Mettre ordre = assigned
      await supabaseAdmin
        .from("orders")
        .update({
          status: "assigned",
          delivery_id: courier_id,
        })
        .eq("id", order_id);

      // ➤ Insérer tracking
      await supabaseAdmin.from("delivery_tracking").insert({
        order_id,
        assigned_to: courier_id,
        phone: courier_phone,
        distance_km,
        status: "assigned",
        start_time: new Date(),
      });

      const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: {
          event: "status_update",
          order_id: order_id,
          status: "assigned",
          assigned_to: courier_id,
          note: "La commande a été assignée",
        },
        event: "status_update",
        topic: `order_${order_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[assign-delivery] broadcast delivery_request error for user ', courier_id, statusResult.error);
      }

      return new Response(
        JSON.stringify({ success: true, scenario: 1 }),
        { status: 200 }
      );
    }

    // ----------------------------------------------
    // SCÉNARIO 2 : Le livreur existe déjà sur Quickly
    // ----------------------------------------------
    if (courier_id && courier_id !== provider_id) {
      await supabaseAdmin.from("delivery_tracking").insert({
        order_id,
        assigned_to: courier_id,
        phone: courier_phone,
        distance_km,
        status: "pending",
      });

      // ➤ Notification realtime
      const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: {
          event: "delivery_request",
          order_id: order_id,
          status: "pending",
          note: "Nouvelle demande de livraison",
        },
        event: "delivery_request",
        topic: `user_${courier_id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[assign-delivery] broadcast delivery_request error for user ', courier_id, statusResult.error);
      }

      // ➤ SMS AU LIVREUR (à intégrer)
      const message = removeAccents(`${BRAND_NAME}: Vous avez une demande de livraison en attente. Ouvrez l'application pour accepter.`);
    const smsResult = await sendSmsMtnCi([normalizedPhone], message);

    if (!smsResult.success) {
        return jsonResponse({ error: "L'envoi du SMS a échoué." }, 502);
    }
      return new Response(
        JSON.stringify({ success: true, scenario: 2 }),
        { status: 200 }
      );
    }

    // ----------------------------------------------
    // SCÉNARIO 3 : Le livreur n’a PAS encore de compte Quickly
    // ----------------------------------------------

    await supabaseAdmin.from("delivery_tracking").insert({
      order_id,
      assigned_to: null,
      phone: courier_phone,
      distance_km,
      status: "pending",
    });

    // ➤ SMS invitation
    const message = removeAccents(`${BRAND_NAME}: Une livraison vous attend. Téléchargez l'application Quickly pour l'accepter : https://quickly.app/download`);
    const smsResult = await sendSmsMtnCi([normalizedPhone], message);

    if (!smsResult.success) {
        return jsonResponse({ error: "L'envoi du SMS a échoué." }, 502);
    }

    return new Response(
      JSON.stringify({ success: true, scenario: 3 }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Delivery assign error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

