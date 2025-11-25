import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface PrimaryButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  gradient?: [string, string];
  textClassName?: string;
  containerClassName?: string;
}

export function PrimaryButton({
  label,
  loading,
  disabled,
  gradient = ['#7B3FE4', '#3FE47B'],
  textClassName,
  containerClassName,
  ...rest
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={classes('overflow-hidden rounded-full', disabled && 'opacity-60', containerClassName)}
      disabled={disabled || loading}
      {...rest}
    >
      <LinearGradient colors={gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} className="flex-row items-center justify-center px-6 py-3">
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className={classes('text-base font-semibold text-white', textClassName)}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}
