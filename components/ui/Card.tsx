import React from 'react';
import { Pressable, PressableProps, View, ViewProps } from 'react-native';

export function Card({ className, ...props }: ViewProps) {
  return <View className={`rounded-3xl bg-white p-4 ${className ?? ''}`} {...props} />;
}

export function CardPressable({ className, ...props }: PressableProps) {
  return <Pressable className={`rounded-3xl bg-white p-4 shadow-md ${className ?? ''}`} {...props} />;
}
