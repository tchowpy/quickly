export type RootStackParamList = {
  AuthGate: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  Support: { orderId?: string };
};

export type AuthStackParamList = {
  PhoneNumber: undefined;
  OtpVerify: { phone: string };
};

export type OnboardingStackParamList = {
  TermsConsent: { phone: string };
  LocationPermission: undefined;
  ProfileSetup: { latitude?: number; longitude?: number; termsAccepted: boolean } | undefined;
  BiometricOptIn: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  ProductDetails: { productId: string };
  Checkout: { productId: string; quantity?: number };
  OrderHistory: undefined;
  OrderDetails: { orderId: string };
  OrderTracking: { orderId: string };
  ProviderSearch: { orderId: string };
  Feedback: { orderId: string };
  Profile: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  Terms: undefined;
};
