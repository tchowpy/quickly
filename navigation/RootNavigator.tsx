import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { SplashScreen } from '../screens/onboarding/SplashScreen';
import { PhoneNumberScreen } from '../screens/onboarding/PhoneNumberScreen';
import { OtpVerificationScreen } from '../screens/onboarding/OtpVerificationScreen';
import { LocationPermissionScreen } from '../screens/onboarding/LocationPermissionScreen';
import { TermsConsentScreen } from '../screens/onboarding/TermsConsentScreen';
import { ProfileSetupScreen } from '../screens/onboarding/ProfileSetupScreen';
import { BiometricOptInScreen } from '../screens/onboarding/BiometricOptInScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ProductDetailsScreen } from '../screens/home/ProductDetailsScreen';
import { CheckoutScreen } from '../screens/home/CheckoutScreen';
import { OrdersScreen } from '../screens/orders/OrdersScreen';
import { OrderDetailsScreen } from '../screens/orders/OrderDetailsScreen';
import { OrderTrackingScreen } from '../screens/orders/OrderTrackingScreen';
import { ProviderSearchScreen } from 'screens/orders/ProviderSearchScreen';
import { FeedbackScreen } from '../screens/orders/FeedbackScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { TermsScreen } from '../screens/legal/TermsScreen';
import { SupportScreen } from '../screens/support/SupportScreen';
import {
  AuthStackParamList,
  MainStackParamList,
  OnboardingStackParamList,
  RootStackParamList,
} from './types';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { AuthGate } from './AuthGate';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator initialRouteName="PhoneNumber" screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="PhoneNumber" component={PhoneNumberScreen} />
      <AuthStack.Screen name="OtpVerify" component={OtpVerificationScreen} />
    </AuthStack.Navigator>
  );
}

function OnboardingStackNavigator() {
  return (
    <OnboardingStack.Navigator initialRouteName="LocationPermission" screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <OnboardingStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <OnboardingStack.Screen name="BiometricOptIn" component={BiometricOptInScreen} />
      <OnboardingStack.Screen name="TermsConsent" component={TermsConsentScreen} />
    </OnboardingStack.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Home" component={HomeScreen} />
      <MainStack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      <MainStack.Screen name="Checkout" component={CheckoutScreen} />
      <MainStack.Screen name="OrderHistory" component={OrdersScreen} />
      <MainStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <MainStack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <MainStack.Screen name="ProviderSearch" component={ProviderSearchScreen} />
      <MainStack.Screen name="Feedback" component={FeedbackScreen} />
      <MainStack.Screen name="Profile" component={ProfileScreen} />
      <MainStack.Screen name="EditProfile" component={EditProfileScreen} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} />
      <MainStack.Screen name="Terms" component={TermsScreen} />
    </MainStack.Navigator>
  );
}

export function RootNavigator() {
  const { setSessionState, sessionState, phoneRegistered, session, profile, loading, bootstrapped, checkSession } = useSupabaseAuth();

  useEffect(() => {
      if (!bootstrapped || sessionState !== 1){
        setSessionState(0);
        void checkSession();
      }
  }, [bootstrapped, sessionState]);

   // console.log('RootNavigator RenderState ',{sessionState, bootstrapped})
  if (!bootstrapped || sessionState!== 1) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {/* === GATE QUI DÉCIDE D’OÙ ALLER === */}
        <RootStack.Screen name="AuthGate" component={AuthGate} />
        
        {/* === STACKS TOUJOURS MONTÉS === */}
        <RootStack.Screen name="Auth" component={AuthStackNavigator} />
        <RootStack.Screen name="Onboarding" component={OnboardingStackNavigator} />
        <RootStack.Screen name="Main" component={MainStackNavigator} />

        {/* === AUTRES SCREENS === */}
        
        <RootStack.Screen name="Support" component={SupportScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
