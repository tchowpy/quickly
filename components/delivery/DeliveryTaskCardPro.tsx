import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, Linking, Platform, Image, Modal } from "react-native";
import {
  MapPin,
  User,
  Clock,
  PhoneCall,
  Navigation,
  Package
} from "lucide-react-native";
import { formatCurrency } from "../../utils/format";
import { TrackingStatus, TrackingSummary } from "types/models";
import haversine from "haversine-distance";
import * as Location from "expo-location";
import { PrimaryButton } from "components/ui/PrimaryButton";
import * as ImagePicker from "expo-image-picker";
import { computeETA } from "utils/eta";
import { useAuthStore } from "store/authStore";

interface DeliveryTaskCardProProps {
  trackingInfos: TrackingSummary;
  isSubmitting?: boolean;
  onAccept?: (({ longitude, latitude }: {
    longitude: number | 0;
    latitude: number | 0;
  }) => void) ;
  onReject?: (reason?: string) => void;
  onRetrieved?: () => void;
  onInTransit?: () => void;
  onReachedDestination?: () => void;
  onDelivered?: (proofUrl: string) => void;
  onFailed?: (reason: string) => void;
  onPress?: () => void;
  onTheMove?: (({ longitude, latitude }: {
    longitude: number | 0;
    latitude: number | 0;
  }) => void) ;

}

