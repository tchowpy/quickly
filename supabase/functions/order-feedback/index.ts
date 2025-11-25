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
      const body = await req.json();

      const {
        order_id,
        actor_id,       // l’utilisateur qui effectue le feedback
        actor_role,     // "client", "provider", "courier"

        // Champs potentiels (seul une partie est autorisée selon rôle)
        product_rating,
        courier_rating,
        client_rating,
        feedback_on_client,
        feedback_on_provider,
        feedback_on_courier,
      } = body;

      // ---------------------------------------------------------
      // VALIDATION DE BASE
      // ---------------------------------------------------------
      if (!order_id || !actor_id || !actor_role) {
        return new Response(
          JSON.stringify({ error: "order_id, actor_id et actor_role sont requis." }),
          { status: 400 }
        );
      }

      // ---------------------------------------------------------
      // RÉCUPÈRE LE FEEDBACK EXISTANT
      // ---------------------------------------------------------
      const { data: existingFeedback } = await supabaseAdmin
        .from("order_feedbacks")
        .select("*")
        .eq("order_id", order_id)
        .maybeSingle();

      // ---------------------------------------------------------
      // DÉTERMINE LES CHAMPS AUTORISÉS SELON LE RÔLE
      // ---------------------------------------------------------
      const updatePayload: any = {};

      if (actor_role === "client") {
        if (product_rating) updatePayload.product_rating = product_rating;
        if (courier_rating) updatePayload.courier_rating = courier_rating;
        if (feedback_on_provider) updatePayload.feedback_on_provider = feedback_on_provider;
        if (feedback_on_courier) updatePayload.feedback_on_courier = feedback_on_courier;
        updatePayload.client_id = actor_id;
      }

      if (actor_role === "provider") {
        if (client_rating) updatePayload.client_rating = client_rating;
        if (feedback_on_client) updatePayload.feedback_on_client = feedback_on_client;
        updatePayload.provider_id = actor_id;
      }

      if (actor_role === "courier") {
        if (client_rating) updatePayload.client_rating = client_rating;
        if (feedback_on_client) updatePayload.feedback_on_client = feedback_on_client;
      }

      // Vérifie que le rôle tente de modifier au moins un champ autorisé
      if (Object.keys(updatePayload).length === 0) {
        return new Response(
          JSON.stringify({
            error: "Aucun champ modifiable pour ce rôle."
          }),
          { status: 403 }
        );
      }

      // ---------------------------------------------------------
      // CAS 1 : LE FEEDBACK N’EXISTE PAS → CRÉATION
      // ---------------------------------------------------------
      if (!existingFeedback) {
        const { data, error } = await supabaseAdmin
          .from("order_feedbacks")
          .insert({
            order_id,
            ...updatePayload,
          })
          .select()
          .single();

        if (error)
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        await updateRatings(supabaseAdmin, data);
        return new Response(JSON.stringify({ created: true, feedback: data }), {
          status: 200,
        });
      }

      // ---------------------------------------------------------
      // CAS 2 : FEEDBACK EXISTANT → MISE À JOUR PARTIELLE
      // ---------------------------------------------------------
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("order_feedbacks")
        .update(updatePayload)
        .eq("order_id", order_id)
        .select()
        .single();

      if (updateError)
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
        });

      // recalcul rating
      await updateRatings(supabaseAdmin, updated);

      return new Response(JSON.stringify({ updated: true, feedback: updated }), {
        status: 200,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});

// ---------------------------------------------------------
// MISE À JOUR AUTOMATIQUE DES RATINGS DES UTILISATEURS
// ---------------------------------------------------------
async function updateRatings(supabase: any, fb: any) {
  if (fb.product_rating && fb.provider_id) {
    await supabase.rpc("update_user_average_rating", {
      target_user_id: fb.provider_id,
    });
  }

  if (fb.courier_rating && fb.courier_id) {
    await supabase.rpc("update_user_average_rating", {
      target_user_id: fb.courier_id,
    });
  }

  if (fb.client_rating && fb.client_id) {
    await supabase.rpc("update_user_average_rating", {
      target_user_id: fb.client_id,
    });
  }
}
