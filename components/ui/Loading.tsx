import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoadingQuickLy() {
  return (
    <SafeAreaView 
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
      }}
    >
      <ActivityIndicator size="large" color="#000" />
      <Text style={{ marginTop: 12, fontSize: 16 }}>
        Chargement...
      </Text>
    </SafeAreaView>
  );
}
