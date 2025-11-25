import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronRight, FileText, Fingerprint, LifeBuoy, LogOut, MapPin, Phone, ShoppingBag } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MainStackParamList } from '../../navigation/types';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { Card } from '../../components/ui/Card';

export function ProfileScreen({ navigation }: NativeStackScreenProps<MainStackParamList, 'Profile'>) {
  const { profile, user, signOut, biometricEnabled, setBiometricEnabled } = useSupabaseAuth();

  const toggleBiometrics = async () => {
    if (!biometricEnabled) {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        Alert.alert('Biométrie', 'Aucune donnée biométrique configurée sur cet appareil.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Activer la connexion biométrique',
      });
      if (!result.success) {
        return;
      }
    }
    setBiometricEnabled(!biometricEnabled);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7FB]" edges={['left', 'right','bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <LinearGradient
          colors={['#7B3FE4', '#5E57E6', '#3FE47B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-5 pb-24 pt-12"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-white/70">Mon espace</Text>
              <Text className="mt-1 text-3xl font-semibold text-white">Profil client</Text>
            </View>
            <Pressable
              className="h-11 w-11 items-center justify-center rounded-full bg-white/90"
              onPress={() => navigation.navigate('Notifications')}
            >
              <Bell color="#1F1F1F" size={18} />
            </Pressable>
          </View>
          <Card className="mt-6 bg-white/15 p-5">
            <Text className="text-sm text-white/70">Identité</Text>
            <Text className="mt-2 text-2xl font-semibold text-white">
              {profile?.full_name ?? 'Client Quickly'}
            </Text>
            <Text className="mt-1 text-sm text-white/70">{user?.phone ?? 'Téléphone non défini'}</Text>
          </Card>
        </LinearGradient>

        <View className="-mt-16 px-5 space-y-7">
          <Card className="bg-white p-5 space-y-4">
            <Text className="text-sm font-medium text-neutral-500">Coordonnées</Text>
            <View className="mt-4 space-y-3">
              <InfoRow
                icon={<Phone color="#7B3FE4" size={18} />}
                value={user?.phone ?? '—'}
              />
              <InfoRow
                icon={<MapPin color="#7B3FE4" size={18} />}
                value={profile?.address ?? 'Localisation non définie'}
              />
            </View>
            <Pressable className="mt-5 flex-row items-center justify-between" onPress={() => navigation.navigate('EditProfile')}>
              <View>
                <Text className="text-base font-semibold text-neutral-900">Modifier mon profil</Text>
                <Text className="text-sm text-neutral-500">Nom, adresse…</Text>
              </View>
              <ChevronRight color="#7B3FE4" />
            </Pressable>
          </Card>

          <Card className="bg-white p-5 space-y-3 mt-4 mb-4">
            <Text className="text-sm font-medium text-neutral-500">Actions rapides</Text>
            <ActionRow
              icon={<ShoppingBag color="#7B3FE4" size={18} />}
              label="Historique des commandes"
              description="Consultez vos demandes passées."
              onPress={() => navigation.navigate('OrderHistory')}
            />
            <ActionRow
              icon={<Bell color="#7B3FE4" size={18} />}
              label="Notifications"
              description="Vos alertes et messages."
              onPress={() => navigation.navigate('Notifications')}
            />
            <ActionRow
              icon={<Fingerprint color="#7B3FE4" size={18} />}
              label={`Biométrique ${biometricEnabled ? 'activée' : 'désactivée'}`}
              description="Gérez l'accès par Face ID / empreinte."
              onPress={toggleBiometrics}
            />
            <ActionRow
              icon={<LifeBuoy color="#7B3FE4" size={18} />}
              label="Aide & support"
              description="Contactez notre assistance."
              onPress={() => navigation.getParent()?.navigate('Support', {})}
            />
            <ActionRow
              icon={<FileText color="#7B3FE4" size={18} />}
              label="Voir les CGU"
              description="Consultez les conditions d’utilisation."
              onPress={() => navigation.navigate('Terms')}
            />
          </Card>

          <PrimaryButton
            label="Déconnexion"
            onPress={signOut}
            gradient={['#FEE2E2', '#FEE2E2']}
            textClassName="text-red-600"
          />
          <View className="items-center mt-4 mb-4">
            <Pressable onPress={() => navigation.getParent()?.navigate('Support', {})}>
              <View className="flex-row items-center">
                <LogOut color="#9CA3AF" size={16} />
                <Text className="ml-2 text-xs text-neutral-400">Besoin d’aide ? Contactez-nous</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label?: string; value: string }) {
  return (
    <View className="flex-row items-center mt-2">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#F3F0FF]">{icon}</View>
      <View>
        {label &&(
          <Text className="text-xs uppercase text-neutral-500">{label}</Text>
        )}
        <Text className="text-base font-semibold text-neutral-900">{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable className="flex-row items-center justify-between rounded-2xl bg-[#F8F5FF] px-4 py-3 mt-2" onPress={onPress}>
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">{icon}</View>
        <View>
          <Text className="text-base font-semibold text-neutral-900">{label}</Text>
          <Text className="text-xs text-neutral-500">{description}</Text>
        </View>
      </View>
      {/*<ChevronRight color="#7B3FE4" />*/}
    </Pressable>
  );
}
