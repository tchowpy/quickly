import React, {useMemo, useState} from "react";
import { Alert, View, Text } from "react-native";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { OrderSummaryCard } from "./OrderSummaryCard";
import { CourierCard } from "./CourierCard";
import { ProviderCard } from "./ProviderCard";
import { DeliveryReceptionModal } from "./DeliveryReceptionModal";

const STATUSES = [
  { key: 'confirmed', label: 'Vous avez confirmé la commande' },
  { key: 'in_preparation', label: 'Commande en cours de préparation' },
  { key: 'assigned', label: 'Un livreur est en route pour récupérer votre commande' },
  { key: 'in_delivery', label: 'Commande en cours de livraison' },
  { key: 'delivered', label: 'Commande livrée, en attente de confirmation' },
  { key: 'completed', label: 'Commande terminée' },
] as const;

export default function BottomSheetContent({
  order,
  provider,
  courier,
  onCall,
  onNavigate,
  onConfirmReception,
}) {

  const statusIndex = useMemo(() => STATUSES.findIndex((item) => item.key === order?.status), [order?.status]);
  const statusLabel = useMemo(() => STATUSES[statusIndex].label, [statusIndex])
  
  return (
    <BottomSheet snapPoints={["65%", "85%"]} backgroundStyle={{ borderRadius: 28 }}>
      <BottomSheetScrollView style={{ padding: 20 }}>
        {/* TITRE */}
            <View className="flex-row justify-center items-center space-around mb-2">
            <Text className="text-lm font-extrabold text-neutral-900">
              {`${statusLabel}`}
            </Text>
            {/*<Text className="text-tm font-extrabold text-neutral-900">
              {courier?.eta ? `• ${courier.eta}` : ""}
            </Text>*/}
            </View>
            
        {/* TIMELINE 
      <View className="rounded-3xl bg-white p-4 shadow-md mb-2 mt-4">
        <StepCol currentStep={(statusIndex + 1)} />
      </View>*/}
      
        <OrderSummaryCard order={order} />

        {courier && (
          <>
            {/*<Text className="mb-1 text-neutral-500">Livreur</Text>*/}
            <CourierCard user={courier} onCall={onCall} onNavigate={onNavigate} />
          </>
        )}

        {provider && provider.id !== courier?.id && (
          <>
            {/*<Text className="mt-4 mb-1 text-neutral-500">Fournisseur</Text>*/}
            <ProviderCard user={provider} onCall={onCall} onNavigate={onNavigate} />
          </>
        )}

        {/*["delivered", "in_delivery"].includes(order.status) && (
          <PrimaryButton 
          label="Confirmer la réception" 
         // onPress={onConfirmReception} 
          onPress={() => setDeliveryReceptionModalVisible(true)}
          />
        )*/}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

function StepCol({ currentStep }: { currentStep: number }) {
  const steps = STATUSES.map((s) => s.label);

  return (
    <View className="flex-col justify-between">
      {steps.map((label, index) => {
        const active = currentStep > index;

        return (
          <View key={index} className="flex-row items-center flex-1">
            {/* Trait horizontal entre les étapes */}
            {index < steps.length && (
              <View
                className={`w-1 h-full mr-2 ${
                  active ? "bg-[#7B3FE4]" : "bg-neutral-300"
                }`}
              />
            )}
            <View
              className={`mb-2 w-7 h-7 rounded-full items-center justify-center ${
                active ? "bg-[#7B3FE4]" : "bg-neutral-300"
              }`}
            >
              <View className="w-3 h-3 bg-white rounded-full" />
            </View>

            <Text
              className={`mb-2 ml-1 text-xm ${
                active ? "text-neutral-900 font-semibold" : "text-neutral-400"
              }`}
            >
              {label}
            </Text>

            
          </View>
        );
      })}
    </View>
  );
}