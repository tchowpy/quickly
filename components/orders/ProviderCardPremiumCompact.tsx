import { useRef } from "react";
import { Animated, Pressable, View, Text, Image } from "react-native";
import { formatCurrency } from "../../utils/format";
import * as Linking from 'expo-linking';
import { PrimaryButton } from "components/ui/PrimaryButton";
import { computeETA } from "utils/eta";

export function ProviderCardPremiumCompact({
  provider,
  index,
  onSelect,
  isClosest=false,
  isSelected=false,
  buttonTitle="Sélectionner"
}: {
  provider: any;
  index: number; // classement 0 → 1er, 1 → 2e…
  onSelect: () => void;
  isClosest?: boolean;
  isSelected?: boolean;
  buttonTitle?: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const handleCall = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    void Linking.openURL(url);
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginBottom: 12,
      }}
    >
    <View
       className={`w-full p-4 rounded-2xl border shadow-sm items-center ${
                  isSelected
                    ? "border-[#7B3FE4] bg-[#F8F5FF]"
                    : "border-white bg-[#F8F5FF]" //"border-neutral-100"
                }`} 
        style={{
          shadowColor: "#7B3FE4",
          shadowOpacity: 0.08,
          shadowRadius: 6,
        }}
      > 
      <Pressable
        className="w-full flex-row items-center"
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onSelect}
      >
        {/* AVATAR */}
        <View className="w-12 h-12 rounded-full bg-[#EFE7FF] mr-4 items-center justify-center">
          <Image
            source={require("../../assets/provider.png")}
            className="w-8 h-8"
          />
        </View>

        {/* INFO BLOCK */}
        <View className="flex-1">
          {/* LIGNE 1 */}
          <View className="flex-row justify-between items-center">
            <Text className="text-base font-semibold text-neutral-900">
              {provider.full_name ?? "Prestataire"}
            </Text>


            <Text className="text-xs font-bold text-[#7B3FE4] mr-2">
              {index === 0 ? "1er" : `${index + 1}e`}
            </Text>

              <Text className="text-base font-bold text-[#7B3FE4]">
                {formatCurrency(provider.total_amount)}
                {/*provider.distance_km.toFixed(1)} km*/}
              </Text>
            
          </View>
            {/* LIGNE 2 */}
          <View className="flex-row items-center mt-1">
            <Text className="text-sm text-neutral-600">
              {provider.location_address ?? "Adresse inconnue"}
            </Text>
          </View>
          {/* LIGNE 3 */}
          <View className="flex-row items-center mt-1">
            {/* BADGE LE PLUS PROCHE */}
            {isClosest && (
              <>
                <Text className="text-xs px-2 py-0.5 bg-[#F1E8FF] text-[#7B3FE4] rounded-full">
                  Le plus proche
                </Text>

                <Text className="mx-2 text-neutral-400">•</Text>
              </>
            )}
            {/*}
            <Text className="ml-2 text-sm text-neutral-600">
              {provider.distance_km.toFixed(1)} km
            </Text>
            
            <Text className="mx-2 text-neutral-400">•</Text>
            */}
            <Text className="text-sm text-neutral-600">
              {computeETA(provider.distance_km)}
            </Text>
            
            <Text className="mx-2 text-neutral-400">•</Text>
            <Text className="text-sm text-neutral-600">⭐ {provider.rating ?? "4.8"}</Text>

          </View>
        </View>
        {/* call flate Icon 
        <Pressable onPress={ async () => {
            handleCall(provider.phone);
        }}>
          <Image
            source={require("../../assets/phone-call.png")}
            className="w-8 h-8 ml-4"
          />
        </Pressable>
        */}
      </Pressable>
      {/* !isSelected && (
      <View className="mt-2 w-full flex-row justify-center">
        <PrimaryButton
            label={buttonTitle}
            onPress={onSelect}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            containerClassName="w-full"
          />
       </View>
       )*/}
        </View>
    </Animated.View>
  );
}
