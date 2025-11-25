import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField } from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { AuthStackParamList } from '../../navigation/types';
import * as SecureStorage from 'expo-secure-store';

export function OtpVerificationScreen({
  navigation,
  route,
}: NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [countdown, setCountdown] = useState(60);
  const { verifyOtp, signInWithPhone, loading, checkSession } = useSupabaseAuth();

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Code OTP invalide.');
      return;
    }
    setError(undefined);
    const { error: authError, profile: profile} = await verifyOtp(phone, code);
    if (authError) {
      Alert.alert('Erreur', authError);
      return;
    }

    console.log('OtpVerificationScreen profile ',profile)

    if (!profile || !profile?.consent_accepted){
      navigation.getParent()?.navigate('Onboarding', { screen: 'TermsConsent', params: { phone } });
      return;
    }

    SecureStorage.setItemAsync('phoneRegistered', profile.phone);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  const resendCode = async () => {
    setCountdown(60);
    const { error: authError } = await signInWithPhone(phone);
    if (authError) {
      Alert.alert('Erreur', authError);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-between px-6 py-10">
          <View>
            <Text className="text-3xl font-bold text-neutral-900">Vérification 🔐</Text>
            <Text className="mt-3 text-base text-neutral-600">
              Entrez le code à 6 chiffres envoyé au {phone}.
            </Text>
            <View className="mt-8">
              <TextField
                label="Code OTP"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                error={error}
                helperText={countdown > 0 ? `Expiration du code dans ${countdown}s` : 'Code expiré, renvoyez un nouveau code.'}
              />
            </View>
            <Text
              className="mt-4 text-sm font-semibold text-[#7B3FE4]"
              onPress={countdown === 0 ? resendCode : undefined}
            >
              {countdown === 0 ? 'Renvoyer un nouveau code' : 'Patientez avant de renvoyer'}
            </Text>
          </View>
          <PrimaryButton label="Continuer" onPress={handleVerify} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
