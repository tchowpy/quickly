import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Account, Coords, UserProfile } from '../types/models';

interface AuthState {
  accounts: Account[] | [],
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  geoloc: Coords | null;
  loading: boolean;
  biometricEnabled: boolean;
  bootstrapped: boolean;
  setAccounts: (accounts: Account[] | []) => void;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setGeoloc: (geoloc: Coords | null) => void;
  setLoading: (value: boolean) => void;
  setBootstrapped: (value: boolean) => void;
  enableBiometrics: (value: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accounts: [],
      session: null,
      user: null,
      profile: null,
      geoloc: null,
      loading: false,
      biometricEnabled: false,
      bootstrapped: false,
      setAccounts: (accounts) => set({ accounts }),
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setGeoloc: (geoloc) => set({ geoloc }),
      setLoading: (loading) => set({ loading }),
      setBootstrapped: (bootstrapped) => set({ bootstrapped }),
      enableBiometrics: (biometricEnabled) => set({ biometricEnabled }),
      reset: () =>
        set({
          session: null,
          user: null,
          profile: null,
          geoloc: null,
          biometricEnabled: false,
          bootstrapped: false,
        }),
    }),
    {
      name: 'quickly.auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        session: state.session,
        user: state.user,
        profile: state.profile,
        geoloc: state.geoloc,
        biometricEnabled: state.biometricEnabled,
        bootstrapped: state.bootstrapped,
      }),
    },
  ),
);
