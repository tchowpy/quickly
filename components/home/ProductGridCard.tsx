import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { formatCurrency } from '../../utils/format';
import { renderProductIcon } from './iconMappings';
import { Product } from '../../types/models';

interface Props {
  product: Product;
  categoryName?: string;
  onPress: () => void;
}

export function ProductGridCard({ product, categoryName, onPress }: Props) {
  return (
    <Animated.View
     // entering={FadeInUp.duration(350).springify().damping(18)}
      style={{ width: '31%' }}
    >
      <Pressable
        onPress={onPress}
        className="bg-white rounded-3xl p-3 items-center"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >

        {/* ICON */}
        <Animated.View
          entering={ZoomIn.duration(300)}
          className="h-16 w-16 items-center justify-center rounded-full bg-[#F4F0FF] mb-3"
        >
          {renderProductIcon(categoryName, '#7B3FE4')}
        </Animated.View>

        {/* NAME */}
        <Text
          className="text-sm font-medium text-neutral-900 text-center"
          numberOfLines={2}
        >
          {product.name}
        </Text>

        {/* PRICE */}
        <Text className="mt-1 text-sm font-semibold text-[#7B3FE4]">
          {formatCurrency(product.price_regulated ?? product.base_price ?? 0)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
