import React from 'react';
import { FlatList, View } from 'react-native';
import { ProductGridCard } from './ProductGridCard';
import { Product } from '../../types/models';

interface Props {
  products: Product[];
  subcategoryById: Map<string, string>;
  onPressProduct: (id: string) => void;
}

export function ProductGrid({ products, subcategoryById, onPressProduct }: Props) {
  const count = products.length;

  return (
    <View className="mt-4">

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={3}
        scrollEnabled={true}
        contentContainerStyle={{
          paddingVertical: 4,
        }}
        columnWrapperStyle={{
         justifyContent:
    count >= 3
      ? 'space-between' // 3 produits ou plus → grille normale
      : count === 2
        ? 'space-around' // 2 produits → espacés et centrés
        : 'center',       // 1 produit → centré parfaitement
        marginBottom: 18,

        }}

        renderItem={({ item }) => (
          <ProductGridCard
            product={item}
            categoryName={subcategoryById.get(item.subcategory_id ?? '')}
            onPress={() => onPressProduct(item.id)}
          />
        )}
      />

    </View>
  );
}
