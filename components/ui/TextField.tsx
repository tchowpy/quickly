import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, View } from 'react-native';

type TextFieldProps = TextInputProps & {
  label?: string;
  loading?:boolean;
  error?: string;
  helperText?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
};

export const TextField = React.forwardRef<TextInput, TextFieldProps>(
  ({ label, loading, error, helperText, className, rightIcon, onRightIconPress, ...props }, ref) => {
    return (
      <View className="gap-2">
        {label ? <Text className="text-sm font-medium text-neutral-700">{label}</Text> : null}
        <View className="relative">
          <TextInput
            ref={ref}
            className={`rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 shadow-sm focus:border-[#7B3FE4] focus:outline-none ${
              rightIcon ? 'pr-12' : ''
            } ${className ?? ''}`}
            placeholderTextColor="#8E8E93"
            {...props}
          />
          {rightIcon ? (
            <>
            {loading ? (
                <ActivityIndicator color="#8E8E93" />
              ) : (
                <Pressable
                  accessibilityRole="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onPress={onRightIconPress}
                >
                  {rightIcon}
                </Pressable>
              )}
            </>
          ) : null}
        </View>
        {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
        {!error && helperText ? <Text className="text-xs text-neutral-500">{helperText}</Text> : null}
      </View>
    );
  },
);

TextField.displayName = 'TextField';
