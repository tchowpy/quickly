import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PricingEstimate } from '../../types/models';
import { formatCurrency, formatDistance } from '../../utils/format';

interface Props {
  estimate: PricingEstimate | null;
  isLoading: boolean;
}

export default function FinalCostEstimateCard({ estimate, isLoading }: Props) {
  if (isLoading) {
    return (
      <Animated.View
        entering={FadeInDown.duration(450)}
        className="rounded-3xl bg-white p-5 shadow-md mt-2"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="h-5 bg-neutral-200 rounded w-32 mb-4" />
        <View className="space-y-3">
          <View className="h-4 bg-neutral-200 rounded w-full" />
          <View className="h-4 bg-neutral-200 rounded w-full" />
          <View className="h-4 bg-neutral-200 rounded w-4/5" />
        </View>
      </Animated.View>
    );
  }

  if (!estimate) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(450).springify()}
      className="rounded-3xl bg-white p-5 shadow-md"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-sm font-medium text-neutral-500">Coûts</Text>

      <View className="mt-4 space-y-3">

        {/* PRODUCT */}
        <Row
          label="Produit"
          value={formatCurrency(estimate.product_price)}
        />

        {/* SERVICE FEE */}
        <Row
          label="Frais de service"
          value={formatCurrency(estimate.service_fee)}
        />

        {/* DELIVERY FEE */}
        <Row
          label={`Frais de Livraison`}
          value={`${formatCurrency(estimate.delivery_fee)}`}    
        />

        {/* ✅ TOTAL */}
        <View className="border-t border-dashed border-neutral-200 pt-3 mt-3">
          <Row
            label="Total"
            value={formatCurrency(estimate.total_amount)}
            bold
          />
        </View>
        
      </View>
    </Animated.View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text
        className={`text-sm text-neutral-600 ${
          bold ? 'font-semibold text-neutral-900' : ''
        }`}
      >
        {label}
      </Text>

      <Text
        className={`text-base ${
          bold ? 'font-semibold text-neutral-900' : 'text-neutral-800'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
