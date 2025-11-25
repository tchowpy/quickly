import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, Alert, Text, View, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainStackParamList } from '../../navigation/types';
import { useOrderStore } from '../../store/orderStore';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useOrders } from '../../hooks/useOrders';
import { getOrderMode } from 'utils/orderMode';
import { DeliveryReceptionModal } from 'components/orders/DeliveryReceptionModal';
import { DeliveryFeedbackModal } from 'components/orders/DeliveryFeedbackModal';
import { DeliveryDisputeModal } from 'components/orders/DeliveryDisputeModal';

import { ThumbsUp, ThumbsDown } from "lucide-react-native";

const STATUSES = [
  { key: 'accepted', label: 'Prestataires trouvés' },
  { key: 'confirmed', label: 'Vous avez confirmé la commande' },
  { key: 'in_preparation', label: 'Commande en cours de préparation' },
  { key: 'assigned', label: 'Un livreur est en route pour récupérer votre commande' },
  { key: 'in_delivery', label: 'Commande en cours de livraison' },
  { key: 'delivered', label: 'Commande livrée, en attente de confirmation' },
  { key: 'completed', label: 'Commande terminée' },
  { key: 'cancelled', label: 'Commande annulée' },
  { key: 'disputed', label: 'Réclamation remontée sur la commande. Arbitrage encours...' },
] as const;

export function OrderDetailsScreen({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'OrderDetails'>) {
  const { orderId } = route.params;
  const { history, active } = useOrderStore();
  const { confirmReception } = useOrders();

  const order = useMemo(() => history.find((item) => item.id === orderId) ?? active.order, [active.order, history, orderId]);

  const statusIndex = useMemo(() => STATUSES.findIndex((item) => item.key === order?.status), [order?.status]);
  const statusLabel = useMemo(() => STATUSES[statusIndex].label ?? order?.status, [statusIndex])

  const [deliveryReceptionModalVisible, setDeliveryReceptionModalVisible] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const [sentiment, setSentiment] = useState<"positive" | "negative" | "" >("");


  useEffect(() => {
    if (sentiment === "") return 
    setShowFeedback(true)
  }, [sentiment]);
  
  if (!order) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['top', 'bottom']}>
        <Text className="text-base text-neutral-600">Commande introuvable.</Text>
      </SafeAreaView>
    );
  }

  const openSupport = () => {
    navigation.getParent()?.navigate('Support', { orderId: order.id });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View className="rounded-3xl bg-white p-5 shadow-md">
          <Text className="text-sm font-medium text-neutral-500">Commande #{order.id.slice(0, 6).toUpperCase()}</Text>
          <Text className="mt-2 text-2xl font-semibold text-neutral-900">{order.product_name}</Text>
          <Text className="mt-1 text-sm text-neutral-500">Passée le {formatDateTime(order.created_at)}</Text>
          <View className="mt-5 space-y-2">
            <Row label="Quantité" value={`×${order.quantity}`} />
            <Row
              label="Produit"
              value={formatCurrency(order.total_price ?? order.unit_price ?? order.total_amount)}
            />
            <Row label="Frais de service" value={formatCurrency(order.service_fee)} />
            <Row label="Livraison" value={formatCurrency(order.delivery_fee)} />
            <View className="mt-3 border-t border-dashed border-neutral-200 pt-3">
              <Row label="Total" value={formatCurrency(order.total_amount)} bold />
            </View>
          </View>
        </View>
        <View className="mt-5 rounded-3xl bg-white p-5 shadow-md">
          <Text className="text-sm font-medium text-neutral-500">Statut actuel</Text>
          <Text className="mt-2 text-lg font-semibold text-neutral-900">
            {/*order.status.replace(/_/g, ' ')*/}
            {statusLabel}
          </Text>
        </View>
        {/* Choix du sentiment */}
        {order.status === 'completed' && (
          <>
          <View className="items-center mt-6">
          <Text className="text-neutral-500mb-2 mt-6">Évaluez la prestation</Text>
          </View>
          <View className="flex-row justify-around items-center mt-4 mb-6">
            <Pressable
              onPress={() => {
                setSentiment("positive");
                //setShowFeedback(true)
                //setTags([]);
              }}
              className={`flex-row items-center px-4 py-2 rounded-xl border ${
                sentiment === "positive"
                  ? "border-green-500 bg-green-50"
                  : "border-neutral-300"
              }`}
            >
              <ThumbsUp
                size={18}
                color={sentiment === "positive" ? "#16A34A" : "#555"}
              />
              <Text className="ml-2 font-medium">Positive</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSentiment("negative");
                //setShowFeedback(true)
                //setTags([]);
              }}
              className={`flex-row items-center px-4 py-2 rounded-xl border ${
                sentiment === "negative"
                  ? "border-red-500 bg-red-50"
                  : "border-neutral-300"
              }`}
            >
              <ThumbsDown
                size={18}
                color={sentiment === "negative" ? "#DC2626" : "#555"}
              />
              <Text className="ml-2 font-medium">Négative</Text>
            </Pressable>
          </View>
          </>
          )}
      </ScrollView>
      <View className="border-t border-neutral-100 px-5 py-4">
        {['delivered', 'in_delivery'].includes(order.status) ? (
          <PrimaryButton label="Confirmer la réception" onPress={() => setDeliveryReceptionModalVisible(true)} //onPress={() => confirmReception(order.id)} 
          />
        ) : (
          <PrimaryButton
            label="Suivre la commande"
            onPress={() => {
              if (getOrderMode(order.status) === 'search') {
                navigation.navigate('ProviderSearch', { orderId: order.id });
                return
              }

              if (getOrderMode(order.status) === 'tracking') {
                navigation.navigate('OrderTracking', { orderId: order.id });
              }
            }}
          />
        )}
        {['delivered', 'in_delivery'].includes(order.status) ? (
        <PrimaryButton
          label="Signaler un problème"
          gradient={['#FEE2E2', '#FEE2E2']}
          textClassName="text-red-600"
          containerClassName="mt-3"
          //onPress={openSupport}
          onPress={() => setShowDispute(true)}
        />
        ) : null}
      </View>
      <DeliveryReceptionModal
        visible={deliveryReceptionModalVisible}
        onClose={() => setDeliveryReceptionModalVisible(false)}
        order={order}
        onNotReceived={() => {
          setDeliveryReceptionModalVisible(false);
          Alert.alert("Attention", "Signalez le problème au support.");
        }}
        onConfirmReceived={async () => {
          setDeliveryReceptionModalVisible(false);
          await confirmReception(order.id);
        }}
      />
      <DeliveryFeedbackModal
        visible={showFeedback}
        defaultSentiment={sentiment}
        onClose={() => {
          setSentiment("");
          setShowFeedback(false)}
        }
        onSubmit={(data) => {
          console.log("Feedback complet :", data);
          // TODO: sauvegarder dans Supabase vie un edge Function
        }}
      />
      <DeliveryDisputeModal
        visible={showDispute}
        onClose={() => setShowDispute(false)}
        onSubmit={(data) => {
          console.log("Dispute complet :", data);
          // TODO: sauvegarder dans Supabase vie un edge Function
        }}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={`text-sm text-neutral-600 ${bold ? 'font-semibold text-neutral-900' : ''}`}>{label}</Text>
      <Text className={`text-base ${bold ? 'font-semibold text-neutral-900' : 'text-neutral-800'}`}>{value}</Text>
    </View>
  );
}
