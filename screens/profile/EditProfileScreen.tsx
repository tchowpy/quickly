import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainStackParamList } from '../../navigation/types';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { TextField } from '../../components/ui/TextField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { MapPin } from 'lucide-react-native';

export function EditProfileScreen({ navigation }: NativeStackScreenProps<MainStackParamList, 'EditProfile'>) {
  const { profile, upsertProfile, user } = useSupabaseAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');

  const [loading, setLoading] = useState(false);

    const [locationStatus, setLocationStatus] = useState<'idle' | 'granted' | 'denied'>(
      profile?.latitude && profile.longitude ? 'granted' : 'idle',
    );

    const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({
      latitude: profile?.latitude ?? undefined,
      longitude: profile?.longitude ?? undefined,
    });

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
          const formatted = [place.name, place.street, place.city]
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

  const saveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Profil', 'Merci de renseigner votre nom complet.');
      return;
    }
    if (!user?.phone) {
      Alert.alert('Profil', 'Numéro de téléphone manquant.');
      return;
    }
    setLoading(true);
    const { error } = await upsertProfile({
      full_name: fullName.trim(),
      address: address.trim(),
      latitude: coords.latitude,
      longitude: coords.longitude,
      phone: user.phone,
    });
    setLoading(false);
    if (!error) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 justify-between px-6 py-8">
          <View>
            <Text className="text-2xl font-semibold text-neutral-900">Modifier votre profil</Text>
            <View className="mt-6 space-y-5">
              <TextField label="Nom complet" value={fullName} onChangeText={setFullName} />
              <TextField
                label="Adresse"
                value={address}
                onChangeText={setAddress}
                placeholder="Votre adresse complète"
                rightIcon={<MapPin color="#7B3FE4" size={18} />}
                onRightIconPress={fillAddressFromLocation}
                loading={addressLoading}
              />
             
            </View>
          </View>
          <PrimaryButton label="Enregistrer" onPress={saveProfile} loading={loading} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