export function DeliveryTaskCardPro({
  trackingInfos,
  isSubmitting = false,
  onAccept,
  onReject,
  onRetrieved,
  onInTransit,
  onReachedDestination,
  onDelivered,
  onFailed,
  onPress,
  onTheMove
}: DeliveryTaskCardProProps) {

    const { geoloc } = useAuthStore();
    const provider = trackingInfos.order.provider;
    const client = trackingInfos.order.client;
    const order = trackingInfos.order;
    const status = trackingInfos.status;

    const [proofModalVisible, setProofModalVisible] = useState(false);
    const [photo, setPhoto] = useState<string | null>(null);
  // ------------------------------
  // Badges
  // ------------------------------
  const getStatusBadge = () => {
    switch (status) {
      case "pending":
        return (
          <Text className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
            En attente
          </Text>
        );
      case "assigned":
        return (
          <Text className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            Assignée
          </Text>
        );
      case "retrieved":
        return (
          <Text className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            Colis récupéré
          </Text>
        );
      case "in_transit":
        return (
          <Text className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            En livraison
          </Text>
        );
      case "at_destination":
        return (
          <Text className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
            Arrivé à destination
          </Text>
        );
      case "delivered":
        return (
          <Text className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
            Colis Livré
          </Text>
        );
      case "rejected":
        return (
          <Text className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            Rejetée
          </Text>
        );
      default:
        return null;
    }
  };

  // Pick image
    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            alert("Permission caméra refusée");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled && result.assets?.length > 0) {
            setPhoto(result.assets[0].uri);
        }
    };

    // Confirm delivery with photo
    const confirmWithPhoto = () => {
        if (!photo) {
            alert("Vous devez prendre une photo comme preuve de livraison.");
            return;
        }

        setProofModalVisible(false);
        onDelivered?.(photo);
    };

  // -----------------------
  // MAP / ROUTES HANDLERS
  // -----------------------
  const openRoute = (from, to) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&travelmode=driving`;
    console.log('openRoute -- url: ',url)
    Linking.openURL(url);
  };

  // ------------------------------
  // Open Maps
  // ------------------------------
  const openMaps = (from, to) => {
    const scheme = Platform.select({
      ios: "maps://?q=",
      android: "geo:0,0?q="
    });

    const latLng = `${from.latitude},${from.longitude}`;
    const label = encodeURIComponent("Point de livraison");
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url || "");
  };

    // ---------------------
  // CONDITIONS D'AFFICHAGE
  // -----------------------
  const isPending = status === "pending";
  const isAssigned = status === "assigned";
  const isRetrieved = status === "retrieved";
  const isInTransit = status === "in_transit";
  const isAtDestination = status === "at_destination";
//console.log('isAssigned ',isAssigned)
  const showAcceptRefuse = isPending;
  //const showRetrievedBtn = isAssigned;
  const showInTransitBtn = isRetrieved;
  //const showReachedBtn = isInTransit;
  const showDeliveredBtn = isAtDestination;
  //const allowFailed = isInTransit;

  const [showRetrievedBtn, setShowRetrievedBtn] = React.useState(false);
  const [showReachedBtn, setShowReachedBtn] = React.useState(false);
   const [allowFailed, setAllowFailed] = React.useState(false);

  // -----------------------
  // INFOS À AFFICHER
  // -----------------------
  const showClientInfo = isRetrieved || isInTransit || isAtDestination;
  const showPriceDistance = isInTransit || isAtDestination;

  // -----------------------
  // CALCUL DISTANCE / ETA
  // -----------------------
  const courierPos = geoloc;

  const distanceKm = useMemo(() => {
    if (!courierPos || !order?.latitude) return null;

    const dist = haversine(
      { latitude: courierPos.latitude, longitude: courierPos.longitude },
      { latitude: order.latitude, longitude: order.longitude ?? 0 }
    );

    return Number((dist / 1000).toFixed(2));
  }, [courierPos, order]);

  const distanceFromProviderKm = useMemo(() => {
    if (!courierPos || !provider?.latitude) return null;

    const dist = haversine(
      { latitude: courierPos.latitude, longitude: courierPos.longitude },
      { latitude: provider.latitude, longitude: provider.longitude ?? 0 }
    );

    return Number((dist / 1000).toFixed(2));
  }, [courierPos, provider]);

  const estimate = useMemo(() => {
    if (!distanceKm) return null
    return computeETA(distanceKm)
  }, [distanceKm]);

     useEffect(() => {
      console.log('distanceFromProviderKm ',distanceFromProviderKm)
      console.log('distanceKm ',distanceKm)
        if (!courierPos) return
        if (!['pending','failed','rejected','delivered'].includes(status)){
            onTheMove?.(courierPos)

            if (!distanceFromProviderKm) return
            if (isAssigned && distanceFromProviderKm <  0.05){
                setShowRetrievedBtn(true)
                return
            }
            if (isRetrieved) {
              setShowRetrievedBtn(false)
              if (distanceFromProviderKm >  0.100){
                  onInTransit?.()
                  return
              }
            }
            if (!distanceKm) return
            if (isInTransit) { 
              if (distanceFromProviderKm >  0.100){
                  setAllowFailed(true)
              }
              if (distanceKm <  0.050){
                setAllowFailed(false)
                setShowReachedBtn(true)
                return
              }
            }
        }
    }, [courierPos, distanceFromProviderKm, distanceKm]);

  // -----------------------
  // RENDER SECTION TITLE
  // -----------------------
  const SectionTitle = ({ title }) => (
    <Text className="text-xs font-semibold text-neutral-400 uppercase mb-2">
      {title}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      className="mb-6 mx-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100"
      style={{
        marginBottom:10
      }}
    >
      {/* HEADER */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-base font-bold text-neutral-900">
          Livraison #{order.id.slice(0, 6).toUpperCase()}
        </Text>

        {getStatusBadge()}
      </View>

      {/* PRODUIT */}
      <View className="flex-row items-center mb-3">
        <View className="h-12 w-12 rounded-xl bg-neutral-200 overflow-hidden mr-3">
          {order.product_image ? (
            <Image
              source={{ uri: order.product_image }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Package size={20} color="#7B3FE4" />
            </View>
          )}
        </View>

        <Text className="text-sm font-semibold text-neutral-900 flex-1">
          {order.product_name} x {order.quantity}
        </Text>

        {order.total_price !== undefined && (
          <Text className="text-sm font-semibold text-neutral-900">
            {formatCurrency(order.total_price)}
          </Text>
        )}
      </View>

      {/* SUPPLIER INFO */}
      <SectionTitle title="Fournisseur" />
      <View className="flex-row items-center mb-2">
        <User size={18} color="#7B3FE4" />
        <Text className="ml-2 text-sm font-semibold text-neutral-800">
          {provider?.full_name}
        </Text>
      </View>

      {/* PHONE */}
      {provider?.phone && (
        <Pressable
          onPress={() => Linking.openURL(`tel:${provider.phone}`)}
          className="flex-row items-center mb-2 active:opacity-70"
        >
          <PhoneCall size={18} color="#7B3FE4" />
          <Text className="ml-2 text-sm text-neutral-700">{provider.phone}</Text>
        </Pressable>
      )}

      {/* ADDRESS */}
      {provider?.address && (
      <View className="flex-row items-start mb-2">
        <MapPin size={18} color="#7B3FE4" />
        <Text className="ml-2 text-sm flex-1 text-neutral-700">{provider?.address}</Text>
      </View>
      )}

      {/* CLIENT */}
      {showClientInfo && (
      <>
        <SectionTitle title="Client" />
        <View className="flex-row items-center mb-2">
            <User size={18} color="#7B3FE4" />
            <Text className="ml-2 text-sm font-semibold text-neutral-800">
            {client?.full_name}
            </Text>
        </View>

        {/* PHONE */}
        {client?.phone && (
            <Pressable
            onPress={() => Linking.openURL(`tel:${client.phone}`)}
            className="flex-row items-center mb-2 active:opacity-70"
            >
            <PhoneCall size={18} color="#7B3FE4" />
            <Text className="ml-2 text-sm text-neutral-700">{client.phone}</Text>
            </Pressable>
        )}

        {/* ADDRESS */}
        <View className="flex-row items-start mb-2">
            <MapPin size={18} color="#7B3FE4" />
            <Text className="ml-2 text-sm flex-1 text-neutral-700">{order?.location_address}</Text>
        </View>
      </>
      )}
      {/* DISTANCE / PRICE / ETA */}
      {showPriceDistance && (
      <>
      <View className="flex-row justify-between items-center mt-3">
        {distanceKm !== undefined && (
          <View className="bg-neutral-100 px-3 py-1.5 rounded-full">
            <Text className="text-xs font-semibold text-neutral-700">
              {distanceKm} km
            </Text>
          </View>
        )}

        {estimate && (
          <View className="flex-row items-center bg-purple-50 px-3 py-1.5 rounded-full">
            <Clock size={14} color="#7B3FE4" />
            <Text className="ml-1 text-xs font-semibold text-[#7B3FE4]">
              {estimate}
            </Text>
          </View>
        )}

        {order.delivery_fee !== undefined && (
          <Text className="text-base font-bold text-neutral-900">
            {formatCurrency(order.delivery_fee)}
          </Text>
        )}
      </View>
      <View className="mt-3 border-t border-dashed border-neutral-200 pt-3">
        <Row label="Total à encaisser" value={formatCurrency(Number(order.total_price??0) + Number(order.delivery_fee))} bold />
      </View>
      </>
      )}

      {/* ACTIONS */}
      
      {showAcceptRefuse && (
        <View className="flex-row mt-4 gap-3">
            <PrimaryButton
                label="Refuser"
                gradient={["red", "red"]}
                textClassName="text-red-700"
                onPress={() => {
                    onReject?.('Demande de livraison refusée')}
                }
                loading={isSubmitting}
            />
            <PrimaryButton
                label="Accepter la mission"
                gradient={["#7B3FE4", "#7B3FE4"]}
                textClassName="text-white"
                onPress={() => {
                    onAccept?.(courierPos)}
                }
                loading={isSubmitting}
            />
        </View>
      )}
        <View className="flex-col mt-4 gap-3">
        {showRetrievedBtn && (
          <PrimaryButton
            label="J'ai récupéré le colis"
            onPress={onRetrieved}
            loading={isSubmitting}
          />
        )}
        {showInTransitBtn && (
          <PrimaryButton
            label="Je démarre la livraison"
            onPress={onInTransit}
            loading={isSubmitting}
          />
        )}
        {showReachedBtn && (
          <PrimaryButton
            label="Je suis arrivé à destination"
            onPress={onReachedDestination}
            loading={isSubmitting}
          />
        )}
        {showDeliveredBtn && (
          <PrimaryButton
            label="J'ai livré le colis"
            onPress={() => setProofModalVisible(true)}
            loading={isSubmitting}
          />
        )}
        {allowFailed && (
          <PrimaryButton
            label="Marquer la livraison en échec"
            gradient={["#FDE2E2", "#F6B6B6"]}
            textClassName="text-red-600"
            onPress={() => {
                onFailed?.('Echec de la livraison')}
            }
            loading={isSubmitting}
          />
        )}
        </View>

      {/* ITINÉRAIRE */}
      {courierPos?.latitude && courierPos.longitude && (
      <Pressable
        onPress={() => {
            const to = showClientInfo ? order : provider;
            openRoute(courierPos, {
            latitude: to?.latitude ,
            longitude: to?.longitude,
            });
        }}
        className="mt-4 flex-row items-center justify-center rounded-xl border border-neutral-300 py-3 active:opacity-80"
      >
        <Navigation size={18} color="#7B3FE4" />
        <Text className="ml-2 text-sm font-semibold text-[#7B3FE4]">
          {`Afficher l’itinéraire vers ${showClientInfo ? `l'adresse de livraison`: `l'adresse du fournisseur`}` }
        </Text>
      </Pressable>
      )}

      {/* MODALE – PREUVE PHOTO */}
        <Modal
            animationType="slide"
            transparent
            visible={proofModalVisible}
            onRequestClose={() => setProofModalVisible(false)}
            navigationBarTranslucent={true} statusBarTranslucent={false}
            >
            <View className="flex-1 bg-black/40 justify-end">
                <View className="bg-white p-5 rounded-t-3xl" style={{paddingBottom:50}}>
                <Text className="text-lg font-bold text-neutral-900">
                    Preuve de livraison
                </Text>

                <Text className="text-sm text-neutral-600 mt-1 mb-4">
                    Une photo est obligatoire pour confirmer la livraison du colis.
                </Text>

                {photo && (
                    <Image
                    source={{ uri: photo }}
                    style={{ width: "100%", height: 200, borderRadius: 12 }}
                    />
                )}

                <PrimaryButton
                    label={photo ? "Changer la photo" : "Prendre une photo"}
                    onPress={handleTakePhoto}
                    containerClassName="mt-4"
                />

                <PrimaryButton
                    label="Confirmer la livraison"
                    onPress={confirmWithPhoto}
                    disabled={!photo}
                    containerClassName="mt-3"
                />

                <Pressable
                    className="mt-4 mb-6 items-center"
                    onPress={() => setProofModalVisible(false)}
                >
                    <Text className="text-neutral-500 text-sm">Annuler</Text>
                </Pressable>
                </View>
            </View>
        </Modal>

    </Pressable>
  );
}


function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm text-neutral-600 ${bold ? 'font-semibold text-neutral-900' : ''}`}>{label}</Text>
      <Text className={`text-base ${bold ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}>{value}</Text>
    </View>
  );
}