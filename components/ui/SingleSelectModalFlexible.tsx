import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";

interface FlexibleItem {
  id: string | number;
  [key: string]: any; // Tout type de données autorisé
}

interface SingleSelectModalFlexibleProps {
  visible: boolean;
  title?: string;
  horizontal?:boolean;
  items: FlexibleItem[];
  selectedId?: string | number | null;
  renderItem: (item: FlexibleItem, isSelected: boolean) => React.ReactNode;
  onSelect: (item: FlexibleItem) => void;
  onClose: () => void;
}

export function SingleSelectModalFlexible({
  visible,
  title = "Sélectionner",
  horizontal = false,
  items,
  selectedId,
  renderItem,
  onSelect,
  onClose,
}: SingleSelectModalFlexibleProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      navigationBarTranslucent={true} 
      statusBarTranslucent={false}
    >
      {/* Fond semi-transparent */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40" />
      </TouchableWithoutFeedback>

      {/* Contenu */}
      <View className="absolute inset-x-0 bottom-0 max-h-[80%] bg-white rounded-t-3xl px-5 py-6" style={{paddingBottom:50}}>
        {/* Handle */}
        <View className="items-center mb-4">
          <View className="h-1.5 w-12 rounded-full bg-neutral-300" />
        </View>

        {/* Titre */}
        <Text className="text-lg font-bold text-neutral-900 mb-4">
          {title}
        </Text>

        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          horizontal={items.length > 1 ? horizontal : false}
          showsHorizontalScrollIndicator={false}
          
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;

            return (
              <Pressable
                onPress={() => onSelect(item)}
                className="mb-3"
              >
                {renderItem(item, isSelected)}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
