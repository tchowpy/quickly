# Quickly Client MVP Architecture

## Frontend
- **Framework**: Expo SDK 54 (React Native 0.81, React 19) with NativeWind for utility-first styling.
- **State Management**: Zustand stores for auth/session, catalog data, orders, notifications, and UI overlays. Persist critical slices (`auth`, `order`) with AsyncStorage.
- **Navigation**: React Navigation v7 avec:
  - `RootStack` sélectionnant `AuthStack` (OTP), `OnboardingStack`, ou `MainStack`.
  - `OnboardingStack` : `LocationPermission → TermsConsent → ProfileSetup → BiometricOptIn`.
  - `MainStack` orchestre l'expérience client (`Home`, `ProductDetails`, `Checkout`, `OrderHistory`, `Profile`, `Notifications`, `Terms`) avec des modales (`QuickOrderModal`, `OrderTrackingModal`) déclenchées depuis l'accueil.
  - Les écrans transverses (`OrderTracking`, `Feedback`, `Support`) restent accessibles via le `RootStack`.
- **Realtime**: Supabase Realtime channels wrap order lifecycle updates and courier GPS tracking. Hooks encapsulate subscriptions (`useRealtimeOrder`).
- **Location & Maps**: Expo Location obtains foreground permission; `expo-maps` renders customer & courier positions.
- **Theme**: Light theme using Quickly brand colors (#7B3FE4, #3FE47B, neutral grays), reusable card & button components with subtle animations.

## Backend (Supabase)
- **Database**: Postgres schema with RLS enforcing tenant isolation via `auth.uid()` / `jwt() claims`.
- **Tables**: `users`, `user_profiles`, `products`, `categories`, `subcategories`, `orders`, `order_items`, `order_status_events`, `order_feedback`, `notifications`, `wallets`, `support_tickets`, `pricing_tiers`.
- **Edge Functions**:
  - `pricing-estimate`: Computes service + delivery fees based on regulated price and distance (150 XOF/km) with tiered surcharges.
  - `orders-broadcast`: Broadcasts new orders to provider channel and returns accepted provider if any.
  - `order-status-update`: Persists status transitions & emits realtime updates for clients.
  - `support-ticket`: Creates support ticket rows and sends notification events.
  - `auth-send-otp` / `auth-verify-otp`: Custom OTP flow powered by the MTN CI SMS gateway. Generates/validates hashed codes, provisions users in `auth.users`, and returns Supabase sessions without exposing service secrets to the client.
- **Policies**: Strong RLS for every user-facing table ensuring users read/write only rows tied to their `auth_user_id`. Storage policy for user avatars & proof-of-delivery media.
- **Realtime**: `orders` table changes mirrored to `order_status_events` and auto-broadcasted via database trigger → edge function call.

## Key Flows
1. **Phone Auth** → OTP via MTN CI Edge Functions, `users` row (role `client`), localisation foreground demandée en première étape, CGU acceptées, profil complété puis opt-in biométrie locale (persistée).
2. **Browsing** → grille de catégories 3 colonnes sur Home, suggestions visuelles (icônes SVG) et accès rapide au profil/notifications.
3. **Ordering** → modales `QuickOrder` / recherche depuis Home, estimation pricing (Edge function), checkout, insertion `orders` + abonnement realtime.
4. **Tracking** → suivi GPS via modal temps réel accessible depuis l'accueil sans quitter le flow.
5. **Account** → Profil permet activation/désactivation biométrie, consultation CGU, accès support et historique.
4. **Tracking** → map updates as driver publishes coordinates to `order_locations` channel. Status bar reflects `order_status_events`.
5. **Completion** → `process_order_commission` RPC finalizes wallet transactions, customer confirms delivery, optionally files dispute.
6. **Feedback & Support** → rating + comment stored in `order_feedback`; support ticket form inserts into `support_tickets` with realtime notification to ops team.

## Configuration
- `.env` / Expo secrets: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- AsyncStorage keys: `quickly.auth`, `quickly.order`, `quickly.preferences`.
- Notification topics: `client_{userId}`, `order_{orderId}`.

This blueprint drives the implementation for the Quickly client MVP across mobile and Supabase layers.
