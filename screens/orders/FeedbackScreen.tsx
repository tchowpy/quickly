import React, { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainStackParamList, RootStackParamList } from '../../navigation/types';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { supabase } from '../../lib/supabase';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';

const ratings = [1, 2, 3, 4, 5];

export function FeedbackScreen({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'Feedback'>) {
  const { orderId } = route.params;
  const { profile } = useSupabaseAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submitFeedback = async () => {
    if (!profile?.id) {
      Alert.alert('Feedback', 'Session expirée. Veuillez vous reconnecter.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('order_feedbacks').insert({
        order_id: orderId,
        client_id: profile?.id,
        product_rating: rating,
        feedback_client: comment,
      });
      if (error) {
        throw error;
      }
      Alert.alert('Merci 💜', 'Votre avis a bien été pris en compte.');
      navigation.goBack();
    } catch (error) {
      console.error('[Feedback] submit error', error);
      Alert.alert('Feedback', "Impossible d'envoyer votre avis pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 justify-between px-6 py-8">
        <View>
          <Text className="text-3xl font-semibold text-neutral-900">Votre expérience</Text>
          <Text className="mt-2 text-base text-neutral-600">
            Notez la commande #{orderId.slice(0, 6).toUpperCase()} et aidez-nous à nous améliorer.
          </Text>
          <View className="mt-8 flex-row items-center justify-center">
            {ratings.map((value) => (
              <Text
                key={value}
                className={`mx-2 text-4xl ${value <= rating ? 'text-[#FFC531]' : 'text-neutral-300'}`}
                onPress={() => setRating(value)}
              >
                ★
              </Text>
            ))}
          </View>
          <TextInput
            className="mt-8 h-40 rounded-3xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900"
            placeholder="Partagez vos commentaires..."
            multiline
            value={comment}
            onChangeText={setComment}
          />
        </View>
        <PrimaryButton label="Envoyer" onPress={submitFeedback} loading={loading} />
      </View>
    </SafeAreaView>
  );
}
