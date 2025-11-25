import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Category } from '../../types/models';

interface CategoryPillProps {
  category: Category;
  active?: boolean;
  onPress?: (category: Category) => void;
  icon?: React.ReactNode;
  className?: string;
}

export function CategoryPill({ category, active, onPress, icon, className }: CategoryPillProps) {
  return (
    <Pressable
      className={`flex-row items-center rounded-3xl border px-4 py-3 h-12 ${
        active ? 'border-[#7B3FE4] bg-[#F4F0FF]' : 'border-transparent bg-white shadow-sm'
      } ${className ?? ''}`}
      onPress={() => onPress?.(category)}
    >
      {icon ? <View className="mr-3">{icon}</View> : null}
      <Text className={`text-sm font-semibold ${active ? 'text-[#7B3FE4]' : 'text-neutral-800'}`} numberOfLines={1}>
        {category.name}
      </Text>
    </Pressable>
  );
}
