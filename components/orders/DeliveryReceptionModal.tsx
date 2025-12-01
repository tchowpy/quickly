import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { X } from "lucide-react-native";

export function DeliveryReceptionModal({
  visible,
  onClose,
  order,
  onConfirmReceived,
  onNotReceived,
}) {
  const [selected, setSelected] = useState<"received" | "not_received" | null>("received");

  return (
    <Modal visible={visible} 
    transparent animationType="slide"
    navigationBarTranslucent={true} statusBarTranslucent={false}
    onRequestClose={onClose}
    allowSwipeDismissal={true}
    onDismiss={onClose}
    onBlur={onClose}
    >
      <TouchableWithoutFeedback >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableWithoutFeedback>
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]" style={{paddingBottom:50}}>
          
          {/* HEADER */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-neutral-900">
              Avez-vous bien reçu votre commande ?
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#444" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            
            {/* ❌ OPTION : Pas reçu */}
            <TouchableOpacity
              onPress={() => setSelected("not_received")}
              className={`border rounded-xl p-4 mb-3 ${
                selected === "not_received"
                  ? "border-red-600 bg-red-50"
                  : "border-neutral-300"
              }`}
            >
              <Text className="text-base text-neutral-800 font-medium">
                Signaler un problème
              </Text>
            </TouchableOpacity>

            {/* ✅ OPTION : Bien reçu */}
            <TouchableOpacity
              onPress={() => setSelected("received")}
              className={`border rounded-xl p-4 ${
                selected === "received"
                  ? "border-green-600 bg-green-50"
                  : "border-neutral-300"
              }`}
            >
              <Text className="text-base text-neutral-800 font-medium">
                Oui, j’ai bien reçu ma commande.
              </Text>
            </TouchableOpacity>

            {/* CONSEILS / AIDE */}
            {selected === "received" && (
              <View className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <Text className="text-neutral-700 mb-2">
                  ✔ Vérifiez que tous les articles livrés sont corrects.
                </Text>
                <Text className="text-neutral-700 mb-2">
                  ✔ Assurez-vous que la commande correspond à ce que vous avez acheté.
                </Text>
                <Text className="text-red-500">
                  ✘ En cas de problème, ne confirmez pas la réception, remettez le colis au livreur et faites le savoir au fournisseur.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* BOTTOM ACTIONS */}
          <View className="mt-5">
            
            {selected === "not_received" && (
              <TouchableOpacity
                onPress={onNotReceived}
                className="bg-red-600 py-4 rounded-xl"
              >
                <Text className="text-center text-white text-base font-semibold">
                  Signaler un problème
                </Text>
              </TouchableOpacity>
            )}

            {selected === "received" && (
              <TouchableOpacity
                onPress={onConfirmReceived}
                className="bg-[#7B3FE4] py-4 rounded-xl"
              >
                <Text className="text-center text-white text-base font-semibold">
                  Confirmer la réception
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        </TouchableWithoutFeedback>
      </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
