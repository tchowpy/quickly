import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';

const fullTerms = `# Conditions Générales d'Utilisation Quickly

## Article 1 — Objet
Quickly met en relation les clients avec des prestataires de proximité pour des commandes instantanées.

## Article 2 — Commandes
Le client valide sa commande après estimation des frais de service et de livraison.

## Article 3 — Tarification
Les prix produits sont régulés selon les barèmes en vigueur. Les frais de service et de livraison sont communiqués avant validation.

## Article 4 — Paiements
Les paiements s'effectuent à la livraison ou via Mobile Money selon le mode choisi.

## Article 5 — Livraisons et suivi
Les livraisons sont effectuées par des livreurs partenaires. Un suivi GPS est disponible en temps réel.

## Article 6 — Litiges
Les litiges peuvent être signalés via l'application. L'équipe Quickly se charge de la médiation.

## Article 7 — Données personnelles
Les informations recueillies sont utilisées pour exécuter les commandes et notifier le client. Elles sont traitées conformément à la législation en vigueur.

## Article 8 — Support
Le support est accessible 24/7 depuis l'application.

## Article 9 — Modifications
Quickly peut mettre à jour les présentes CGU. Les utilisateurs en seront informés via l'application.`;

export function TermsScreen({ navigation }: NativeStackScreenProps<MainStackParamList, 'Terms'>) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <View className="flex-1 px-6 pt-10">
        <Text className="text-3xl font-semibold text-neutral-900">Conditions Générales</Text>
        <Text className="mt-2 text-sm text-neutral-500">
          Retrouvez l'intégralité des CGU Quickly à tout moment.
        </Text>
        <ScrollView className="mt-6 flex-1 rounded-3xl bg-[#F7F7FB] px-4 py-5" showsVerticalScrollIndicator={false}>
          <Text className="text-sm leading-6 text-neutral-700">{fullTerms}</Text>
        </ScrollView>
        <View className="mb-6 mt-6">
          <Text className="text-xs text-neutral-400">
            Version 1.0 — Dernière mise à jour Janvier 2025.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
