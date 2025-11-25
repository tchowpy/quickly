import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { MapPin, Phone, Navigation } from "lucide-react-native";
import { formatCurrency } from "utils/format";

/* -------------------------------------------------------
ORDER SUMMARY CARD
--------------------------------------------------------*/
export function OrderSummaryCard({ order }: any) {
    return (
    <View className="rounded-3xl bg-[#F8F5FF] p-4 shadow-md mb-3">
        <Text className="text-sm font-medium text-neutral-500">
            Commande #{order.id.slice(0, 6).toUpperCase()}
        </Text>


        <View className="mt-2 flex-row items-center justify-between">
        <View className="flex-1 pr-4">
            <Text className="text-lg font-semibold text-neutral-900">
            {order.product_name}
        </Text>
        </View>
            <Text className="px-3 py-2 text-base font-semibold">x {order.quantity}</Text>
        </View>


        <View className="flex-row items-center justify-between mt-1">
            <View className="flex-1 pr-4">
            <Text className="text-lg font-semibold text-neutral-900">Total</Text>
        </View>
        <Text className="px-3 py-1 text-base font-semibold">
            {formatCurrency(order.total_amount)}
        </Text>
        </View>


        <Text className="mt-3 text-sm font-medium text-neutral-500">
            Adresse de livraison
        </Text>


        <View className="flex-row items-center mt-2">
            <MapPin size={26} color="#7B3FE4" />
            <Text className="text-sm text-neutral-700 flex-1 ml-1">
            {order.location_address}
            </Text>
        </View>
    </View>
    );
}