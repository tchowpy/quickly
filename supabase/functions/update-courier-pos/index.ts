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
      courier_id,
      latitude,
      longitude
    } = await req.json();

    if (!courier_id || !latitude || !longitude) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }
    // ----------------------------------------------
    // 2. Préparer la mise à jour
    // ----------------------------------------------
    const updatePayload: any = {
      latitude,
      longitude,
      updated_at: new Date(),
    };

    // ----------------------------------------------
    // 3. Mise à jour de delivery_tracking
    // ----------------------------------------------
    const {error} = await supabaseAdmin
      .from("delivery_tracking")
      .update(updatePayload)
      .eq("assigned_to", courier_id);

    if (error) {
      return new Response(JSON.stringify({ error: error }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });

  } catch (error) {
    console.error("update-courier-pos error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});

