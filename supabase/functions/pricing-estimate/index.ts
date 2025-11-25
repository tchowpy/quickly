import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabaseClient.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PricingPayload = {
  product_id: string;
  unit_price?: number;
  quantity: number;
  provider_location?: {
    latitude?: number;
    longitude?: number;
  };
  client_location?: {
    latitude?: number;
    longitude?: number;
  };
};

type PricingEstimate = {
  product_price: number;
  service_fee: number;
  delivery_fee: number;
  delivery_fee_min: number;
  delivery_fee_max: number;
  total_amount: number;
  distance_km: number;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as PricingPayload;
    if (!payload?.product_id || !payload?.quantity) {
      throw new Error('Missing product_id or quantity');
    }

    const unitPrice = payload.unit_price ?? (await fetchProductPrice(payload.product_id));
    const productPrice = unitPrice * payload.quantity;
    const distanceKm = await estimateDistanceKm(payload.provider_location, payload.client_location);
    const deliveryFee = Math.max(distanceKm, 1) * 500;
    const serviceFee = computeServiceFee(productPrice);

    const deliveryFeeMin = !payload.provider_location ? distanceKm * 150 : deliveryFee;
    const deliveryFeeMax = !payload.provider_location ? distanceKm * 200 : deliveryFee;
    
    const response: PricingEstimate = {
      product_price: productPrice,
      service_fee: serviceFee,
      delivery_fee: deliveryFee,
      delivery_fee_min: deliveryFeeMin,
      delivery_fee_max: deliveryFeeMax,
      total_amount: productPrice + serviceFee + deliveryFee,
      distance_km: distanceKm,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[pricing-estimate] error', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

async function fetchProductPrice(productId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('price_regulated, base_price')
    .eq('id', productId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error('Product not found');
  }
  return Number(data.price_regulated ?? data.base_price ?? 0);
}

async function estimateDistanceKm(
  providerLocation?: { latitude?: number; longitude?: number },
  clientLocation?: { latitude?: number; longitude?: number },
): Promise<number> {
  if (!clientLocation?.latitude || !clientLocation?.longitude) {
    return 10;
  }
  if (!providerLocation?.latitude || !providerLocation?.longitude) {
    return 10;
  }

  return haversine(
    clientLocation.latitude,
    clientLocation.longitude,
    providerLocation.latitude,
    providerLocation.longitude,
  );
}

function computeServiceFee(total: number): number {
  if (total <= 5000) {
    return 200;
  }
  if (total <= 10000) {
    return 400;
  }
  return 700;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(Number((R * c).toFixed(2)), 1);
}
