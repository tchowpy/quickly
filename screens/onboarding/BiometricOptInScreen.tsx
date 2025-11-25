import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { OnboardingStackParamList } from '../../navigation/types';

export function BiometricOptInScreen({ navigation }: NativeStackScreenProps<OnboardingStackParamList, 'BiometricOptIn'>) {
  const { setBiometricEnabled } = useSupabaseAuth();
  const [supported, setSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const isHardwareAvailable = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setSupported(isHardwareAvailable && enrolled);
    })();
  }, []);

  const enableBiometrics = async () => {
    if (!supported) {
      navigation.getParent()?.navigate('Main');
      return;
    }
    try {
      setLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Activer la connexion biométrique',
      });
      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert('Biométrie activée', 'Vous pourrez désormais vous connecter plus rapidement.');
      }
    } finally {
      setLoading(false);
      navigation.getParent()?.navigate('Main');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 justify-between px-6 py-10">
        <View>
          <Text className="text-3xl font-bold text-neutral-900">Connexion biométrique</Text>
          <Text className="mt-3 text-base text-neutral-600">
            {supported
              ? 'Déverrouillez Quickly via Face ID ou empreinte digitale pour un accès instantané.'
              : "Votre appareil ne supporte pas l'authentification biométrique configurée."}
          </Text>
        </View>
        <View className="gap-3">
          <PrimaryButton label={supported ? 'Activer' : 'Continuer'} onPress={enableBiometrics} loading={loading} />
          <PrimaryButton
            label="Plus tard"
            onPress={() => {
              setBiometricEnabled(false);
              navigation.getParent()?.navigate('Main');
            }}
            gradient={['#E5E7EB', '#E5E7EB']}
            textClassName="text-neutral-800"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
