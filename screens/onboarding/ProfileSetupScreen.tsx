import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField } from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { OnboardingStackParamList } from '../../navigation/types';
import { MapPin } from 'lucide-react-native';
import DeliveryAddressCard from 'components/checkout/DeliveryAddressCard';
import DeliveryAddressModal from 'components/checkout/DeliveryAddressModal';

export function ProfileSetupScreen({
  navigation,
  route,
}: NativeStackScreenProps<OnboardingStackParamList, 'ProfileSetup'>) {
  const { profile, upsertProfile, user } = useSupabaseAuth();
  const initialLatitude = route?.params?.latitude ?? profile?.latitude;
  const initialLongitude = route?.params?.longitude ?? profile?.longitude;
  const termsAccepted = route?.params?.termsAccepted ?? false;
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied'>(
    initialLatitude && initialLongitude ? 'granted' : 'idle',
  );
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({
    latitude: initialLatitude ?? undefined,
    longitude: initialLongitude ?? undefined,
  });

  // Address management
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    label: string;
    latitude: number;
    longitude: number;
  } | null>({label: profile?.address ?? '', latitude: initialLatitude ?? 0, longitude: initialLongitude ?? 0});

  const [addressLoading, setAddressLoading] = useState(false);

  const ensureLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      setLocationStatus('denied');
      Alert.alert('Localisation', 'La permission est nécessaire pour estimer les frais de livraison.');
      return null;
    }
    const position = await Location.getCurrentPositionAsync();
    const result = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    setCoords(result);
    setLocationStatus('granted');
    return result;
  };

  const requestLocation = async () => {
    try {
      setLoading(true);
      const result = await ensureLocationPermission();
      if (!result) {
        return;
      }
    } catch (error) {
      console.error('[ProfileSetup] location error', error);
      Alert.alert('Localisation', 'Impossible de récupérer votre position.');
    } finally {
      setLoading(false);
    }
  };

  const fillAddressFromLocation = async () => {
    try {
      setAddressLoading(true);
      let current = coords;
      if (!current.latitude || !current.longitude) {
        const fresh = await ensureLocationPermission();
        if (!fresh) {
          return;
        }
        current = fresh;
      }
      const geocodes = await Location.reverseGeocodeAsync({
        latitude: current.latitude ?? 0,
        longitude: current.longitude ?? 0,
      });
      const place = geocodes[0];
      if (place) {
        const formatted = [place.street, place.name, place.city, place.region, place.country]
        //const formatted = [place.formattedAddress]
          .filter(Boolean)
          .join(', ');
        if (formatted) {
          setAddress(formatted);
        }
      }
    } catch (error) {
      console.error('[ProfileSetup] reverse geocode error', error);
      Alert.alert('Adresse', 'Impossible de récupérer votre adresse.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!fullName.trim()) {
      Alert.alert('Profil', 'Veuillez renseigner votre nom complet.');
      return;
    }
    if (!user?.phone) {
      Alert.alert('Profil', 'Numéro de téléphone introuvable.');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('Profil', 'Vous devez accepter les CGU pour continuer.');
      navigation.navigate('TermsConsent', {phone: user?.phone});
      return;
    }

    setLoading(true);
    const { error } = await upsertProfile({
      full_name: fullName.trim(),
      address: selectedAddress?.label.trim(),
      latitude: selectedAddress?.latitude,
      longitude: selectedAddress?.longitude,
      phone: user.phone ?? '',
      consent_accepted: termsAccepted,
    });
    setLoading(false);
    if (error) {
      return;
    }

    navigation.navigate('BiometricOptIn');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-between px-6 py-10">
          <View>
            <Text className="text-3xl font-bold text-neutral-900">Créer votre profil</Text>
            <Text className="mt-3 text-base text-neutral-600">
              Complétez vos informations pour personnaliser votre expérience Quickly.
            </Text>
            <View className="mt-8 space-y-5">
              <TextField label="Nom complet" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
              {/*<TextField
                label="Adresse (facultatif)"
                value={address}
                onChangeText={setAddress}
                placeholder="Ex: Cocody Angré 8ème tranche"
                rightIcon={<MapPin color="#7B3FE4" size={18} />}
                onRightIconPress={fillAddressFromLocation}
              />*/}
              {/** DELIVERY ADDRESS */}
              <View className="mt-2">
              <DeliveryAddressCard
                address={selectedAddress?.label ?? profile?.address}
                onPress={() => setAddressModalVisible(true)}
              />
              </View>
            </View>
          </View>
          <PrimaryButton label="Continuer" onPress={handleContinue} loading={loading} />
        </View>
      </KeyboardAvoidingView>
      {/** ADDRESS MODAL */}
      <DeliveryAddressModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        //onSelect={(addr) => setSelectedAddress(addr)}
        onValidate={(data) => {
            console.log("Adresse validée :", data);
            setSelectedAddress({label: data.address, latitude: data.latitude, longitude: data.longitude});
        }}
        initialLatitude={selectedAddress?.latitude}
        initialLongitude={selectedAddress?.longitude}
      />
    </SafeAreaView>
  );
}
