import React, { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useAuthStore } from 'store/authStore';
import { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthGate'>;

export function AuthGate({ navigation }: Props) {
  const { accounts } = useAuthStore();

  const {
    sessionState,
    session,
  //  phoneRegistered,
    profile,
    loading,
    bootstrapped,
    checkSession,
    setSessionState
  } = useSupabaseAuth();

    useEffect(() => {
        if (!bootstrapped || sessionState !== 1){
          setSessionState(0);
          void checkSession();
        }
    }, [bootstrapped, sessionState]);
    
   // console.log('AuthGate RenderState ',{sessionState, bootstrapped})
  // Redirection principale
  useEffect(() => {
    if (!bootstrapped || sessionState !== 1) return;
 console.log('AuthGate RenderState ',{accounts, sessionState})
    if (session || (accounts && accounts.length > 0)) {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      return;
    } else {
       navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return;
    }

  }, [session, accounts, profile, sessionState, bootstrapped]);

  if (!bootstrapped || sessionState !== 1) {
    return <SplashScreen />;
  }

  return null;
}
