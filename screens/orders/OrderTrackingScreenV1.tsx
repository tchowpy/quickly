import React, {  useEffect, useMemo, useRef, useState } from "react";
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
import { RootStackParamList } from "../../navigation/types";
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
import * as Linking from 'expo-linking';
import polyline from "@mapbox/polyline";
import { useOrderRealtime } from "hooks/useOrderRealtime";
import { MapPin } from "lucide-react-native";
import { DeliveryPartnerCard } from "components/orders/DeliveryPartnerCard";
import { computeETA } from "utils/eta";

const STATUSES = [
  { key: 'confirmed', label: 'Vous avez confirmé la commande' },
  { key: 'in_preparation', label: 'Commande en cours de préparation' },
  { key: 'assigned', label: 'Un livreur a été assigné à votre commande' },
  { key: 'in_delivery', label: 'Commande en cours de livraison' },
  { key: 'delivered', label: 'Commande livrée, en attente de confirmation' },
  { key: 'completed', label: 'Commande terminée' },
] as const;

const paymentMethods: Array<{ value: PaymentMethod; label: string; description: string }> = [
  { value: 'cash_on_delivery', label: 'À la livraison', description: 'Réglez en espèces à la réception.' },
  { value: 'mobile_money', label: 'Mobile Money', description: 'Paiement sécurisé via votre opérateur.' },
];

const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY;

