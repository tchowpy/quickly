import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const { order_id, provider_id, longitude, latitude, location_address } = payload;

    if (!order_id || !provider_id || !longitude || !latitude || !location_address) {
      throw new Error("order_id, provider_id , longitude, latitude and location_address are required");
    }

    // ---------------------------------------------------------
    // 1️⃣ Vérifier si l’ordre existe et est encore “searching”
    // ---------------------------------------------------------
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) throw new Error("Order not found");

    if (order.status !== "broadcasted") {
      throw new Error("Cet ordre n'est plus disponible");
    }

    // ---------------------------------------------------------
    // 2️⃣ Vérifier si ce prestataire n’a pas déjà accepté
    // ---------------------------------------------------------
    const { data: existing, error: checkErr } = await supabaseAdmin
      .from("order_accepts")
      .select("id")
      .eq("order_id", order_id)
      .eq("provider_id", provider_id)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      throw new Error("Vous avez déjà accepté cet ordre");
    }

    // ---------------------------------------------------------
    // 3️⃣ Enregistrer l’acceptation
    // ---------------------------------------------------------
    const { error: insertErr } = await supabaseAdmin
      .from("order_accepts")
      .insert({
        order_id,
        provider_id,
        longitude,
        latitude,
        location_address,
      });

    if (insertErr) throw insertErr;

    // ---------------------------------------------------------
    // 4️⃣ Enregistrer un évènement status = “accepted”
    // (tu pourras filtrer côté client)
    // ---------------------------------------------------------
    const statusResult = await supabaseAdmin.rpc("broadcast_from_db", {
      payload: {
        order_id,
        provider_id,
        longitude,
        latitude,
        location_address,
        status: "accepted",
        note: "Prestataire intéressé",
      },
      event: "order_accepted",
      topic: `order_${order_id}`
    });
    if (statusResult.error) {
      console.error('[accept-order] broadcast accepted error', statusResult.error);
    }

    // ---------------------------------------------------------
    // 6️⃣ ❇️ Renvoi final
    // ---------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        message: "Ordre accepté",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );

  } catch (err) {
    console.error("[accept-order] error", err);

    return new Response(
      JSON.stringify({ error: err.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
