import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export function ActionRow({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="flex-row items-center justify-between rounded-2xl bg-[#F8F5FF] px-4 py-3 mt-2" onPress={onPress}>
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">{icon}</View>
        <View>
          <Text className="text-base font-semibold text-neutral-900">{label}</Text>
          <Text className="text-xs text-neutral-500">{description}</Text>
        </View>
      </View>
      <ChevronRight color="#7B3FE4" />
    </Pressable>
  );
}
