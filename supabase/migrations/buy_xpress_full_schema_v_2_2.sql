-- ===========================================================
--  BUYXPRESS DATABASE SCHEMA - VERSION 2.2 (FULL)
--  Quick Commerce Platform (Client / Provider / Delivery)
--  © 2025 BuyXpress - MVP Supabase Release
-- ===========================================================

-- ==============================
--  ENUMERATIONS
-- ==============================
CREATE TYPE user_role AS ENUM ('client', 'provider', 'delivery', 'admin');
CREATE TYPE payment_mode AS ENUM ('mobile_money', 'cash_on_delivery', 'mixed');
CREATE TYPE order_status AS ENUM ('created', 'pending_broadcast','broadcasted','accepted', 'confirmed', 'in_preparation', 'assigned', 'in_delivery', 'delivered', 'completed', 'disputed', 'cancelled');
CREATE TYPE subscription_name AS ENUM ('free', 'pro', 'elite', 'enterprise');
CREATE TYPE subscription_period AS ENUM ('monthly', 'annual');
CREATE TYPE delivery_status AS ENUM ('pending','rejected','assigned','retrieved','in_transit','at_destination','delivered','failed');
CREATE TYPE delivery_dispute_status AS ENUM ('pending','under_review','resolved','rejected');
CREATE TYPE transaction_type AS ENUM ('credit','debit','commission','refund','payout');

-- ==============================
--  USERS & PROFILES
-- ==============================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL, -- from supabase auth.users
  phone TEXT NOT NULL,
  full_name TEXT,
  email text,
  role user_role NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  is_active boolean DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (auth_user_id, role)
);

CREATE INDEX idx_users_auth ON users(auth_user_id);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  business_name TEXT,
  id_document_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_user_profiles ON user_profiles(user_id);

-- ==============================
--  PRODUCT STRUCTURE (CATEGORIES)
-- ==============================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID REFERENCES subcategories(id),
  unit TEXT,
  regulated_price NUMERIC,
  region TEXT,
  effective_date DATE DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id UUID REFERENCES subcategories(id),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  base_price NUMERIC NOT NULL,

  max_price NUMERIC NOT NULL,
  min_price NUMERIC NOT NULL,
  quantite_minimale INTEGER DEFAULT 0,
  image_url TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_suggested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE provider_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (provider_id, product_id)
);

-- ==============================
--  ORDERS & ITEMS
-- ==============================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES users(id),
  delivery_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id),
  product_name text,
  unit_price NUMERIC,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC,
  delivery_expected TIMESTAMP,
  payment_mode payment_mode DEFAULT 'cash_on_delivery',
  status order_status DEFAULT 'created',
  delivery_fee NUMERIC DEFAULT 0,
  service_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  location_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT now(),
  canceled_at TIMESTAMP,
  cancelel_by UUID REFERENCES users(id)
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC,
  total_price NUMERIC,
  created_at TIMESTAMP DEFAULT now()
);

-- ==============================
--  TRANSACTIONS & PAYMENTS
-- ==============================
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  order_id uuid REFERENCES orders(id),
  type transaction_type,
  amount numeric NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  amount numeric NOT NULL,
  payout_method text,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES users(id)
);

-- ==============================
--  WALLETS
-- ==============================
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role user_role,
  balance NUMERIC DEFAULT 0,
  locked_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- ==============================
--  SUBSCRIPTIONS
-- ==============================

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name subscription_name,
  monthly_fee numeric DEFAULT 0,
  annual_fee numeric DEFAULT 0,
  transaction_commission numeric DEFAULT 0.01,
  benefits jsonb,
  is_active boolean DEFAULT true,
  UNIQUE (name)
);

CREATE TABLE subscription_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name subscription_name DEFAULT 'free',
  period subscription_period default 'monthly',
  fee NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0.01,
  status TEXT DEFAULT 'active',
  next_billing_date DATE DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (name, user_id)
);

-- ==============================
--  DELIVERY TRACKING
-- ==============================
CREATE TABLE delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES users(id),
  distance_km NUMERIC,
  delivery_expected TIMESTAMP,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  proof_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status delivery_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);


-- ======================
-- 🔹 FEEDBACKS & LITIGES
-- ======================
CREATE TABLE order_feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  client_id uuid REFERENCES users(id),
  provider_id uuid REFERENCES users(id),
  product_rating int CHECK (product_rating BETWEEN 1 AND 5),
  courier_rating int CHECK (courier_rating BETWEEN 1 AND 5),
  client_rating int CHECK (client_rating BETWEEN 1 AND 5),
  feedback_on_client text,
  feedback_on_provider text,
  feedback_on_courier text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE delivery_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  client_id uuid REFERENCES users(id),
  provider_id uuid REFERENCES users(id),
  reason text NOT NULL,
  details text,
  status delivery_dispute_status DEFAULT 'pending',
  resolution text,
  resolved_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- ======================
-- 🔹 SUPPORT & NOTIFICATIONS
-- ======================

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  title text NOT NULL,
  message text NOT NULL,
  type text CHECK (type IN ('order','delivery','wallet','payout','system','dispute')),
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ==============================
--  END OF SCHEMA
-- ==============================
