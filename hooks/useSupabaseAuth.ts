import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { UserProfile } from '../types/models';

import * as SecureStorage from 'expo-secure-store';

interface VerifyOtpResponse {
  success: boolean;
  session?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  user?: User;
  error?: string;
}

interface SignInResponse {
  profile?: any,
  session?: any;
  error?: string;
}

export function useSupabaseAuth() {
  const { setSession, setUser, setProfile, setLoading, setBootstrapped, enableBiometrics } = useAuthStore();
  const state = useAuthStore();
  const [phoneRegistered, setUserRegistered] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState(-1);

  const handleGetPhoneRegistered = async () => {
    const phoneRegistered = await SecureStorage.getItemAsync('phoneRegistered');
   // console.log('Retrieved phoneRegistered from storage:', phoneRegistered);
    if (phoneRegistered) {
      setUserRegistered(phoneRegistered);
    }
  }
  
  const signInWithPhone = useCallback(
    async (phone: string): Promise<SignInResponse> => {
      try {
        if (useAuthStore.getState().session) {
          return {session : useAuthStore.getState().session};
        }
        console.log('[Auth] invoking auth-send-otp function');
        setLoading(true);
        const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
          'auth-send-otp',
          {
            body: { phone },
          },
        );

        if (error) {
          console.error('[Auth] signInWithPhone error', error.message);
          return { error: "Impossible d'envoyer le code OTP." };
        }

        if (!data?.success) {
          return { error: data?.error ?? "L'envoi du code a échoué." };
        }
        console.log('[Auth] signInWithPhone data', data)
        return data || {};
      } catch (err) {
        console.error('[Auth] signInWithPhone exception', err);
        return { error: 'Une erreur est survenue. Réessayez plus tard.' };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const verifyOtp = useCallback(
    async (phone: string, token: string): Promise<SignInResponse> => {
      try {
        console.log('verifyOtp -- phone ',phone)
        console.log('verifyOtp -- token ',token)
        setLoading(true);
        const { data, error } = await supabase.functions.invoke<VerifyOtpResponse>('auth-verify-otp', {
          body: { phone, code: token },
        });

        if (error) {
          console.error('[Auth] verifyOtp function error', error.message);
          return { error: "Impossible de vérifier le code OTP." };
        }
        
        if (!data?.success || !data.session) {
          console.log('verifyOtp -- data ',data)
          return { error: data?.error ?? 'Code OTP invalide.' };
        }

        const { session, user } = data;

        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (setSessionError) {
          console.error('[Auth] setSession error', setSessionError.message);
          return { error: "Impossible d'établir la session." };
        }
        console.log('VerifyOtp sessionData.session ',sessionData.session)
        setSession(sessionData.session ?? null);
        setUser(sessionData.session?.user ?? data.user ?? null);
        const authUser = sessionData.session?.user ?? user;
        let profile = null;
        if (authUser) {
          profile = await loadUserProfile(authUser.id);
        }

        return {session: sessionData.session, profile};
      } catch (err) {
        console.error('[Auth] verifyOtp exception', err);
        return { error: 'Impossible de valider le code. Vérifiez et réessayez.' };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setSession, setUser],
  );

  const loadUserProfile = useCallback(
    async (authUserId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, full_name, phone, latitude, longitude, address, consent_accepted')
        .eq('auth_user_id', authUserId)
        .eq('role', 'client')
        .maybeSingle();

      if (error) {
        console.error('[Auth] loadUserProfile error', error.message);
        return null;
      }

      if (data) {
        setProfile(data as UserProfile);
      }

      return data as UserProfile | null;
    },
    [setProfile],
  );

  const upsertProfile = useCallback(
    async (payload: Partial<UserProfile>) => {
      try {
        const { user } = state;
        if (!user) {
          throw new Error('Session expirée');
        }

        const insertPayload = {
          auth_user_id: user.id,
          role: 'client',
          phone: payload.phone,
          full_name: payload.full_name,
          latitude: payload.latitude,
          longitude: payload.longitude,
          address: payload.address,
          consent_accepted: payload.consent_accepted ?? true,
        };

        const { data, error } = await supabase
          .from('users')
          .upsert(insertPayload, { onConflict: 'auth_user_id,role' })
          .select()
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setProfile(data as UserProfile);
        }

        return { data: data as UserProfile };
      } catch (error) {
        console.error('[Auth] upsertProfile error', error);
        Alert.alert('Erreur', "Impossible d'enregistrer votre profil.");
        return { error };
      }
    },
    [setProfile, state],
  );

  const checkSession = useCallback(async () => {
    setLoading(true);
console.log('Checking session...');
    await handleGetPhoneRegistered();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('[Auth] getSession error', error.message);
      setLoading(false);
      setBootstrapped(true);
      setSessionState(1);
      return;
    }

    if (session) {
      setSession(session);
      setUser(session.user);
      await loadUserProfile(session.user.id);
    }

    setLoading(false);
    setBootstrapped(true);
    setSessionState(1);
  }, [loadUserProfile, setLoading, setSession, setUser]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().reset();
    useOrderStore.getState().reset();
  }, []);
//console.log('state.bootstrapped:', state.bootstrapped);
  return {
    phoneRegistered,
    session: state.session,
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    biometricEnabled: state.biometricEnabled,
    bootstrapped: state.bootstrapped,
    sessionState,
    signInWithPhone,
    verifyOtp,
    loadUserProfile,
    upsertProfile,
    checkSession,
    signOut,
    setBiometricEnabled: enableBiometrics,
    setSessionState,
  };
}

// Lazy import to avoid circular deps
import { useOrderStore } from '../store/orderStore';
