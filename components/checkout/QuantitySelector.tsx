import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface Props {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export default function QuantitySelector({ quantity, onIncrement, onDecrement }: Props) {
  const scaleMinus = useSharedValue(1);
  const scalePlus = useSharedValue(1);

  const animatedMinus = useAnimatedStyle(() => ({
    transform: [{ scale: scaleMinus.value }],
  }));

  const animatedPlus = useAnimatedStyle(() => ({
    transform: [{ scale: scalePlus.value }],
  }));

  const bounce = (ref: any) => {
    ref.value = 0.85;
    ref.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  return (
    <View className="mt-4 rounded-3xl bg-white p-4 shadow-md"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-sm font-medium text-neutral-500 mb-3">
        Quantité
      </Text>

      <View className="flex-row items-center justify-center">

        {/* MINUS */}
        <Animated.View style={animatedMinus}>
          <Pressable
            onPress={() => {
              bounce(scaleMinus);
              onDecrement();
            }}
            className="h-12 w-12 rounded-full bg-[#F4F0FF] items-center justify-center"
          >
            <Text className="text-2xl text-[#7B3FE4]">−</Text>
          </Pressable>
        </Animated.View>

        {/* QUANTITY */}
        <Text className="mx-6 text-2xl font-semibold text-neutral-900">
          {quantity}
        </Text>

        {/* PLUS */}
        <Animated.View style={animatedPlus}>
          <Pressable
            onPress={() => {
              bounce(scalePlus);
              onIncrement();
            }}
            className="h-12 w-12 rounded-full bg-[#F4F0FF] items-center justify-center"
          >
            <Text className="text-2xl text-[#7B3FE4]">+</Text>
          </Pressable>
        </Animated.View>

      </View>
    </View>
  );
}
