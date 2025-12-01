import { useCallback } from "react";
import { Alert } from "react-native";
import { supabase, } from "../lib/supabase";
import { useOrderStore } from "../store/orderStore";
import { OrderStatusEvent, OrderSummary, TrackingSummary } from "../types/models";
import { useSupabaseAuth } from "./useSupabaseAuth";
import { parseSupabaseFunctionError } from "utils/supabase";

export function useOrders() {
  const { profile } = useSupabaseAuth();
  const {
    setHistory,
    setTrackingHistory,
    setActiveOrder,
    addStatusEvent,
    updateStatusEvents,
    clearActiveOrder,
  } = useOrderStore();

    // -------------------------------------------------------------
  // FETCH ORDERS
  // -------------------------------------------------------------
 const fetchOrders = useCallback(async () => {
  if (!profile?.id) return;

  // 1. GET ALL ORDERS NON EXPIRÉES/ANNULÉES
  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      *,
      provider:users!provider_id(*),
      courier:users!delivery_id(*)
    `)
    .eq("client_id", profile.id)
    .neq("status", "expired")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error || !orders) return;

  // 2. GET TRACKING ENTRIES
  const { data: tracking } = await supabase
    .from("delivery_tracking")
    .select("*")
    .in("order_id", orders.map((o) => o.id));

  const trackingMap = new Map();
  tracking?.forEach((t) => trackingMap.set(t.order_id, t));

  // 2. GET FEEDBACKS ENTRIES
  const { data: feedback } = await supabase
    .from("order_feedbacks")
    .select("*")
    .in("order_id", orders.map((o) => o.id));

  const feedbackMap = new Map();
  feedback?.forEach((t) => feedbackMap.set(t.order_id, t));
  // 3. MERGE ORDER + TRACKING
  const mapped: OrderSummary[] = orders.map((o) => {

    const t = trackingMap.get(o.id);
    const f = feedbackMap.get(o.id);

    return {
      id: o.id,
      product_id: o.product_id,
      product_name: o.product_name,
      quantity: o.quantity,
      unit_price: Number(o.unit_price ?? 0),
      total_price: Number(o.total_price ?? o.total_amount ?? 0),
      service_fee: Number(o.service_fee ?? 0),
      delivery_fee: Number(o.delivery_fee ?? 0),
      total_amount: Number(o.total_amount ?? 0),
      payment_mode: o.payment_mode,
      status: o.status,
      created_at: o.created_at,

      // position client
      latitude: o.latitude,
      longitude: o.longitude,
      location_address: o.location_address,
      
      tracking: t,
      feedback: f,

      // tracking livreur
      courier_latitude: t?.latitude ?? null,
      courier_longitude: t?.longitude ?? null,
      courier_location_address: t?.address ?? null,

      provider_id: o.provider_id,

      provider: o.provider,
      courier: o.courier
    };
  });

  // 4. STOCKER L'HISTORIQUE
  setHistory(mapped);

  // 5. DÉTERMINER LA COMMANDE ACTIVE
  const active = mapped.find((o) =>
    [
      // search
      'created',
      'pending_broadcast',
      'broadcasted',
      'accepted',

      // tracking
      'confirmed',
      'in_preparation',
      'assigned',
      'in_delivery',
      'delivered'
    ].includes(o.status)
  );

  if (active) {
    setActiveOrder(active);

    const { data: statusRows } = await supabase
      .from("order_status_events")
      .select("*")
      .eq("order_id", active.id)
      .order("created_at", { ascending: true });

    if (statusRows) {
      updateStatusEvents(statusRows as OrderStatusEvent[]);
    }
  } else {clearActiveOrder()}
}, [profile?.id, setActiveOrder, setHistory, updateStatusEvents]);

    // -------------------------------------------------------------
  // FETCH TRACKINGS
  // -------------------------------------------------------------
 const fetchTrackings = useCallback(async () => {
  if (!profile?.phone) return;

  // 1. GET ALL ORDERS NON EXPIRÉES/ANNULÉES
  const { data: trackings, error } = await supabase
    .from("delivery_tracking")
    .select(`
      *,
      user:users!assigned_to(*),
      order:orders!order_id(
      *,
      provider:users!provider_id(*),
      client:users!client_id(*)
      )
    `)
    .eq("phone", profile.phone)
    .neq("status", "rejected")
    .order("created_at", { ascending: false });

  if (error || !trackings) return;

  // 3. MERGE ORDER + TRACKING
  const mapped: TrackingSummary[] = trackings;

  // 4. STOCKER L'HISTORIQUE
  setTrackingHistory(mapped);

}, [profile?.phone, setTrackingHistory]);

  // -------------------------------------------------------------
  // FETCH ACCEPTING PROVIDERS
  // -------------------------------------------------------------
    const fetchOrderAccepts = useCallback(async (orderId: string) => {
      const { data, error } = await supabase
        .from("order_accepts")
        .select(`*, user:users!provider_id(*)`)
        .eq("order_id", orderId);

      if (error) {
        console.error("[Orders] fetchOrderAccepts error", error.message);
        return [];
      }

      return data ?? [];
    }, []);

  // -------------------------------------------------------------
  // CONFIRM RECEPTION
  // -------------------------------------------------------------
  const confirmReception = useCallback(
    async (orderId: string) => {
      try {
        /*const { error: rpcError } = await supabase.rpc(
          "process_order_commission",
          { order_ref: orderId }
        );
        if (rpcError) {
          console.error("[Orders] confirmReception rpc error", rpcError);
        }*/

        const { error } =  await supabase.functions.invoke("order-status-update", {
          body: {
              order_id: orderId,
              status: "completed",
              note: "Commande terminée",
              metadata: { },
          },
        });

        if (error) throw error

        setActiveOrder(null);
        await fetchOrders();

        Alert.alert("Merci ✨", "Commande Terminée. Votre prestataire est notifié.");
      } catch (error) {
        console.error("[Orders] confirmReception error", error);
        Alert.alert(
          "Confirmation",
          "Impossible de confirmer la réception pour le moment."
        );
      }
    },
    [fetchOrders, setActiveOrder]
  );

  // -------------------------------------------------------------
  // REPORT ISSUE
  // -------------------------------------------------------------
  const reportIssue = useCallback(
    async (orderId: string, clientId: string, providerId: string, reason: string, details: string) => {
      try {
        
        const updatePayload = {
          client_id: clientId,
          provider_id: providerId,
          reason: reason,
          details: details,
          status: 'pending'
        }
        const { data, error: err } = await supabase
          .from("delivery_disputes")
          .insert({
            order_id: orderId,
            ...updatePayload,
          })
          .select()
          .single();

        if (err) throw err;

        const { error } = await supabase
          .from("orders")
          .update({ status: "disputed" })
          .eq("id", orderId);

        if (error) throw error;

        addStatusEvent({
          id: `local-${Math.random().toString(36).slice(2)}`,
          order_id: orderId,
          status: "disputed",
          note: reason,
          created_at: new Date().toISOString(),
        });

      } catch (error) {
        console.error("[Orders] reportIssue error", error);
        Alert.alert("Support", "Impossible de signaler le problème.");
      }
    },
    [addStatusEvent]
  );

   // -------------------------------------------------------------
  // CONFIRM RECEPTION
  // -------------------------------------------------------------
  const orderClientFeedBack = useCallback(
    async (orderId: string, clientId: string, product_rating: number, courier_rating: number, feedback_on_provider: string, feedback_on_courier: string) => {
      try {

        const { error } =  await supabase.functions.invoke("order-feedback", {
          body: {
              order_id: orderId,
              actor_id: clientId,
              actor_role: 'client',
              product_rating,
              courier_rating,
              feedback_on_provider,
              feedback_on_courier
          },
        });

        if (error) throw error

      } catch (error) {
        console.error("[Orders] orderClientFeedBack error", error);
      }
    },
    []
  );

  // -------------------------------------------------------------
  // CANCEL ORDER (MANUELLE OU AUTO)
  // -------------------------------------------------------------
const cancelOrder = useCallback(
  async (orderId: string, message?: string) => {
    try {
      // 1️⃣ Mise à jour via l'Edge Function officielle
      const { data, error } = await supabase.functions.invoke(
        "order-status-update",
        {
          body: {
            order_id: orderId,
            status: "cancelled",
            note: "Annulation automatique ou par client",
          },
        }
      );

      if (error) {
        console.error("[cancelOrder] edge function error:", error);
        throw new Error("Edge function failed");
      }

      // 2️⃣ Réinitialisation de l’ordre actif en local
      clearActiveOrder();

      // 3️⃣ Rechargement de l’historique local
      await fetchOrders();

      // 4️⃣ Message utilisateur
      if (message) {
        Alert.alert("Commande annulée", message);
      }
    } catch (e) {
      console.error("[Orders] cancelOrder error", e);
      Alert.alert("Erreur", "Impossible d'annuler la commande.");
    }
  },
  [clearActiveOrder, fetchOrders]
);

  // -------------------------------------------------------------
  // CANCEL ORDER (MANUELLE OU AUTO)
  // -------------------------------------------------------------
const setAcceptOrder = useCallback(
  async (orderId: string, message?: string) => {
    try {
      // 1️⃣ Mise à jour via l'Edge Function officielle
      const { data, error } = await supabase.functions.invoke(
        "order-status-update",
        {
          body: {
            order_id: orderId,
            status: "accepted",
            note: "Recherche stoppée par le client",
          },
        }
      );

      if (error) {
        console.error("[setAcceptOrder] edge function error:", error);
        throw new Error("Edge function failed");
      }

      // 3️⃣ Rechargement de l’historique local
      await fetchOrders();

    } catch (e) {
      console.error("[Orders] setAcceptOrder error", e);
      Alert.alert("Erreur", "Impossible d'annuler la commande.");
    }
  },
  [fetchOrders]
);

const expireOrder = useCallback(
  async (orderId: string, message?: string) => {
    try {
      // 1️⃣ Mise à jour via l'Edge Function officielle
      const { data, error } = await supabase.functions.invoke(
        "order-status-update",
        {
          body: {
            order_id: orderId,
            status: "expired",
            note: "Expiration automatique",
          },
        }
      );

      if (error) {
        console.error("[expireOrder] edge function error:", error);
        throw new Error("Edge function failed");
      }

      // 2️⃣ Réinitialisation de l’ordre actif en local
      clearActiveOrder();

      // 3️⃣ Rechargement de l’historique local
      await fetchOrders();

    } catch (e) {
      console.error("[Orders] expireOrder error", e);
      Alert.alert("Erreur", "Impossible d'expirer la commande.");
    }
  },
  [clearActiveOrder, fetchOrders]
);

  // -------------------------------------------------------------
  // DELIVERY ACCEPT
  // -------------------------------------------------------------
const deliveryAccept = useCallback(
  async (orderId: string, trackingId: string, courierId: string, latitude: number, longitude: number) => {
    try {
      // 1️⃣ Mise à jour via l'Edge Function officielle
      const { data, error } = await supabase.functions.invoke(
        "delivery-accept",
        {
          body: {
            order_id: orderId,
            tracking_id: trackingId,
            courier_id: courierId,
            latitude,
            longitude
          },
        }
      );

      if (error) throw error;

      // 3️⃣ Rechargement de l’historique local
      await fetchTrackings();
      return {data};
    } catch (e) {
      const parsed = await parseSupabaseFunctionError(e);

      console.error("[Delivery] deliveryAccept error parsed", parsed);

      return {error: parsed.type === 'http' ? parsed.message : "Impossible d'accepter la demande de livraison."}
      //Alert.alert("Erreur", "Impossible de confirmer la demande de livraison.");
    }
  },
  [fetchTrackings]
);

  // -------------------------------------------------------------
  // DELIVERY REJECT
  // -------------------------------------------------------------
const deliveryReject = useCallback(
  async (orderId: string, trackingId: string, courierId: string, reason: string) => {
    try {
      // 1️⃣ Mise à jour via l'Edge Function officielle
      const { data, error } = await supabase.functions.invoke(
        "delivery-reject",
        {
          body: {
            order_id: orderId,
            tracking_id: trackingId,
            courier_id: courierId,
            reason
          },
        }
      );

      if (error) throw error;

      // 3️⃣ Rechargement de l’historique local
      await fetchTrackings();
      return {data};
    } catch (e) {
      const parsed = await parseSupabaseFunctionError(e);

      console.error("[Delivery] deliveryAccept error parsed", parsed);

      return {error: parsed.type === 'http' ? parsed.message : "Impossible d'accepter la demande de livraison."}

      //Alert.alert("Erreur", "Impossible de rejeter la demande de livraison");
    }
  },
  [fetchTrackings]
);

  // -------------------------------------------------------------
  // DELIVERY STATUS UPDATE
  // -------------------------------------------------------------
const deliveryStatusUpdate = useCallback(

  async (orderId: string, trackingId: string, status: string, note: string, latitude?: number, longitude?: number, proof_url?: string) => {
    try {
      console.log('deliveryStatusUpdate -- orderId', orderId);

      // 1️⃣ Mise à jour via l'Edge Function officielle
      const { data, error } = await supabase.functions.invoke(
        "delivery-status-update",
        {
          body: {
            order_id: orderId,
            tracking_id: trackingId,
            status: status,
            note,
            latitude,
            longitude,
            proof_url
          },
        }
      );

      if (error) throw error;

      // 3️⃣ Rechargement de l’historique local
      await fetchTrackings();
      return {data};
    } catch (e) {
      const parsed = await parseSupabaseFunctionError(e);

      console.error("[Delivery] deliveryStatusUpdate error parsed", parsed);

      return {error: parsed.type === 'http' ? parsed.message : "Impossible de mettre à jour le status la livraison"}

      //Alert.alert("Erreur", "Impossible de mettre à jour le status la livraison");
    }
  },
  [fetchTrackings]
);

  const setCourierPos = useCallback(
    async (courierId: string, latitude: number, longitude: number, address?: string) => {
      try {
        console.log('setCourierPos -- courierId ',courierId)
        const { data, error } = await supabase.functions.invoke(
          "update-courier-pos",
          {
            body: {
              courier_id:courierId,
              latitude,
              longitude
            },
          }
        );

        if (error) {
          console.error("[Orders] setCourierPos error", error);
          throw error;
        }

        console.log('setCourierPos -- Ok1')
      } catch (e) {
        console.error("[Orders] setCourierPos exception", e);
      }
    },
    []
  );

  const uploadDeliveryProof = useCallback(
    async (orderId: string, fileUri: string, fileName: string) => {
      try {
        // Récupération du fichier (exemple pour React Native)
        const response = await fetch(fileUri);
        const blob = await response.blob();

        // Chemin dans le bucket (ex: "proofs/order-123/photo.jpg")
        const path = `proofs/${orderId}/${fileName}`;

        // Upload dans le bucket "delivery"
        const { data, error } = await supabase.storage
          .from("delivery")
          .upload(path, blob, {
            upsert: true,
            contentType: blob.type,
          });

        if (error) {
          console.error("[Orders] uploadDeliveryProof error", error);
          throw error;
        }

        // Récupérer l'URL publique
        const { data: publicUrlData } = supabase.storage
          .from("delivery")
          .getPublicUrl(path);

        return publicUrlData?.publicUrl ?? null;
      } catch (e) {
        console.error("[Orders] uploadDeliveryProof exception", e);
        return null;
      }
    },
    []
  );

  return {
    
    fetchOrders,
    confirmReception,
    reportIssue,
    cancelOrder, // 🔥 Important
    setAcceptOrder,
    expireOrder,
    fetchOrderAccepts,

    fetchTrackings,
    deliveryAccept,
    deliveryReject,
    deliveryStatusUpdate,
    uploadDeliveryProof,
    setCourierPos,

    orderClientFeedBack,
  };
}
