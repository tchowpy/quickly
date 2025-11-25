import React from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export function SplashScreen() {
  
  return (
    <LinearGradient colors={['#7B3FE4', '#3FE47B']} className="flex-1">
      <SafeAreaView className="flex-1 items-center justify-center" edges={['top', 'bottom']}>
        <View className="items-center justify-center gap-6">
          <View className="h-32 w-32 items-center justify-center rounded-full bg-white/10">
            <Image source={require('../../assets/icon.png')} className="h-24 w-24" resizeMode="contain" />
          </View>
          <Text className="text-2xl font-bold text-white">Quickly</Text>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
