import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { Category, Product } from '../../types/models';
import { useCatalogStore } from '../../store/catalogStore';
import { CategoryPill } from './CategoryPill';
import { renderCategoryIcon, renderProductIcon } from './iconMappings';
import { Card, CardPressable } from '../ui/Card';
import { PrimaryButton } from '../ui/PrimaryButton';
import { formatCurrency } from '../../utils/format';

interface QuickOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (productId: string, quantity: number) => void;
}

export function QuickOrderModal({ visible, onClose, onConfirm }: QuickOrderModalProps) {
  const { categories, products, subcategories } = useCatalogStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const categoryList: Category[] = useMemo(() => categories.slice(0, 9), [categories]);

  const categorySubMap = useMemo(() => {
    const map = new Map<string, string[]>();
    subcategories.forEach((sub) => {
      if (!sub.category_id) {
        return;
      }
      const list = map.get(sub.category_id) ?? [];
      list.push(sub.id);
      map.set(sub.category_id, list);
    });
    return map;
  }, [subcategories]);

  const availableProducts: Product[] = useMemo(() => {
    if (!selectedCategory) {
      return products.slice(0, 12);
    }
    const subIds = categorySubMap.get(selectedCategory) ?? [];
    return products.filter((product) => product.subcategory_id && subIds.includes(product.subcategory_id));
  }, [products, selectedCategory, categorySubMap]);

  const subcategoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    subcategories.forEach((sub) => {
      if (sub.id) {
        map.set(sub.id, sub.name);
      }
    });
    return map;
  }, [subcategories]);

  const increment = () => setQuantity((value) => Math.min(10, value + 1));
  const decrement = () => setQuantity((value) => Math.max(1, value - 1));

  const handleConfirm = () => {
    const productId = selectedProductId ?? availableProducts[0]?.id;
    if (!productId) {
      return;
    }
   onConfirm(productId, quantity);
   onClose();
   setQuantity(1);
    setSelectedCategory(null);
    setSelectedProductId(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} navigationBarTranslucent={true} statusBarTranslucent={false}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-6 shadow-xl">
          <View className="mb-4 h-1 w-12 self-center rounded-full bg-neutral-300" />
          <Text className="text-2xl font-semibold text-neutral-900">Nouvelle commande</Text>
          <Text className="mt-2 text-sm text-neutral-500">
            Sélectionnez une catégorie puis un produit pour démarrer rapidement.
          </Text>

          <Text className="mt-6 text-xs font-semibold uppercase text-neutral-500">Catégories</Text>
          <FlatList
            data={categoryList}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12, marginTop: 12 }}
            renderItem={({ item }) => (
              <View style={{ width: '32%' }}>
                <CategoryPill
                  category={item}
                  icon={renderCategoryIcon(item.name)}
                  active={selectedCategory === item.id}
                  onPress={(category) => {
                    setSelectedCategory((prev) => (prev === category.id ? null : category.id));
                    setSelectedProductId(null);
                  }}
                  className="items-center justify-center"
                />
              </View>
            )}
          />

          <Text className="mt-4 text-xs font-semibold uppercase text-neutral-500">Produits</Text>
          <FlatList
            data={availableProducts}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item }) => (
              <CardPressable
                className={`rounded-3xl bg-white p-4 ${selectedProductId === item.id ? 'border border-[#7B3FE4]' : ''}`}
                onPress={() => setSelectedProductId(item.id)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F4F0FF]">
                      {renderProductIcon(subcategoryNameById.get(item.subcategory_id ?? '') ?? undefined, '#7B3FE4')}
                    </View>
                    <View style={{ maxWidth: 200 }}>
                      <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.description ? (
                        <Text className="text-xs text-neutral-500" numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text className="text-base font-semibold text-neutral-900">
                    {formatCurrency(item.price_regulated ?? item.base_price ?? 0)}
                  </Text>
                </View>
              </CardPressable>
            )}
            ListEmptyComponent={
              <Card className="mt-4 items-center justify-center bg-white p-4">
                <Text className="text-sm text-neutral-500">Aucun produit disponible pour cette catégorie.</Text>
              </Card>
            }
          />

          <Card className="mt-6 flex-row items-center justify-between bg-white p-4">
            <View>
              <Text className="text-sm text-neutral-500">Quantité</Text>
              <Text className="text-lg font-semibold text-neutral-900">{quantity}</Text>
            </View>
            <View className="flex-row items-center overflow-hidden rounded-full border border-neutral-200">
              <Pressable className="px-4 py-1.5" onPress={decrement}>
                <Text className="text-xl text-neutral-700">−</Text>
              </Pressable>
              <View className="border-x border-neutral-200 px-4 py-1.5">
                <Text className="text-base font-semibold text-neutral-900">{quantity}</Text>
              </View>
              <Pressable className="px-4 py-1.5" onPress={increment}>
                <Text className="text-xl text-neutral-700">+</Text>
              </Pressable>
            </View>
          </Card>

         <View className="mt-6 flex-row gap-3">
           <PrimaryButton
             label="Annuler"
             onPress={() => {
               onClose();
               setQuantity(1);
                setSelectedCategory(null);
                setSelectedProductId(null);
              }}
              gradient={['#F0F0F0', '#F0F0F0']}
              textClassName="text-neutral-600"
            />
            <PrimaryButton
              label="Continuer"
              onPress={handleConfirm}
              disabled={!availableProducts.length}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
