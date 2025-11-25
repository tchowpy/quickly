import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StatusBar,
  View,
  Text,
  Modal,
  Alert,
  FlatList,
  Pressable,
  Image,
  Animated,
  Dimensions,
  ScrollView
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList, RootStackParamList } from "../../navigation/types";
import { useOrderStore } from "../../store/orderStore";
import { useOrders } from "../../hooks/useOrders";
import { supabase } from "../../lib/supabase";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { RadarPulse } from "../../components/map/RadarPulse";
import { formatCurrency } from "utils/format";
import { PaymentMethod, PricingEstimate, UserProfile } from "types/models";
import { computeFallbackEstimate } from "utils/fallbackEstimate";
import CostEstimateCard from "components/checkout/CostEstimateCard";
import FinalCostEstimateCard from "components/orders/FinalCostEstimateCard";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { ProviderCardPremiumCompact } from "components/orders/ProviderCardPremiumCompact";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import polyline from "@mapbox/polyline";
import { useOrderRealtime } from "hooks/useOrderRealtime";
import { MapPin } from "lucide-react-native";
import { useAuthStore } from "store/authStore";
import { getRouteFromORS } from "services/location/routeService";

const paymentMethods: Array<{ value: PaymentMethod; label: string; description: string }> = [
  { value: 'cash_on_delivery', label: 'À la livraison', description: 'Réglez en espèces à la réception.' },
  { value: 'mobile_money', label: 'Mobile Money', description: 'Paiement sécurisé via votre opérateur.' },
];

const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;

export function ProviderSearchScreen({
  navigation,
  route,
}: NativeStackScreenProps<MainStackParamList, "ProviderSearch">) {
    StatusBar.setBarStyle("light-content");
  StatusBar.setTranslucent(true);
  StatusBar.setBackgroundColor("transparent");

  const { orderId } = route.params;
  const { active, history } = useOrderStore();
  const { geoloc } = useAuthStore();

  const { cancelOrder, expireOrder, fetchOrderAccepts, fetchOrders } = useOrders();
  //const [order, setOrder] = useState<any>(active.order);
  const order = useMemo(
      () => active.order && active.order.id === orderId ? active.order : history.find((o) => o.id === orderId) ?? active.order,
      [active.order, history, orderId],
    );

   useOrderRealtime(order?.id);
  
  const mapRef = useRef<MapView>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const navigationLocked = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');

  const [timer, setTimer] = useState(90);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [step, setStep] = useState(1);
  const [modalVisible, setModalVisible] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [sortedProviders, setSortedProviders] = useState<any[]>([]);
  const [closestId, setClosestId] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "choose_provider">("search");

  const [radarSize, setRadarSize] = useState(160);

  const bottomSheetRef = useRef<BottomSheet>(null);

  // -------- Position écran pour overlay radar ----------
  const { width, height } = Dimensions.get("window");
  const [screenPos, setScreenPos] = useState({ x: width / 2, y: height / 2 });

  // -------- Region dynamique --------
  const [region, setRegion] = useState<Region>({
    latitude: order?.latitude ?? 0,
    longitude: order?.longitude ?? 0,
    latitudeDelta: 0.0025,
    longitudeDelta: 0.0025,
  });

    // Estimate
    const [estimate, setEstimate] = useState<PricingEstimate | null>(null);
    const [isEstimating, setIsEstimating] = useState(false);
  
    // Address management
    const [selectedProvider, setSelectedProvider] = useState<UserProfile | null>();
  
    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const sortedProviders = [...providers].sort(
        (a, b) => a.distance_km - b.distance_km
        );

        setSortedProviders(sortedProviders);

        const closestId = sortedProviders[0]?.provider_id;
        setClosestId(closestId);

        handleSelectProvider({
            ...sortedProviders[0],
            _ts: Date.now(),
        });

    }, [providers]);

  // -----------------------------------------------------
  // BROADCAST INIT
  // -----------------------------------------------------
  const broadcastOrder = async () => {
    try {
      await supabase.functions.invoke("orders-broadcast", {
        body: { order_id: orderId },
      });

      await supabase.functions.invoke("order-status-update", {
        body: {
          order_id: orderId,
          status: "broadcasted",
          note: "Commande diffusée",
        },
      });
      //setStep(2);
    } catch (e) {
      console.log("Broadcast failed", e);
    }
  };

  useEffect(() => {
console.log('Order status changed:', order?.status);
//console.log('Order loaded:', orderLoaded);
    //if ((!orderLoaded && ['created','pending_broadcast','broadcasted'].includes(order?.status ?? "")) || !order) return;
    if (!order) return;

    const status = order.status;
    switch (status) {
    case "pending_broadcast":
      broadcastOrder();
      setMode("search");
      setStep(1);
      break;

    case "broadcasted":
      setMode("search");
      setStep(2);
      break;

    case "accepted":
      setStep(3);
      loadProviders();
      setMode("choose_provider");
      setRegion((r) => ({
            ...r,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        }));
      break;

    default:
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      break;
  }
    

  }, [order?.status]);

  // -----------------------------------------------------
  // TIMER + ZOOM + RADAR EVOLUTION
  // -----------------------------------------------------
  useEffect(() => {

    const fetch = async () => {
        if (mode === "choose_provider") return;

        if (timer <= 0) {
        //handleExpire("Temps écoulé. Aucun prestataire trouvé.");
        return;
        }

        if (timer < 90 && timer >= 60) {
        setRadarSize(120);
        setRegion((r) => ({
            ...r,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
        }));
        } else if (timer < 60 && timer >= 30) {
        setRadarSize(200);
        setRegion((r) => ({
            ...r,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }));
        } else if (timer < 30) {
        setRadarSize(300);
        setRegion((r) => ({
            ...r,
            latitudeDelta: 0.025,
            longitudeDelta: 0.025,
        }));
        }
        const t = setTimeout(() => setTimer((s) => s - 1), 1000);
        return () => clearTimeout(t);
            
    };

    fetch();

  }, [timer, mode]);

  // -----------------------------------------------------
  // UPDATE RADAR SCREEN POSITION
  // -----------------------------------------------------

