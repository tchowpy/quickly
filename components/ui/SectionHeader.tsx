import React from 'react';
import { Text, View, ViewProps } from 'react-native';

type SectionHeaderProps = ViewProps & {
  title: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, action, className, ...props }: SectionHeaderProps) {
  return (
    <View className={`mb-3 flex-row items-center justify-between ${className ?? ''}`} {...props}>
      <Text className="text-lg font-semibold text-neutral-900">{title}</Text>
      {action}
    </View>
  );
}
