import React from 'react';
import { Image, Text, View } from 'react-native';
import { Product } from '../../types/models';
import { CardPressable } from '../ui/Card';

interface FeaturedProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  icon?: React.ReactNode;
}

export function FeaturedProductCard({ product, onPress, icon }: FeaturedProductCardProps) {
  return (
    <CardPressable className="mr-3 w-48" onPress={() => onPress?.(product)}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} className="h-28 w-full rounded-2xl" resizeMode="cover" />
      ) : (
        <View className="h-28 w-full items-center justify-center rounded-2xl bg-[#F5F3FF]">
          {icon ?? <Text className="text-4xl">🛒</Text>}
        </View>
      )}
      <View className="mt-3">
        <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
          {product.name}
        </Text>
        {product.price_regulated ? (
          <Text className="text-sm text-neutral-500">{product.price_regulated.toLocaleString()} FCFA</Text>
        ) : null}
      </View>
    </CardPressable>
  );
}
