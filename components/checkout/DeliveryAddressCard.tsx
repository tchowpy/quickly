import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MapPin } from 'lucide-react-native';

interface Props {
  address?: string | null;
  distanceText?: string;
  onPress: () => void;
}

export default function DeliveryAddressCard({ address, distanceText, onPress }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.delay(150).duration(450).springify()}
      className="w-full mb-5"
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center rounded-3xl bg-white p-4 shadow-md"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        {/* Icon */}
        <View className="h-12 w-12 rounded-2xl bg-[#F4F0FF] items-center justify-center">
          <MapPin size={22} color="#7B3FE4" />
        </View>

        {/* Texts */}
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {address || 'Sélectionner une adresse'}
          </Text>

          <Text className="text-sm text-neutral-500 mt-0.5">
            {distanceText ?? 'Adresse de livraison'}
          </Text>
        </View>

        {/* CTA */}
        <Text className="text-sm font-semibold text-[#7B3FE4] ml-2">
          Modifier
        </Text>
      </Pressable>
    </Animated.View>
  );
}
