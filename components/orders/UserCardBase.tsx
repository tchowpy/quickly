import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { MapPin, Phone, Navigation, CheckCircle, Star } from "lucide-react-native";

/* -------------------------------------------------------
GENERIC USER CARD (COURIER / PROVIDER BASE)
--------------------------------------------------------*/
export function UserCardBase({ title, user, distanceKm, eta, onCall, onNavigate }: any) {
    return (
    <View className="rounded-3xl bg-white border border-neutral-200 p-4 shadow-sm mb-2">
        <Text className="text-base font-semibold text-neutral-900 mb-2">{title}</Text>

        <View className="flex-row items-center justify-center" style={{gap:12}}>
                  {/* PHOTO + BADGE */}
            <View>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 31,
                  overflow: "hidden",
                  backgroundColor: "#EEE",
                }}
              >
                <Image
                  source={
                    user.avatar_url
                      ? { uri: user.avatar_url }
                      : require("../../assets/avatar-placeholder.jpg")
                  }
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>

              <View
                style={{
                  position: "absolute",
                  bottom: 6,
                  right: -4,
                  backgroundColor: "#7B3FE4",
                  borderRadius: 30,
                  padding: 4,
                }}
              >
                <CheckCircle size={8} color="white" />
              </View>
            </View>

            <View className="flex-1">
                <Text className="text-base font-semibold text-neutral-900">
                  {user?.full_name}
                </Text>
                {user?.address && user?.role !== 'client' && (
                  <Text className="text-sm text-neutral-900">
                  {user?.address}
                  </Text>
                )}
                {user?.rating && (
                  <View className="flex-row items-center mt-1">
                    <Star size={14} color="#FFA800" />
                    <Text className="ml-1 text-sm text-neutral-500 font-medium">
                      {user.rating.toFixed(1)} 
                    </Text>
                    {distanceKm && (<Text className="text-sm text-neutral-500"> • {eta}</Text>)}
                  </View>
                )}
                
            </View>
        </View>

        {/* BUTTONS FULL WIDTH */}
        {(onCall || onNavigate) && (
          <View className="flex-row mt-4 w-full" style={{ gap: 10 }}>
          { onCall && (
            <Pressable
            onPress={() => onCall?.(user.phone)}
            className="flex-1 flex-row items-center justify-center bg-neutral-100 py-3 rounded-xl"
          >
            <Phone size={20} color="#333" />
            <Text className="ml-2 text-sm font-medium">Appeler</Text>
          </Pressable>
          )}
          {onNavigate && (
            <Pressable
              onPress={() => onNavigate?.(user)}
              className="flex-1 flex-row items-center justify-center bg-[#7B3FE4] py-3 rounded-xl"
            >
              <Navigation size={20} color="white" />
              <Text className="ml-2 text-sm font-medium text-white">Itinéraire</Text>
            </Pressable>
          )}
        </View>
        )}
    </View>
    );
}