import React, { useMemo } from 'react';
import { Modal, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { PrimaryButton } from '../ui/PrimaryButton';
import { useOrderStore } from '../../store/orderStore';
import { useOrders } from '../../hooks/useOrders';
import { useOrderRealtime } from '../../hooks/useOrderRealtime';
import { OrderSummary } from '../../types/models';

const STATUSES: Array<{ key: OrderSummary['status']; label: string }> = [
  { key: 'pending_broadcast', label: 'Recherche prestataire' },
  { key: 'accepted', label: 'Prestataire confirmé' },
  { key: 'assigned', label: 'Livreur en route' },
  { key: 'in_delivery', label: 'En livraison' },
  { key: 'delivered', label: 'Livrée - confirmation client' },
  { key: 'completed', label: 'Commande terminée' },
];

interface OrderTrackingModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OrderTrackingModal({ visible, onClose }: OrderTrackingModalProps) {
  const activeOrder = useOrderStore((state) => state.active.order);
  const { confirmReception } = useOrders();
  useOrderRealtime(activeOrder?.id);

  const statusIndex = useMemo(() => {
    if (!activeOrder) {
      return -1;
    }
    return STATUSES.findIndex((status) => status.key === activeOrder.status);
  }, [activeOrder]);

  const initialRegion = useMemo(() => {
    if (!activeOrder?.courier_latitude || !activeOrder.courier_longitude) {
      return {
        latitude: 5.3599517,
        longitude: -4.0082563,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: activeOrder.courier_latitude,
      longitude: activeOrder.courier_longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  }, [activeOrder?.courier_latitude, activeOrder?.courier_longitude]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} navigationBarTranslucent={true} statusBarTranslucent={false}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-6 shadow-xl">
          <View className="mb-4 h-1 w-12 self-center rounded-full bg-neutral-300" />
          <Text className="text-2xl font-semibold text-neutral-900">Suivi de livraison</Text>
          {activeOrder ? (
            <>
              <Text className="mt-1 text-sm text-neutral-500">Commande #{activeOrder.id.slice(0, 6).toUpperCase()}</Text>
              <View className="mt-4 h-48 overflow-hidden rounded-3xl bg-[#F5F6FB]">
                <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
                  {activeOrder.courier_latitude && activeOrder.courier_longitude ? (
                    <Marker
                      coordinate={{
                        latitude: activeOrder.courier_latitude,
                        longitude: activeOrder.courier_longitude,
                      }}
                      title="Livreur"
                    />
                  ) : null}
                </MapView>
              </View>
              <View className="mt-5 space-y-3">
                {STATUSES.map((status, index) => (
                  <View key={status.key} className="flex-row items-center">
                    <View
                      className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${
                        index <= statusIndex ? 'bg-[#7B3FE4]' : 'bg-neutral-200'
                      }`}
                    >
                      <Text className="text-sm font-semibold text-white">{index + 1}</Text>
                    </View>
                    <Text
                      className={`text-base ${
                        index <= statusIndex ? 'font-semibold text-neutral-900' : 'text-neutral-400'
                      }`}
                    >
                      {status.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="mt-6 flex-col gap-3">
                <PrimaryButton
                  label="Fermer"
                  onPress={onClose}
                  gradient={['#EFEFEF', '#EFEFEF']}
                  textClassName="text-neutral-700"
                />
                <PrimaryButton
                  label={activeOrder.status === 'delivered' ? 'Confirmer réception' : 'Retour'}
                  onPress={() => {
                    if (activeOrder.status === 'delivered') {
                      void confirmReception(activeOrder.id);
                    } else {
                      onClose();
                    }
                  }}
                />
              </View>
            </>
          ) : (
            <View className="mt-6 items-center">
              <Text className="text-sm text-neutral-500">
                Aucune commande active pour le moment. Passez une commande depuis l&apos;accueil.
              </Text>
              <PrimaryButton
                label="Fermer"
                onPress={onClose}
                gradient={['#EFEFEF', '#EFEFEF']}
                textClassName="mt-6 text-neutral-700"
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
