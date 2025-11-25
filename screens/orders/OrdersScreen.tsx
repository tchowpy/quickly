import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { useOrders } from '../../hooks/useOrders';
import { ActiveOrderCard } from '../../components/orders/ActiveOrderCard';
import { CardPressable } from '../../components/ui/Card';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { getOrderMode } from 'utils/orderMode';

export function OrdersScreen({ navigation }: NativeStackScreenProps<MainStackParamList, 'OrderHistory'>) {
  const { active, history } = useOrderStore();
  const { fetchOrders } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]" edges={['top', 'left', 'right']}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ListHeaderComponent={
          <View>
            <Text className="text-2xl font-semibold text-neutral-900">Historique des commandes</Text>
            <Text className="mt-2 text-sm text-neutral-600">
              Consultez vos commandes récentes et suivez votre livraison en cours.
            </Text>
            {active.order ? (
              <View className="mt-5">
                <ActiveOrderCard
                  order={active.order}
                  onPress={() => {
                    const activeOrder = active.order;
                    if (!activeOrder) return;
                    if (getOrderMode(activeOrder.status) === 'search') {
                      navigation.navigate('ProviderSearch', { orderId: activeOrder.id });
                      return
                    }
                    if (getOrderMode(activeOrder.status) === 'tracking') {
                      navigation.navigate('OrderTracking', { orderId: activeOrder.id });
                    }
                    
                  }} 
                />
              </View>
            ) : (
              <Text className="mt-5 rounded-3xl bg-white p-4 text-sm text-neutral-500 shadow-md">
                Aucune commande active pour le moment. Passez commande depuis l'accueil !
              </Text>
            )}
            <Text className="mt-8 text-lg font-semibold text-neutral-900">Historique</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CardPressable
            className="mt-3"
            onPress={() => {
              navigation.navigate('OrderDetails', { orderId: item.id })
              return
              if (getOrderMode(item.status) === 'search') {
                navigation.navigate('ProviderSearch', { orderId: item.id });
                return
              }
              if (getOrderMode(item.status) === 'tracking') {
                navigation.navigate('OrderTracking', { orderId: item.id });
                return
              }
              navigation.navigate('OrderDetails', { orderId: item.id })
            }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold text-neutral-900">{item.product_name}</Text>
                <Text className="mt-1 text-xs text-neutral-500">{formatDateTime(item.created_at)}</Text>
              </View>
              <View className="items-end">
                <Text className="text-sm font-semibold text-neutral-900">{formatCurrency(item.total_amount)}</Text>
                <Text className="mt-1 text-xs uppercase text-neutral-500">{item.status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
          </CardPressable>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-sm text-neutral-500">
            Encore aucune commande. Une fois vos commandes passées, elles apparaîtront ici.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
