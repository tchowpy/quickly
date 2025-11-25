import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, Dimensions } from "react-native";
import { Card } from "../../components/ui/Card";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

const { width } = Dimensions.get("window");

export function HomeHeaderSlider({
  hasOrders,
  hasDeliveries,
  onInstantOrder,
  onOrdersPress,
  onDeliveriesPress
}: {
  hasOrders: boolean;
  hasDeliveries: boolean;
  onInstantOrder: () => void;
  onOrdersPress: () => void;
  onDeliveriesPress: () => void;
}) {
  const sliderRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  // Construire les slides dynamiques
  const slides = [
    { key: "instant" },
    ...(hasOrders ? [{ key: "orders" }] : []),
    ...(hasDeliveries ? [{ key: "deliveries" }] : []),
  ];

  const totalSlides = slides.length;

  // Défilement automatique
  useEffect(() => {
    const interval = setInterval(() => {
      const next = (index + 1) % totalSlides;
      setIndex(next);
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [index, totalSlides]);

  // Rendu de chaque slide
  const renderItem = ({ item }) => {
    if (item.key === "instant") {
      return (
        <Card className="flex-row items-center justify-between bg-white/15 p-4 mx-1" style={{ width: width - 40 }}>
            <View className="flex-1 pr-4 self-start">
                <Text className="text-sm font-medium text-white/75">Commande instantanée</Text>
                <Text className="mt-2 text-xl font-semibold text-white">
                Besoin d’un produit ?
                </Text>
            </View>

            <Pressable
                className="rounded-full bg-white px-4 py-2 self-center"
                onPress={onInstantOrder}
            >
                <Text className="text-sm font-semibold text-[#7B3FE4]">Commander</Text>
            </Pressable>
        </Card>

      );
    }

    if (item.key === "orders") {
      return (
        <Card className="flex-row items-center justify-between bg-white/15 p-4 mx-1" style={{ width: width - 40 }}>
            <View className="flex-1 pr-4 self-start">
                <Text className="text-sm font-medium text-white/75">Commande en cours</Text>
                <Text className="mt-2 text-xl font-semibold text-white">
                Vous avez des commandes
                </Text>
            </View>

            <Pressable
                className="rounded-full bg-white px-4 py-2 self-center"
                onPress={onOrdersPress}
            >
                <Text className="text-sm font-semibold text-[#7B3FE4]">Suivre</Text>
            </Pressable>
        </Card>
      );
    }

    if (item.key === "deliveries") {
      return (
        <Card className="flex-row items-center justify-between bg-white/15 p-4 mx-1" style={{ width: width - 40 }}>
            <View className="flex-1 pr-4 self-start">
                <Text className="text-sm font-medium text-white/75">Livraisons</Text>
                <Text className="mt-2 text-xl font-semibold text-white">
                Vous avez des livraisons à faire
                </Text>
            </View>

            <Pressable
                className="rounded-full bg-white px-4 py-2 self-center"
                onPress={onDeliveriesPress}
            >
                <Text className="text-sm font-semibold text-[#7B3FE4]">Suivre</Text>
            </Pressable>
        </Card>
      );
    }

    return null;
  };

  return (
    <View className="mt-6">
      <FlatList
        data={slides}
        ref={sliderRef}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / (width - 50));
          setIndex(newIndex);
        }}
      />

      {/* Pagination */}
      <View className="flex-row justify-center mt-3">
        {slides.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full mx-1 ${
              i === index ? "bg-white w-4" : "bg-white/40 w-2"
            }`}
          />
        ))}
      </View>
    </View>
  );
}
