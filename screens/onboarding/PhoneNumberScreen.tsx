import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../store/authStore';
import { TextField } from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { AuthStackParamList } from '../../navigation/types';

import * as SecureStorage from 'expo-secure-store';

function sanitizePhone(phone: string) {
  return phone.replace(/\s+/g, '');
}

export function PhoneNumberScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'PhoneNumber'>) {
  const [phone, setPhone] = useState('+225');
  const [error, setError] = useState<string | undefined>();
  const { signInWithPhone, phoneRegistered, loading, profile, session, biometricEnabled, checkSession, bootstrapped } = useSupabaseAuth();

  useEffect(() => {
    const shouldCompleteProfile = session && !profile?.full_name;
    
    if (session && session.user.phone) {
      SecureStorage.setItemAsync('phoneRegistered', session.user.phone);

      if (shouldCompleteProfile) {
        navigation.getParent()?.getParent()?.navigate('Onboarding', { screen: 'ProfileSetup', params: { latitude: profile?.latitude, longitude: profile?.longitude, termsAccepted: profile?.consent_accepted } });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }

  }, [session, profile, navigation]);

  useEffect(() => {
    if (!bootstrapped) {
      void checkSession();
    }
  }, [bootstrapped, checkSession]);

  useEffect(() => {
    let cancelled = false;
    const attempt = async () => {
      if (session || !biometricEnabled) {
        return;
      }
      await checkSession();
      if (useAuthStore.getState().session) {
        return;
      }
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Déverrouiller Quickly',
      });
      if (result.success && !cancelled) {
        await checkSession();
      }
    };
    if (bootstrapped) {
      void attempt();
    }
    return () => {
      cancelled = true;
    };
  }, [session, biometricEnabled, checkSession, bootstrapped]);

  const handleContinue = async () => {
    const cleaned = sanitizePhone(phone);
    if (!/^\+?\d{10,15}$/.test(cleaned)) {
      setError('Entrez un numéro de téléphone valide.');
      return;
    }
    
    setError(undefined);
    const { error: authError, session: session } = await signInWithPhone(cleaned);

    if (authError) {
      Alert.alert('Erreur', authError);
      return;
    }
    if (session) {
      SecureStorage.setItemAsync('phoneRegistered', session.user.phone);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      return;
    }
    navigation.push('OtpVerify', { phone: cleaned });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-between px-6 py-10">
          <View>
            <Text className="text-3xl font-bold text-neutral-900">Bienvenue 👋</Text>
            <Text className="mt-3 text-base text-neutral-600">
              Entrez votre numéro de téléphone pour accéder à l'application.
            </Text>
            <View className="mt-8">
              <TextField
                label="Numéro de téléphone"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
                error={error}
                helperText=""
              />
            </View>
          </View>
          <PrimaryButton label="Valider" onPress={handleContinue} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
