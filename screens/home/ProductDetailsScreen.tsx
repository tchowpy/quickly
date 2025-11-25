import React, { useMemo } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainStackParamList } from '../../navigation/types';
import { useCatalogStore } from '../../store/catalogStore';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { formatCurrency } from '../../utils/format';

export function ProductDetailsScreen({
  navigation,
  route,
}: NativeStackScreenProps<MainStackParamList, 'ProductDetails'>) {
  const { productId } = route.params;
  const { products, subcategories } = useCatalogStore();

  const product = useMemo(() => products.find((item) => item.id === productId), [products, productId]);
  const subcategory = useMemo(
    () => subcategories.find((sub) => sub.id === product?.subcategory_id),
    [product?.subcategory_id, subcategories],
  );

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['top', 'bottom']}>
        <Text className="text-base text-neutral-600">Produit introuvable.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} className="h-72 w-full" resizeMode="cover" />
        ) : (
          <View className="h-72 w-full items-center justify-center bg-[#F5F3FF]">
            <Text className="text-6xl">🛍️</Text>
          </View>
        )}
        <View className="px-5 py-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-semibold text-neutral-900">{product.name}</Text>
            <Text className="text-xl font-semibold text-[#7B3FE4]">
              {formatCurrency(product.price_regulated ?? product.base_price ?? 0)}
            </Text>
          </View>
          {subcategory ? (
            <Text className="mt-2 text-sm text-neutral-500">{subcategory.name}</Text>
          ) : null}
          {product.description ? (
            <Text className="mt-4 text-base leading-6 text-neutral-700">{product.description}</Text>
          ) : null}
        </View>
      </ScrollView>
      <View className="border-t border-neutral-100 px-5 py-4">
        <PrimaryButton
          label="Commander"
          onPress={() => navigation.navigate('Checkout', { productId: product.id })}
        />
      </View>
    </SafeAreaView>
  );
}
