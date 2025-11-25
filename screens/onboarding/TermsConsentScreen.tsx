import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { PrimaryButton } from '../../components/ui/PrimaryButton';

import * as Location from 'expo-location';

import * as SecureStorage from 'expo-secure-store';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';
import { useSupabaseAuth } from 'hooks/useSupabaseAuth';

const termsText = `En utilisant Quickly, vous acceptez nos Conditions Générales d'Utilisation (CGU).

1. Les commandes sont soumises aux prix régulés et aux frais de service affichés avant validation.
2. Les frais de livraison sont calculés selon votre position géographique.
3. Les données personnelles sont utilisées pour exécuter et améliorer le service.
4. Les signalements et litiges sont traités via l'interface support directement dans l'application.
5. Les prestataires sont sélectionnés en fonction de leur disponibilité et de leur proximité.

Vous pouvez consulter la version complète des CGU depuis votre profil à tout moment.`;

export function TermsConsentScreen({ navigation, route }: NativeStackScreenProps<OnboardingStackParamList, 'TermsConsent'>) {
  const { phone } = route.params;
  const [accepted, setAccepted] = useState(false);
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const { addAccount } = useSupabaseAuth()

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      Alert.alert('Localisation', 'La permission est nécessaire pour estimer les frais de livraison.');
      return null;
    }
    const position = await Location.getCurrentPositionAsync();
    setLatitude(position.coords.latitude);
    setLongitude(position.coords.longitude);
    return position.coords;
  };

  getLocation();

  const proceed = () => {
    if (!accepted) {
      return;
    }
  
    //SecureStorage.setItemAsync('phoneRegistered', phone);
    addAccount({
      name: '',
      phone: phone ?? ''
    })
    
    navigation.navigate('ProfileSetup', {
      latitude,
      longitude,
      termsAccepted: true,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-10">
        <Text className="mt-2 text-3xl font-semibold text-neutral-900">Conditions Générales</Text>
        <Text className="mt-2 text-sm text-neutral-500">
          Merci de lire et accepter nos CGU pour continuer.
        </Text>
        <ScrollView className="mt-6 flex-1 rounded-3xl bg-[#F7F7FB] px-4 py-5" showsVerticalScrollIndicator={false}>
          <Text className="text-sm leading-6 text-neutral-700">{termsText}</Text>
        </ScrollView>
        <View className="mt-6 flex-row items-center">
          <Text
            className={`mr-3 h-6 w-6 rounded-md border-2 text-center text-base font-bold ${
              accepted ? 'border-[#7B3FE4] text-[#7B3FE4]' : 'border-neutral-300 text-transparent'
            }`}
            onPress={() => setAccepted((prev) => !prev)}
          >
            ✓
          </Text>
          <Text className="flex-1 text-sm text-neutral-700">
            J&apos;ai lu et j&apos;accepte les Conditions Générales d&apos;Utilisation.
          </Text>
        </View>
        <View className="mb-8 mt-6">
          <PrimaryButton label="Continuer" onPress={proceed} disabled={!accepted} />
        </View>
      </View>
    </SafeAreaView>
  );
}