export function OrderTrackingScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'OrderTracking'>) {
    StatusBar.setBarStyle("light-content");
  StatusBar.setTranslucent(true);
  StatusBar.setBackgroundColor("transparent");

  const { orderId } = route.params;
  const { active, setActiveOrder, history } = useOrderStore();
  const { cancelOrder, confirmReception } = useOrders();
  const order = useMemo(
      () => active.order && active.order.id === orderId ? active.order : history.find((o) => o.id === orderId) ?? active.order,
      [active.order, history, orderId],
    );
//console.log('Rendering OrderTrackingScreen for orderId:', orderId, 'with order.provider:', order?.provider);
   useOrderRealtime(order?.id);
  
   const statusIndex = useMemo(() => STATUSES.findIndex((item) => item.key === order?.status), [order?.status]);

   const statusLabel = useMemo(() => { 
    const statusItem = STATUSES.find((item) => item.key === order?.status);
    return statusItem ? statusItem.label : '';
   }, [order?.status]);

   const courierPosition = useMemo(() => {
     if (!order?.courier_latitude || !order?.courier_longitude) {
       return null;
     }
     return {
       latitude: order.courier_latitude,
       longitude: order.courier_longitude,
     };
   }, [order?.courier_latitude, order?.courier_longitude]);

   const initialRegion = {
    latitude: courierPosition?.latitude ?? order?.courier_latitude ?? 5.3599517,
    longitude: courierPosition?.longitude ?? order?.courier_longitude ?? -4.0082563,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const navigationLocked = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');

  const [timer, setTimer] = useState(90);
  const [step, setStep] = useState(1);
  const [modalVisible, setModalVisible] = useState(true);

  const [closestId, setClosestId] = useState<string | null>(null);
  const [mode, setMode] = useState<"search" | "choose_provider">("search");

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
    const [selectedCourier, setSelectedCourier] = useState<UserProfile | null>();

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
console.log('Order status changed:', order?.status);
    if (!order) return;

    const status = order.status;
    switch (status) {
  
    case "delivered":
      setMode("choose_provider");
      break;

    default:
      //navigation.reset({ index: 0, routes: [{ name: "Main" }] });
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
        setRegion((r) => ({
            ...r,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
        }));
        } else if (timer < 60 && timer >= 30) {
        setRegion((r) => ({
            ...r,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }));
        } else if (timer < 30) {
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

  useEffect(() => {
    const channel = supabase
      .channel(`order_${orderId}`)
      .on("broadcast", { event: "status_update" }, ({ payload }) => {
        console.log("Received status update", payload);
        if (payload?.status === "accepted") {
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
            
            navigation.replace("OrderTracking", { orderId });
        } catch (e) {
            Alert.alert("Erreur", "Impossible de confirmer.");
            navigationLocked.current = false;
        } finally {
        setIsSubmitting(false);
        }

        });
    };
  
    const [routeCoords, setRouteCoords] = useState([]);
    const [clientPosition, setClientPosition] = useState<{latitude:number, longitude:number} | null>(null);

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
console.log('computeRoute -- json: ',json)
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

 const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    void Linking.openURL(url);
  };

  const handleNavigate = (user: UserProfile) => {
    if (!order) return;
    console.log('user: ',user)
    computeRoute(user.latitude,user.longitude,order.latitude,order?.longitude)
  };

    useEffect(() => {
    (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync();
        setClientPosition({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        });
    })();
    }, []);

    useEffect(() => {
      if (order?.provider) {
        const distance = haversine(
            { latitude: order?.provider.latitude ?? 0, longitude: order?.provider.longitude ?? 0 },
            { latitude: order.latitude ?? 0, longitude: order.longitude ?? 0 }
        );
        const distanceKm = Number((distance / 1000).toFixed(2));
        const eta = computeETA(distanceKm);
        console.log(`Distance Prestataire → livraison: ${distanceKm} km, ETA: ${eta}`);
  
        if (order.provider){
          setSelectedProvider({
            ...order.provider,
            distance_km: distanceKm,
            eta: eta
          })
        }
      }
    }, [order?.provider]);

    // -----------------------------------------------------
    // COMPUTE ETA FROM COURIER TO DELIVERY ADDRESS
    // -----------------------------------------------------
    useEffect(() => {
        if (!courierPosition || !order) return;
        const distance = haversine(
            { latitude: courierPosition.latitude, longitude: courierPosition.longitude },
            { latitude: order.latitude ?? 0, longitude: order.longitude ?? 0 }
        );
        const distanceKm = Number((distance / 1000).toFixed(2));
        const eta = computeETA(distanceKm);
        console.log(`Distance livreur → livraison: ${distanceKm} km, ETA: ${eta}`);
  
        if (order.courier){
          setSelectedCourier({
            ...order.courier,
            latitude: courierPosition.latitude,
            longitude: courierPosition.longitude,
            distance_km: distanceKm,
            eta: eta
          })
        }
    }, [courierPosition, order]);

    useEffect(() => {
      if (!courierPosition) return;

      mapRef.current?.animateCamera({
        center: courierPosition,
        zoom: 16,
      });
    }, [courierPosition]);

  // -----------------------------------------------------
  // IF order missing
  // -----------------------------------------------------
  if (!order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['top', 'bottom']}>
        <Text className="text-base text-neutral-600">Aucune commande active à suivre.</Text>
      </SafeAreaView>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* MAP */}
      <View style={{ height: "60%", marginTop: -40}}>
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion= {initialRegion} region={region}>
            <>
             {/* 📍 Adresse de livraison */}
            <Marker
                coordinate={{
                latitude: order.latitude ?? 0,
                longitude: order.longitude ?? 0,
                }}
                title="Adresse de livraison"
                description={`${order.location_address}`}
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

            {/* 👤 Position du prestataire */}
            {selectedProvider &&  selectedProvider.id !== selectedCourier?.id && (
                <Marker
                coordinate={{
                  latitude:selectedProvider?.latitude ?? 0,
                  longitude: selectedProvider.longitude ?? 0
                }}
                title="Prestataire"
                description={`${selectedProvider.full_name}`}
                pinColor="yellow"
                />
            )}
            {/* 👤 Position du livreur */}
            {courierPosition && (
                <Marker
                coordinate={courierPosition}
                title="Livreur"
                description="Position actuelle"
                pinColor="red"
                />
            )}

            {/* Itinéraire */}
            {routeCoords.length > 0 && (
                <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#7B3FE4"
                />
            )}
            </>
        </MapView>
      </View>

      {/* MODAL */}
      {modalVisible && (
        
<BottomSheet
  ref={bottomSheetRef}
  index={0}                 // 0 = mini, 1 = medium, 2 = full
  snapPoints={['65%', '65%', '85%']}   // 👈 MODAL OCCUPE 1/3 puis plus
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
      {`${statusLabel}`}
    </Text>
    <Text className="text-xl font-extrabold text-neutral-900">
      {selectedCourier?.eta ? `• ${selectedCourier.eta}` : ""}
    </Text>
    </View>

    {/* PRODUIT */}
    <View className="rounded-3xl bg-[#F8F5FF] p-4 shadow-md mb-2 mt-4">
      <Text className="text-sm font-medium text-neutral-500">Commande #{order.id.slice(0, 6).toUpperCase()}</Text>
    <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
        <Text className="text-lg font-semibold text-neutral-900">{order.product_name}</Text>
        </View>
         <View className="flex-row items-center">
        
        <Text className="px-3 py-2 text-base font-semibold">x {order.quantity}</Text>
        
        </View>
    </View>
    <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4">
        <Text className="text-lg font-semibold text-neutral-900">Total</Text>
        </View>
        <View className="flex-row items-center">
        
        <Text className="px-3 py-2 text-base font-semibold">{formatCurrency(order.total_amount)}</Text>
        
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

    {/* TIMELINE 
      <View className="rounded-3xl bg-white p-4 shadow-md mb-2 mt-4">
        <StepCol currentStep={(statusIndex + 1)} />
      </View>
      */}
  {/* 🚀 Affichage du livreur */}
    {selectedCourier && (
      <>
      <Text className="mt-2 mb-2 text-sm font-medium text-neutral-500">Livreur</Text>
        <DeliveryPartnerCard
          partner={{
            full_name: `${selectedCourier.full_name}`,
            phone: selectedCourier.phone,
          }}

          distanceKm={selectedCourier.distance_km}
          eta={selectedCourier.eta}
          onPressCall={ async () => {
            handleCall(selectedCourier.phone);
          }}
          onPressNavigate={ async () => {
            handleNavigate(selectedCourier)
          }}
        />
        { selectedProvider?.id === selectedCourier?.id &&(
          <Text className="mt-2 mb-2 text-sm item-center font-medium text-neutral-500">Le prestataire se charge de la livraison</Text>
        )}
      </>
    )}

  {/* 🚀 Affichage du provider */}
    {selectedProvider &&  selectedProvider.id !== selectedCourier?.id && (
      <>
      <Text className="mt-2 mb-2 text-sm font-medium text-neutral-500">Fournisseur</Text>
        <DeliveryPartnerCard
          partner={{
            full_name: `${selectedProvider.full_name}`,
            phone: selectedProvider.phone,
          }}
          distanceKm={selectedProvider.distance_km}
          eta={selectedProvider.eta}
          onPressCall={ async () => {
            handleCall(selectedProvider.phone);
          }}
          onPressNavigate={ () => {
            handleNavigate({
              ...selectedProvider,
              _ts: Date.now()
          })
          }}
        />
      </>
    )}

    {['delivered', 'in_delivery'].includes(order.status) && (
      <PrimaryButton label="Confirmer la réception" onPress={() => confirmReception(order.id)} />
    )}
  </BottomSheetScrollView>
</BottomSheet>

)}

    </SafeAreaView>
  );
}

function StepCol({ currentStep }: { currentStep: number }) {
  const steps = STATUSES.map((s) => s.label);

  return (
    <View className="flex-col justify-between">
      {steps.map((label, index) => {
        const active = currentStep > index;

        return (
          <View key={index} className="flex-row items-center flex-1">
            {/* Trait horizontal entre les étapes */}
            {index < steps.length && (
              <View
                className={`w-1 h-full mr-2 ${
                  active ? "bg-[#7B3FE4]" : "bg-neutral-300"
                }`}
              />
            )}
            <View
              className={`mb-2 w-7 h-7 rounded-full items-center justify-center ${
                active ? "bg-[#7B3FE4]" : "bg-neutral-300"
              }`}
            >
              <View className="w-3 h-3 bg-white rounded-full" />
            </View>

            <Text
              className={`mb-2 ml-1 text-xm ${
                active ? "text-neutral-900 font-semibold" : "text-neutral-400"
              }`}
            >
              {label}
            </Text>

            
          </View>
        );
      })}
    </View>
  );
}

