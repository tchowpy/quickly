import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MainStackParamList } from '../../navigation/types';
import { useCatalogStore } from '../../store/catalogStore';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { useOrderStore } from '../../store/orderStore';
import { supabase } from '../../lib/supabase';

import { PricingEstimate } from '../../types/models';
import { computeFallbackEstimate } from '../../utils/fallbackEstimate';

// PREMIUM COMPONENTS
import HeaderProductCard from '../../components/checkout/HeaderProductCard';
import DeliveryAddressCard from '../../components/checkout/DeliveryAddressCard';
import DeliveryAddressModal from '../../components/checkout/DeliveryAddressModal';
import CostEstimateCard from '../../components/checkout/CostEstimateCard';
import QuantitySelector from '../../components/checkout/QuantitySelector';
import CheckoutBottomBar from '../../components/checkout/CheckoutBottomBar';
import { PrimaryButton } from 'components/ui/PrimaryButton';

export function CheckoutScreen({
  navigation,
  route,
}: NativeStackScreenProps<MainStackParamList, 'Checkout'>) {
  const { productId, quantity: initialQty = 1 } = route.params;

  const { products } = useCatalogStore();
  const { profile, user } = useSupabaseAuth();
  const { setActiveOrder } = useOrderStore();

  const product = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  // Quantity
  const [quantity, setQuantity] = useState(initialQty);

  // Estimate
  const [estimate, setEstimate] = useState<PricingEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Address management
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    label: string;
    latitude: number;
    longitude: number;
  } | null>({label: profile?.address ?? '', latitude: profile?.latitude ?? 0, longitude: profile?.longitude ?? 0});

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----------------------------------------------------------------------
  // FETCH PRICING ESTIMATE
  // ----------------------------------------------------------------------

  useEffect(() => {
    if (!product) return;

    const fetchEstimate = async () => {
      try {
        setIsEstimating(true);

        const { data, error } = await supabase.functions.invoke<PricingEstimate>(
          'pricing-estimate',
          {
            body: {
              product_id: product.id,
              quantity,
              unit_price: product.price_regulated ?? product.base_price,
              client_location: {
                latitude: selectedAddress?.latitude ?? profile?.latitude,
                longitude: selectedAddress?.longitude ?? profile?.longitude,
              },
            },
          }
        );

        if (error || !data) {
          setEstimate(
            computeFallbackEstimate(
              product.price_regulated ?? product.base_price ?? 0,
              quantity
            )
          );
          return;
        }

        setEstimate(data);
      } catch (err) {
        setEstimate(
          computeFallbackEstimate(
            product.price_regulated ?? product.base_price ?? 0,
            quantity
          )
        );
      } finally {
        setIsEstimating(false);
      }
    };

    fetchEstimate();
  }, [
    product,
    quantity,
    selectedAddress?.latitude,
    selectedAddress?.longitude,
    profile?.latitude,
    profile?.longitude,
  ]);

  // ----------------------------------------------------------------------
  // HANDLE SUBMIT
  // ----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Session expirée', 'Veuillez vous reconnecter.');
      return;
    }
    if (!estimate || !product) return;

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('orders')
        .insert({
          client_id: profile?.id,
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: product.price_regulated ?? product.base_price,
          total_price: estimate.product_price,
          service_fee: estimate.service_fee,
          delivery_fee: estimate.delivery_fee,
          total_amount: estimate.total_amount,
          status: 'pending_broadcast',
          latitude: selectedAddress?.latitude ?? profile?.latitude,
          longitude: selectedAddress?.longitude ?? profile?.longitude,
          location_address: selectedAddress?.label ?? profile?.address,
        })
        .select()
        .maybeSingle();

      if (error || !data) throw error;

      // Set active order
      setActiveOrder({
        id: data.id,
        product_id: data.product_id,
        product_name: data.product_name,
        quantity: data.quantity,
        unit_price: Number(data.unit_price),
        total_price: Number(data.total_price),
        service_fee: Number(data.service_fee),
        delivery_fee: Number(data.delivery_fee),
        total_amount: Number(data.total_amount),
        payment_mode: data.payment_mode,
        status: data.status,
        created_at: data.created_at,
        latitude: selectedAddress?.latitude ?? profile?.latitude,
        longitude: selectedAddress?.longitude ?? profile?.longitude,
        location_address: selectedAddress?.label ?? profile?.address,
      });
      
      navigation.navigate('ProviderSearch', { orderId: data.id });
    } catch (err) {
      Alert.alert(
        'Erreur',
        "Une erreur est survenue lors de la création de votre commande."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------

  if (!product) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-600">Produit introuvable.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]">
      <View className="flex-1 px-5 py-6">

        {/** PRODUCT HEADER (IMAGE / ICON) */}
        <HeaderProductCard product={product} />

        {/** DELIVERY ADDRESS */}
        <DeliveryAddressCard
          address={selectedAddress?.label ?? profile?.address}
          onPress={() => setAddressModalVisible(true)}
        />

        {/** QUANTITY SELECTOR */}
        <QuantitySelector
          quantity={quantity}
          onIncrement={() => setQuantity((q) => Math.min(q + 1, 10))}
          onDecrement={() => setQuantity((q) => Math.max(q - 1, 1))}
        />

        {/** COST ESTIMATE */}
        <CostEstimateCard estimate={estimate} isLoading={isEstimating} />
      </View>

      {/** BOTTOM BUTTON BAR 
      <CheckoutBottomBar
        disabled={!estimate || isEstimating}
        loading={isSubmitting}
        onPress={handleSubmit}
      />
      */}
      <View className="p-5">
      <PrimaryButton
          label={isEstimating ? 'Calcul des frais...' : 'Publier la commande'}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isEstimating || isSubmitting || !estimate}
        />
      </View>

      {/** ADDRESS MODAL */}
      <DeliveryAddressModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        //onSelect={(addr) => setSelectedAddress(addr)}
        onValidate={(data) => {
            console.log("Adresse validée :", data);
            setSelectedAddress({label: data.address, latitude: data.latitude, longitude: data.longitude});
        }}
        initialLatitude={selectedAddress?.latitude}
        initialLongitude={selectedAddress?.longitude}
        initialAddress={selectedAddress?.label}
      />
    </SafeAreaView>
  );
}