useEffect(() => {
    if (!mapRef.current || !order) return;

    setTimeout(() => {
        if (!mapRef.current || !order) return;
        mapRef.current
        .pointForCoordinate({
            latitude: order.latitude ?? 0,
            longitude: order.longitude ?? 0,
        })
        .then((p) => setScreenPos({ x: p.x, y: p.y }))
        .catch(() => {});
    }, 50);
}, [region]);

  // -----------------------------------------------------
  // REALTIME ACCEPTED
  // -----------------------------------------------------
  const loadProviders = async () => {
    const list = await fetchOrderAccepts(orderId);
    console.log("loadProviders -- list",list)
    // Ajout automatique distance_km si manquant
    const providersWithDistance = list.map((p) => {
        const provider = {
            ...p,
            id: p.provider_id,
            full_name: p.user?.full_name,
            phone: p.user?.phone,
            rating: p.user?.rating,
        }

        if (!order) {
            return {
                ...provider,
                distance_km: 10,
            };
        }

        const distance = haversine(
            { latitude: provider.latitude, longitude: provider.longitude },
            { latitude: order.latitude ?? 0, longitude: order.longitude ?? 0 }
        );

        const estimate = computeFallbackEstimate(
            order.unit_price ?? 0,
            order.quantity,
            Number((distance / 1000).toFixed(2))
        )

        return {
            ...provider,
            distance_km: Number((distance / 1000).toFixed(2)),
            total_amount: estimate?.total_amount
        };
    });
    setProviders(providersWithDistance);
  };

  const handleSelectProvider = async (provider: UserProfile) => {
    if (!order) return;
    try {
        setSelectedProvider(provider);
        const estimate = await fetchEstimate(provider)
        setEstimate(estimate)
        getRouteFromORS(
            {lat: provider.latitude, lng: provider.longitude},
            {lat: order.latitude, lng: order.longitude}
        );
    } catch (error) {
        const estimate = computeFallbackEstimate(order.unit_price ?? 0, order.quantity, provider.distance_km)
        setEstimate(estimate)
    } finally {
        setIsEstimating(false);
    }
    
  };

  useEffect(() => {
    const channel = supabase
      .channel(`order_${orderId}`)
      .on("broadcast", { event: "status_update" }, ({ payload }) => {
        console.log("Received status update", payload);
        if (payload?.status === "accepted") {
          loadProviders();
          setMode("choose_provider");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // -----------------------------------------------------
  // CANCEL SAFE
  // -----------------------------------------------------
  const handleCancel = async (msg: string) => {
    if (navigationLocked.current) return;
    navigationLocked.current = true;

    try {
      await cancelOrder(orderId, msg);
    } catch (e) {}

    setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }, 300);
  };

    // -----------------------------------------------------
    // EXPIRE SAFE
    // -----------------------------------------------------
    const handleExpire = async (msg: string) => {
        if (navigationLocked.current) return;
        navigationLocked.current = true;

        try {
        await expireOrder(orderId, msg);
        } catch (e) {}

        setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
        }, 300);
    };

    // -----------------------------------------------------
    // CONFIRM PROVIDER
    // -----------------------------------------------------

    const handleConfirmProvider = () => async () => {
        if (!order) return;
        if (!selectedProvider) {
            Alert.alert("Erreur", "Veuillez sélectionner un prestataire.");
            return;
        }
        if (!estimate) {
            Alert.alert("Erreur", "Estimation des frais manquante.");
            return;
        }
        if (isSubmitting) return;

        if (navigationLocked.current) return;
        navigationLocked.current = true;

        Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        }).start(async () => {
        try {
        setIsSubmitting(true);

        // Mise à jour de l'ordre (delivery_fee, total_amount, provider_id) avec le prestataire sélectionné dans la base
        const { error } =  await supabase.functions.invoke("order-status-update", {
            body: {
                order_id: orderId,
                status: "confirmed",
                note: "Prestataire choisi",
                metadata: { 
                    provider_id:selectedProvider.id, 
                    distance_km: selectedProvider.distance_km,
                    total_amount: estimate.total_amount,
                    delivery_fee: estimate.delivery_fee
                },
            },
            });

            if (error) throw error;
            await fetchOrders();
            navigation.replace("OrderTracking", { orderId });
        } catch (e) {
            Alert.alert("Erreur", "Impossible de confirmer.");
            navigationLocked.current = false;
        } finally {
        setIsSubmitting(false);
        }

        });
    };

    // ----------------------------------------------------------------------
    // FETCH PRICING ESTIMATE
    // ----------------------------------------------------------------------
  
    const fetchEstimate = async (selectedProvider: UserProfile) => {
        if (!order || !selectedProvider) return;
        try {
          //setIsEstimating(true);
  
          const { data, error } = await supabase.functions.invoke<PricingEstimate>(
            'pricing-estimate',
            {
              body: {
                product_id: order.product_id,
                quantity: order.quantity,
                unit_price: order.unit_price,
                distance_km: selectedProvider.distance_km,
                provider_location: {
                  latitude: selectedProvider?.latitude,
                  longitude: selectedProvider?.longitude,
                },
                client_location: {
                  latitude: order?.latitude,
                  longitude: order?.longitude,
                },
              },
            }
          );
  
          if (error || !data) {
            const data = computeFallbackEstimate(
                order.unit_price ?? 0,
                order.quantity,
                selectedProvider.distance_km
              )
            //setEstimate(data);
            return data;
          }
          return data;
          //setEstimate(data);

        } catch (err) {
          const data = computeFallbackEstimate(
                order.unit_price ?? 0,
                order.quantity,
                selectedProvider.distance_km
            )
            //setEstimate(data);
            return data;
        }
      };
      {/*
    useEffect(() => {
      if (!order || !selectedProvider) return;
  
      fetchEstimate(selectedProvider);
      setEstimate(data)
    }, [
      selectedProvider,
    ]);
    */}

    const [routeCoords, setRouteCoords] = useState([]);
    
    const clientPosition = geoloc;

