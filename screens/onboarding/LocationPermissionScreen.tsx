import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingStackParamList } from '../../navigation/types';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useSupabaseAuth } from 'hooks/useSupabaseAuth';

export function LocationPermissionScreen({
  navigation
}: NativeStackScreenProps<OnboardingStackParamList, 'LocationPermission'>) {
  const [loading, setLoading] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const requestPermission = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionRequested(true);
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          'Localisation requise',
          'Autorisez la localisation pour estimer la livraison et trouver les prestataires proches.',
        );
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      
    } catch (error) {
      console.error('[LocationPermission] request error', error);
      Alert.alert('Localisation', 'Impossible de récupérer votre position pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#7B3FE4", "#3FE47B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-1">
    <SafeAreaView className="flex-1 items-center justify-center" edges={['top']} >
        <View className="flex-1 justify-between px-6 py-12">
          <View>
            <Text className="mt-3 text-3xl font-semibold text-white">Activer la localisation</Text>
            <Text className="mt-4 text-base text-white/90">
              Quickly identifie les prestataires les plus proches pour des livraisons rapides. Nous avons besoin de
              votre position précise pour estimer les frais et vous proposer les meilleures options.
            </Text>
            <View className="mt-6 space-y-4">
              <Bullet text="Estimation instantanée des frais de livraison." />
              <Bullet text="Identification des prestataires disponibles autour de vous." />
              <Bullet text="Suivi GPS en temps réel du livreur." />
            </View>
          </View>
          <View className="space-y-3">
            <PrimaryButton
              label="Autoriser la localisation"
              onPress={requestPermission}
              loading={loading}
              gradient={['#7B3FE4', '#A979F7'] // tes couleurs habituelles
            }
            textClassName={
              permissionRequested ? 'text-[#7B3FE4]' : 'text-white'
            }
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View className="flex-row items-start">
      <View className="mr-3 mt-1 h-2 w-2 rounded-full bg-white" />
      <Text className="flex-1 text-sm text-white/90">{text}</Text>
    </View>
  );
}
