import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Durée max (en minutes) avant expiration
const EXPIRATION_MINUTES = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const deadline = new Date(now.getTime() - EXPIRATION_MINUTES * 60000).toISOString();

    // -------------------------------------------------------------------
    // 1️⃣ Récupérer les ordres expirés
    // -------------------------------------------------------------------
    const { data: expiredOrders, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, status, created_at")
      .in("status", ["created", "pending_broadcast", "broadcasted"])
      .lt("created_at", deadline);

    if (fetchErr) throw fetchErr;

    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------------------------------------------------------------------
    // 2️⃣ Mettre à jour les statuts
    // -------------------------------------------------------------------
    const { error: updateErr } = await supabaseAdmin
      .from("orders")
      .update({
        status: "expired",
        canceled_at: new Date().toISOString(),
      })
      .in("id", expiredOrders.map((o) => o.id));

    if (updateErr) throw updateErr;

    // -------------------------------------------------------------------
    // 3️⃣ Ajouter un événement dans order_status_events
    // -------------------------------------------------------------------
    const events = expiredOrders.map((o) => ({
      order_id: o.id,
      status: "expired",
      note: "Commande expirée automatiquement",
      metadata: { reason: "timeout", expired_after_minutes: EXPIRATION_MINUTES },
    }));

    const { error: evtErr } = await supabaseAdmin
      .from("order_status_events")
      .insert(events);

    if (evtErr) throw evtErr;

    // -------------------------------------------------------------------
    // 4️⃣ Envoyer un realtime broadcast pour chaque ordre expiré
    // -------------------------------------------------------------------
    for (const o of expiredOrders) {
      const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
        payload: {
          //event: "status_update",
          order_id: o.id,
          status: "expired",
          note: "Commande expirée automatiquement",
        },
        event: "status_update",
        topic: `order_${o.id}`,
        //private: false,
      });

      if (statusResult.error) {
        console.error('[expire-orders] broadcast status error on order ', o.id, statusResult.error);
      }
    }

    return new Response(
      JSON.stringify({
        expired: expiredOrders.length,
        order_ids: expiredOrders.map((o) => o.id),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (err) {
    console.error("[expire-orders] error", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
