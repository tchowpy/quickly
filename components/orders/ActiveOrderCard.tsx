import React from 'react';
import { Text, View } from 'react-native';
import { OrderSummary } from '../../types/models';
import { CardPressable } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface ActiveOrderCardProps {
  order: OrderSummary;
  onPress?: (order: OrderSummary) => void;
}

const STATUS_LABEL: Record<OrderSummary['status'], string> = {
  created: 'Nouvelle commande',
  pending_broadcast: 'Recherche prestataire',
  broadcasted: 'Recherche prestataire',
  accepted: 'Prestataire trouvé',
  confirmed: 'Prestataire confirmé',
  in_preparation: 'En préparation',
  assigned: 'Livreur assigné',
  in_delivery: 'En cours de livraison',
  delivered: 'En attente de confirmation',
  completed: 'Terminée',
  disputed: 'Signalée',
  cancelled: 'Annulée',
};

export function ActiveOrderCard({ order, onPress }: ActiveOrderCardProps) {
  return (
    <CardPressable className="mb-4 mx-1" onPress={() => onPress?.(order)}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-sm font-medium text-neutral-500">Commande en cours</Text> 
        </View>
        <View className="rounded-full bg-[#F4F0FF] px-2 py-1">
          <Text className="text-xs font-semibold text-[#7B3FE4]">{STATUS_LABEL[order.status]}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
      <Text className="mt-1 text-xl font-semibold text-neutral-900">{order.product_name}</Text>
      </View>
      <View className="mt-3 flex-row justify-between">
        <View>
          {/*<Text className="text-sm text-neutral-500">Total</Text>*/}
          <Text className="text-lg font-semibold text-neutral-900">{formatCurrency(order.unit_price)}</Text>
        </View>
        <View>
          {/*<Text className="text-sm text-neutral-500">Quantité</Text>*/}
          <Text className="text-lg font-semibold text-neutral-900">×{order.quantity}</Text>
        </View>
      </View>
    </CardPressable>
  );
}
