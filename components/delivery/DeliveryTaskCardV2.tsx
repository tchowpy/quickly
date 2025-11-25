// components/delivery/DeliveryTaskCardV2.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  Image,
  Modal
} from "react-native";
import { MapPin, Phone, Clock, Package } from "lucide-react-native";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { PrimaryButton } from "../ui/PrimaryButton";
import { formatCurrency } from "../../utils/format";

import * as ImagePicker from "expo-image-picker";

interface DeliveryTaskCardV2Props {
  task: any; // delivery_tracking row + joined order/user
  onAccept?: () => void;
  onReject?: () => void;
  onRetrieved?: () => void;
  onInTransit?: () => void;
  onReachedDestination?: () => void;
  onDelivered?: () => void;
  onFailed?: () => void;
}

export function DeliveryTaskCardV2({
  task,
  onAccept,
  onReject,
  onRetrieved,
  onInTransit,
  onReachedDestination,
  onDelivered,
  onFailed,
}: DeliveryTaskCardV2Props) {
  const order = task.order;
  const status = task.status;

  const supplier = task.supplier;
  const client = task.client;

  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);

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
    Linking.openURL(url);
  };

  // -----------------------
  // CONDITIONS D'AFFICHAGE
  // -----------------------
  const isPending = status === "pending";
  const isAssigned = status === "assigned";
  const isRetrieved = status === "retrieved";
  const isInTransit = status === "in_transit";
  const isAtDestination = status === "at_destination";

  const showAcceptRefuse = isPending;
  const showRetrievedBtn = isAssigned;
  const showInTransitBtn = isRetrieved;
  const showReachedBtn = isInTransit;
  const showDeliveredBtn = isAtDestination;
  const allowFailed = isInTransit;

  // -----------------------
  // INFOS À AFFICHER
  // -----------------------
  const showClientInfo = isRetrieved || isInTransit || isAtDestination;
  const showPriceDistance = isRetrieved || isInTransit || isAtDestination;

  // -----------------------
  // CALCUL DISTANCE / ETA
  // -----------------------
  const [courierPos, setCourierPos] = React.useState(null);
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync();
      setCourierPos({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  const distanceKm = useMemo(() => {
    if (!courierPos || !client?.latitude) return null;

    const dist = haversine(
      { latitude: courierPos.latitude, longitude: courierPos.longitude },
      { latitude: client.latitude, longitude: client.longitude }
    );

    return (dist / 1000).toFixed(2);
  }, [courierPos, client]);

  // -----------------------
  // RENDER SECTION TITLE
  // -----------------------
  const SectionTitle = ({ title }) => (
    <Text className="text-xs font-semibold text-neutral-400 uppercase mb-2">
      {title}
    </Text>
  );

  return (
    <View className="bg-white rounded-3xl p-5 shadow-md">
      {/* BADGE */}
      <View className="absolute right-4 top-4 px-3 py-1 rounded-full bg-neutral-100">
        <Text className="text-xs font-bold text-neutral-700">
          {status.toUpperCase()}
        </Text>
      </View>

      {/* PRODUCT */}
      <View className="flex-row items-center mb-4">
        <Package color="#7B3FE4" size={20} />
        <Text className="ml-2 text-base font-semibold text-neutral-900">
          {order?.product_name} × {order?.quantity}
        </Text>
      </View>

      {/* SUPPLIER INFO */}
      <SectionTitle title="Fournisseur" />
      <View className="flex-row items-center mb-4">
        <MapPin color="#7B3FE4" />
        <Text className="ml-2 text-sm text-neutral-700">
          {supplier?.address}
        </Text>
      </View>

      {/* CLIENT INFO */}
      {showClientInfo && (
        <>
          <SectionTitle title="Client" />
          <View className="flex-row items-center mb-4">
            <MapPin color="#3FE47B" />
            <Text className="ml-2 text-sm text-neutral-700">
              {client?.address}
            </Text>
          </View>
        </>
      )}

      {/* DISTANCE + PRIX */}
      {showPriceDistance && (
        <View className="rounded-2xl bg-neutral-50 p-3 mb-4">
          <Text className="text-sm text-neutral-600">Distance</Text>
          <Text className="text-lg font-semibold text-neutral-900">
            {distanceKm ? `${distanceKm} km` : "–"}
          </Text>

          <Text className="mt-3 text-sm text-neutral-600">Prix estimé</Text>
          <Text className="text-lg font-semibold text-neutral-900">
            {formatCurrency(order?.delivery_fee ?? 0)}
          </Text>
        </View>
      )}

      {/* ACTIONS */}
      <View className="mt-4 space-y-3">

        {showAcceptRefuse && (
          <>
            <PrimaryButton label="Accepter la mission" onPress={onAccept} />
            <PrimaryButton
              label="Refuser"
              gradient={["#FDE2E2", "#F6B6B6"]}
              textClassName="text-red-600"
              onPress={onReject}
            />
          </>
        )}

        {isAssigned && (
          <PrimaryButton
            label="J'ai récupéré le colis"
            onPress={() => setProofModalVisible(true)}
          />
        )}
        {showRetrievedBtn && (
          <PrimaryButton
            label="J'ai récupéré le colis"
            onPress={onRetrieved}
          />
        )}

        {showInTransitBtn && (
          <PrimaryButton
            label="Je démarre la livraison"
            onPress={onInTransit}
          />
        )}

        {showReachedBtn && (
          <PrimaryButton
            label="Je suis arrivé à destination"
            onPress={onReachedDestination}
          />
        )}

        {showDeliveredBtn && (
          <PrimaryButton
            label="J'ai livré le colis"
            onPress={() => setProofModalVisible(true)}
          />
        )}

        {allowFailed && (
          <PrimaryButton
            label="Marquer la livraison en échec"
            gradient={["#FDE2E2", "#F6B6B6"]}
            textClassName="text-red-600"
            onPress={onFailed}
          />
        )}

        {/* ITINERAIRE */}
        {courierPos && (
          <Pressable
            onPress={() => {
              const to = showClientInfo ? client : supplier;
              openRoute(courierPos, {
                latitude: to.latitude,
                longitude: to.longitude,
              });
            }}
            className="p-3 rounded-2xl border border-neutral-200 mt-3"
          >
            <Text className="text-center font-semibold text-[#7B3FE4]">
              Ouvrir l’itinéraire
            </Text>
          </Pressable>
        )}
      </View>

      {/* MODALE – PREUVE PHOTO */}
<Modal
  animationType="slide"
  transparent
  visible={proofModalVisible}
  onRequestClose={() => setProofModalVisible(false)}
>
  <View className="flex-1 bg-black/40 justify-end">
    <View className="bg-white p-5 rounded-t-3xl">
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
        className="mt-4"
      />

      <PrimaryButton
        label="Confirmer la livraison"
        onPress={confirmWithPhoto}
        disabled={!photo}
        className="mt-3"
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

    </View>

  );


}