const computeRoute = async (fromLat, fromLng, toLat, toLng) => {
  try {
    const apiKey = ORS_API_KEY;

    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [fromLng, fromLat],
            [toLng, toLat],
          ],
        }),
      }
    );

    const json = await response.json();

    if (!json.routes || !json.routes[0]) {
      console.log("❌ ORS: aucune route trouvée");
      return;
    }

    const encoded = json.routes[0].geometry;

    // ➜ Décodage polyline5
    const decoded = polyline.decode(encoded);

    // ➜ Convertir en tableau { latitude, longitude }
    const coords = decoded.map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

    setRouteCoords(coords);
  } catch (err) {
    console.log("Route calc error", err);
  }
};
   
  // -----------------------------------------------------
  // IF order missing
  // -----------------------------------------------------
  if (!order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text>Chargement…</Text>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* MAP */}
      <View style={{ height: "65%", marginTop: -40}}>
        <MapView ref={mapRef} style={{ flex: 1 }} region={region}>
          {mode === "choose_provider" && (
            <>
             {/* 📍 Adresse de livraison */}
            <Marker
                coordinate={{
                latitude: order.latitude ?? 0,
                longitude: order.longitude ?? 0,
                }}
                title="Adresse de livraison"
                pinColor="#7B3FE4"
            />

            {/* 👤 Position du client */}
            {clientPosition && (
                <Marker
                coordinate={clientPosition}
                title="Votre position"
                pinColor="green"
                />
            )}

            {/* 🏪 Providers ayant accepté */}
            {providers.map((p) => (
                <Marker
                key={p.provider_id}
                coordinate={{
                    latitude: p.latitude,
                    longitude: p.longitude,
                }}
                title={p.users?.full_name ?? "Prestataire"}
                pinColor={selectedProvider?.id === p.provider_id ? "blue" : "orange"}
                />
            ))}

            {/* Itinéraire */}
            {routeCoords.length > 0 && (
                <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#7B3FE4"
                />
            )}
            </>
          )}
        </MapView>
      </View>

      {/* RADAR OVERLAY */}
        { mode === "search" && (
        <View
            pointerEvents="none"
            style={{
            position: "absolute",
            left: screenPos.x - radarSize / 2,
            top: screenPos.y - radarSize / 2,
            }}
        >
            <RadarPulse size={radarSize} color="rgba(123,63,228,0.35)" />
        </View>
        )}
      {/* MODAL */}
      {modalVisible && (
        
<BottomSheet
  ref={bottomSheetRef}
  index={0}                 // 0 = mini, 1 = medium, 2 = full
  snapPoints={['50%', '65%', '85%']}   // 👈 MODAL OCCUPE 1/3 puis plus
  enablePanDownToClose={false}
  backgroundStyle={{
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  }}
  handleIndicatorStyle={{
    backgroundColor: '#CCC',
    width: 45,
  }}
>
  <BottomSheetScrollView
    style={{ padding: 20 }}
    showsVerticalScrollIndicator={false}
  >
    {/* TITRE */}
    <View className="flex-row justify-between items-center">
    <Text className="text-xl font-extrabold text-neutral-900">
      {mode === "search"
        ? `Recherche en cours…`
        : `Prestataires disponibles`}
    </Text>
    <Text className="text-xl font-extrabold text-neutral-900">
      {mode === "search"
        ? `00m:${timer}s`
        : ``}
    </Text>
    </View>

    {/* TIMELINE */}
    {/*mode === "search" && (
        <View className="mt-6">
        <StepLine currentStep={step} />
        </View>
    )*/}
    {/* 🚀 LISTE DES PROVIDERS */}
    {mode === "choose_provider" && (
      <>
        <Text className="mt-2 text-base font-semibold text-neutral-700"></Text>
        {/**
        <ProviderCardPremiumCompact
          key={selectedProvider?.id}
          provider={selectedProvider}
          index={1}
          isClosest={selectedProvider?.id === closestId}
          isSelected={false}
          onSelect={() => {
            handleSelectProvider({
              ...item,
              _ts: Date.now(),
            });
          }}
        />
         */}
        {sortedProviders.map((item, index) => (
          <ProviderCardPremiumCompact
            key={item.id}
            provider={item}
            index={index}
            isClosest={item.id === closestId}
            isSelected={item.id === selectedProvider?.id}
            onSelect={() => {
             handleSelectProvider({
                ...item,
                _ts: Date.now(),
             });
            }}
          />
        ))}
      </>
    )}

    {/* PRODUIT */}
    <View className="rounded-3xl bg-[#F8F5FF] p-4 shadow-md mb-2 mt-4">
    <Text className="text-sm font-medium text-neutral-500">Commande #{order.id.slice(0, 6).toUpperCase()}</Text>
    <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
        <Text className="text-lg font-semibold text-neutral-900">{order.product_name}</Text>
        </View>
        <View className="flex-row items-center rounded-full bg-[#F4F0FF]">
        
        <Text className="px-3 py-2 text-base font-semibold">x{order.quantity}</Text>
        
        </View>
    </View>
    <Text className="mt-2 text-sm font-medium text-neutral-500">Adresse de livraison</Text>
        <View
          style={{
            flexDirection: "row",
            marginTop: 10,
            alignItems: "center",
            alignContent: "center",
          }}
        >
          <MapPin color="#7B3FE4" size={28} />
          <Text className="text-sm text-neutral-700 flex-1 ml-1">
            {order.location_address}
          </Text>
        </View>
    </View>
    
    {/* PRICING + PAYMENT */}
    {mode === "choose_provider" && selectedProvider && (
      <>
        <FinalCostEstimateCard estimate={estimate} isLoading={isEstimating} />

        <View className="rounded-3xl bg-white p-4 shadow-md mt-4">
          <Text className="text-sm font-medium text-neutral-500">
            Mode de paiement
          </Text>

          <View className="mt-3 space-y-3">
            {paymentMethods.map((method) => (
              <Pressable
                key={method.value}
                className={`rounded-2xl border px-4 py-3 mt-1 ${
                  paymentMethod === method.value
                    ? "border-[#7B3FE4] bg-[#F8F5FF]"
                    : "border-neutral-100"
                }`}
                onPress={() => setPaymentMethod(method.value)}
              >
                <Text className="text-base font-semibold text-neutral-900">
                  {method.label}
                </Text>
                <Text className="mt-1 text-sm text-neutral-500">
                  {method.description}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="mt-4">  
        <PrimaryButton
          label={isEstimating ? "Calcul des frais..." : `Confirmer ${selectedProvider.full_name ?? ""}`}
          onPress={handleConfirmProvider()}
          loading={isSubmitting}
          disabled={isEstimating || isSubmitting || !estimate}
          //className="mt-4"
        />
        </View>
      </>
    )}

    {/* CANCEL ALWAYS VISIBLE */}
    <View className="mt-4  mb-20">
    <PrimaryButton
      label="Annuler"
      gradient={["#E57373", "#EF5350"]}
      textClassName="text-white"
      onPress={() => handleCancel("Commande annulée.")}
      loading={isSubmitting}
      //className="mt-6 mb-20"
    />
    </View>
  </BottomSheetScrollView>
</BottomSheet>

)}

    </SafeAreaView>
  );
}

// STEP UI
function Step({ label, active }: { label: string; active: boolean }) {
  return (
    <View className="items-center flex-1">
      <View
        className={`w-8 h-8 rounded-full items-center justify-center ${
          active ? "bg-[#7B3FE4]" : "bg-neutral-300"
        }`}
      >
        <View className="w-3 h-3 bg-white rounded-full" />
      </View>
      <Text
        className={`mt-1 text-xs ${
          active ? "text-neutral-900 font-semibold" : "text-neutral-400"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

function StepLine({ currentStep }: { currentStep: number }) {
  const steps = ["Commande Envoyée", "Recherche en cours", "Prestataire trouvé. "];

  return (
    <View className="flex-row items-center justify-between px-3">
      {steps.map((label, index) => {
        const active = currentStep > index;

        return (
          <View key={index} className="items-center justify-center flex-1">
            <View
              className={`w-7 h-7 rounded-full items-center justify-center ${
                active ? "bg-[#7B3FE4]" : "bg-neutral-300"
              }`}
            >
              <View className="w-3 h-3 bg-white rounded-full" />
            </View>

            <Text
              className={`mt-1 text-xs items-center ${
                active ? "text-neutral-900 font-semibold" : "text-neutral-400"
              }`}
            >
              {label}
            </Text>

            {/* Trait horizontal entre les étapes */}
            {index < steps.length && (
              <View
                className={`h-1 w-full mt-2 ${
                  active ? "bg-[#7B3FE4]" : "bg-neutral-300"
                }`}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

