import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { renderProductIcon } from '../home/iconMappings';
import { Product } from '../../types/models';

interface Props {
  product: Product;
}

export default function HeaderProductCard({ product }: Props) {
  return (
    <Animated.View
     // entering={FadeInDown.duration(450).springify().damping(12)}
      className="items-center mb-6"
    >
      <View
        className="w-full rounded-3xl bg-white p-6 shadow-md items-center"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
        }}
      >
        <Animated.View
          entering={ZoomIn.duration(400)}
          className="h-32 w-32 rounded-3xl bg-[#F4F0FF] items-center justify-center mb-4"
        >
          {renderProductIcon(
            product.subcategory_id ?? undefined,
            '#7B3FE4'
          )}
        </Animated.View>

        <Text className="text-xl font-semibold text-neutral-900 text-center">
          {product.name}
        </Text>

        {product.description ? (
          <Text className="mt-1 text-sm text-neutral-500 text-center px-3">
            {product.description}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}
