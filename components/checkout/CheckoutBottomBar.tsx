import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Props {
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export default function CheckoutBottomBar({ loading, disabled, onPress }: Props) {
  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify()}
      className="absolute bottom-0 left-0 right-0 px-5 pb-6 bg-transparent"
    >
      <View
        className="rounded-2xl shadow-xl"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 6,
        }}
      >
        <Pressable
          disabled={disabled || loading}
          onPress={onPress}
          className={`py-4 rounded-2xl items-center justify-center
            ${disabled ? 'bg-neutral-300' : 'bg-[#7B3FE4]'}`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-lg font-semibold">
              Publier la commande
            </Text>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}
