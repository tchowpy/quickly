import React from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { MagnifyingGlassIcon } from 'react-native-heroicons/outline';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue 
} from 'react-native-reanimated';

export default function SearchBarBottom({ onFocus }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-full px-5"
    >
      <Pressable
        onPressIn={() => (scale.value = withTiming(0.97, { duration: 80 }))}
        onPressOut={() => (scale.value = withTiming(1, { duration: 80 }))}
        onPress={onFocus}   // <--- Ouvre la modal
      >
        <View className="flex-row items-center rounded-3xl px-5 py-4 border border-neutral-200">
          <MagnifyingGlassIcon size={22} color="#7B3FE4" />

          <TextInput
            editable={false}
            pointerEvents="none" // IMPORTANT pour que Pressable reçoive l’événement
            placeholder="Rechercher un produit…"
            placeholderTextColor="#9CA3AF"
            //className="ml-3 text-[14px] font-medium text-neutral-700"
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}
