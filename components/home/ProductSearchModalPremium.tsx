import React, { useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, Platform } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { formatCurrency } from 'utils/format';
import { renderCategoryIcon, renderProductIcon } from './iconMappings';
import { Category, Product } from 'types/models';
import { CategoryPill } from './CategoryPill';

export default function ProductSearchModalPremium({
  visible,
  onClose,
  query,
  onQueryChange,
  categories,
  products,
  categoryFilter,
  onSelectCategory,
  onSelectProduct,
  subcategoryById,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  products: Product[];
  categories: Category[];
  categoryFilter: string | null;
  subcategoryById: Map<string, string>;
  onSelectProduct: (productId: string) => void;
  onSelectCategory: (categoryId: string) => void;
}) {
  const sheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['60%', '90%'], []);

  if (!visible) return null;

  return (
    <Animated.View 
      entering={SlideInUp} 
      className="absolute inset-0 z-50"
    >
      {/* Backdrop blur pour look premium */}
      <Pressable onPress={onClose} className="absolute inset-0">
        <BlurView tint="dark" intensity={40} className="flex-1" />
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        index={1}
        snapPoints={snapPoints}
        onClose={onClose}
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 60 }}
      >
        <KeyboardAwareScrollView
          enableOnAndroid
          extraScrollHeight={50}
          keyboardOpeningTime={0}
          showsVerticalScrollIndicator={false}
        >
          <View className="px-5 pt-3 pb-10">

            {/* HEADER */}
            <Text className="text-xl font-bold text-neutral-900">
              Que voulez-vous commander ?
            </Text>

            {/* SEARCH BAR */}
            <TextInput
              placeholder="Rechercher un produit"
              placeholderTextColor="#9CA3AF"
              className="mt-4 rounded-2xl border border-neutral-200 px-4 py-3 text-base"
              value={query}
              onChangeText={onQueryChange}
            />

            {/* CATEGORIES (sticky) */}
            <BottomSheetScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 14 }}
              style={{ flexGrow: 0 }}
            >
              {categories.map((item) => (
                <CategoryPill
                    key={item.id}
                    category={item}
                    icon={renderCategoryIcon(item.name)}
                    active={categoryFilter === item.id}
                    className="mr-3"
                    onPress={() => onSelectCategory(item.id)}
                />
              ))}
            </BottomSheetScrollView>

            {/* GRID PRODUITS */}
            <FlatList
              data={products}
              keyExtractor={(p) => p.id}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={{
                justifyContent:
                  products.length >= 3 ? 'space-between' :
                  products.length === 2 ? 'space-around' : 'center',
                marginBottom: 14,
              }}
              renderItem={({ item }) => (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectProduct(item.id)}
                  className="bg-[#F9FAFB] rounded-3xl p-3 items-center"
                  style={{ width: '31%' }}
                >
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-white mb-3">
                    {renderProductIcon(
                      subcategoryById.get(item.subcategory_id ?? '') ?? undefined,
                      '#7B3FE4'
                    )}
                  </View>

                  <Text className="text-sm font-semibold text-neutral-900 text-center" numberOfLines={2}>
                    {item.name}
                  </Text>

                  <Text className="mt-1 text-xs font-semibold text-[#7B3FE4]">
                    {formatCurrency(item.price_regulated ?? item.base_price ?? 0)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </KeyboardAwareScrollView>
      </BottomSheet>
    </Animated.View>
  );
}
