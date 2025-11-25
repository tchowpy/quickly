import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { supabase } from '../../lib/supabase';

export function SupportScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Support'>) {
  const { orderId } = route.params ?? {};
  const { profile } = useSupabaseAuth();
  const [subject, setSubject] = useState(orderId ? `Commande ${orderId.slice(0, 6).toUpperCase()}` : 'Assistance Quickly');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submitTicket = async () => {
    if (!profile?.id) {
      Alert.alert('Support', 'Session expirée. Veuillez vous reconnecter.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Support', 'Décrivez votre demande.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('support-ticket', {
        body: {
          subject,
          message,
          order_id: orderId,
          user_id: profile.id,
        },
      });
      if (error) {
        const { error: insertError } = await supabase.from('support_tickets').insert({
          subject,
          message,
          order_id: orderId,
          user_id: profile.id,
          status: 'open',
        });
        if (insertError) {
          throw insertError;
        }
      }
      Alert.alert('Support', 'Votre message a été envoyé. Nous vous contacterons rapidement.');
      navigation.goBack();
    } catch (error) {
      console.error('[Support] submit error', error);
      Alert.alert('Support', "Impossible d'envoyer votre demande pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 justify-between px-6 py-8">
        <View>
          <Text className="text-3xl font-semibold text-neutral-900">Support & Aide</Text>
          <Text className="mt-2 text-base text-neutral-600">
            Nous sommes là pour vous accompagner 24/7.
          </Text>
          <View className="mt-8 space-y-4">
            <TextInput
              className="rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-base"
              placeholder="Sujet"
              value={subject}
              onChangeText={setSubject}
            />
            <TextInput
              className="h-40 rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-base"
              placeholder="Décrivez votre demande..."
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>
        </View>
        <PrimaryButton label="Envoyer" onPress={submitTicket} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
