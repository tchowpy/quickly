import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { useNotificationStore } from '../../store/notificationStore';
import { formatDateTime } from '../../utils/format';

export function NotificationsScreen({ navigation }: NativeStackScreenProps<MainStackParamList, 'Notifications'>) {
  const { notifications } = useNotificationStore();

  return (
    <SafeAreaView className="flex-1 bg-[#F5F6FB]" edges={['top', 'left', 'right']}>
      <View className="px-5 pt-10 pb-4">
        <Text className="text-3xl font-semibold text-neutral-900">Notifications</Text>
        <Text className="mt-2 text-sm text-neutral-500">Suivez vos alertes Quickly en temps réel.</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View className="mb-4 rounded-3xl bg-white p-4 shadow-md">
            <Text className="text-base font-semibold text-neutral-900">{item.title}</Text>
            <Text className="mt-1 text-sm text-neutral-500" numberOfLines={3}>
              {item.message}
            </Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-xs uppercase text-neutral-400">{formatDateTime(item.created_at)}</Text>
              {item.order_id ? (
                <Text
                  className="text-sm font-semibold text-[#7B3FE4]"
                  onPress={() => navigation.navigate('OrderDetails', { orderId: item.order_id! })}
                >
                  Voir la commande
                </Text>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <Text className="text-sm text-neutral-500">Aucune notification pour le moment.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
