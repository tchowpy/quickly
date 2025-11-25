import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { Phone, CheckCircle, Navigation } from "lucide-react-native";

export function DeliveryPartnerCard({
  partner,
  distanceKm,
  eta,
  onPressCall,
  onPressNavigate,
}: {
  partner: {
    full_name: string;
    avatar_url?: string | null;
    phone?: string | null;
    vehicle_type?: string | null; // moto, voiture, etc (optionnel)
  };
  distanceKm?: number | null;
  eta?: string | null; // e.g. "5-7 min"
  onPressCall?: () => void;
  onPressNavigate?: () => void;
}) {
  return (
    <View
      className="bg-white border border-neutral-200 rounded-3xl p-4 flex-row shadow-sm"
      style={{ gap: 14 }}
    >
      {/* PHOTO + BADGE */}
      <View>
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            overflow: "hidden",
            backgroundColor: "#EEE",
          }}
        >
          <Image
            source={
              partner.avatar_url
                ? { uri: partner.avatar_url }
                : require("../../assets/avatar-placeholder.jpg")
            }
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 10,
            right: -4,
            backgroundColor: "#7B3FE4",
            borderRadius: 30,
            padding: 4,
          }}
        >
          <CheckCircle size={16} color="white" />
        </View>
      </View>

      {/* INFORMATIONS DU LIVREUR */}
      <View style={{ flex: 1 }}>
        <Text className="text-base font-bold text-neutral-900" numberOfLines={1}>
          {partner.full_name ?? "Livreur"}
        </Text>

        {partner.vehicle_type && (
          <Text className="text-xs text-neutral-500 mt-1">
            {partner.vehicle_type}
          </Text>
        )}

        {/* Distance & ETA */}
        {(distanceKm || eta) && (
          <View className="mt-2 flex-row items-center" style={{ gap: 14 }}>
            {distanceKm && (
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Navigation size={16} color="#7B3FE4" />
                <Text className="text-xs text-neutral-700">
                  {distanceKm} km
                </Text>
              </View>
            )}

            {eta && (
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <Text className="text-xs font-semibold text-[#7B3FE4]">
                  {eta}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Boutons mini */}
        <View className="flex-row mt-3" style={{ gap: 12 }}>
          {onPressCall && (
            <Pressable
              onPress={onPressCall}
              className="flex-row items-center px-3 py-2 rounded-xl bg-[#F8F5FF]"
            >
              <Phone color="#7B3FE4" size={16} />
              <Text className="ml-2 text-xs font-semibold text-[#7B3FE4]">
                Appeler
              </Text>
            </Pressable>
          )}

          {onPressNavigate && (
            <Pressable
              onPress={onPressNavigate}
              className="flex-row items-center px-3 py-2 rounded-xl bg-[#F8F5FF]"
            >
              <Navigation color="#7B3FE4" size={16} />
              <Text className="ml-2 text-xs font-semibold text-[#7B3FE4]">
                Itinéraire
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
