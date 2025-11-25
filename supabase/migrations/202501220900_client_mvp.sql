-- Quickly client MVP supplemental schema

-- Create order_status_events table if missing
CREATE TABLE IF NOT EXISTS order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order ON order_status_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_status ON order_status_events(status);

-- Ensure base tables have RLS enabled
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS clients_select_users ON users;
CREATE POLICY clients_select_users ON users
  FOR SELECT
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS clients_insert_users ON users;
CREATE POLICY clients_insert_users ON users
  FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS clients_update_users ON users;
CREATE POLICY clients_update_users ON users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Helper policy to map auth user to users table
CREATE OR REPLACE VIEW client_identity AS
SELECT id, auth_user_id
FROM users
WHERE role = 'client';

GRANT SELECT ON client_identity TO anon, authenticated, service_role;

-- Orders policies
DROP POLICY IF EXISTS clients_select_orders ON orders;
CREATE POLICY clients_select_orders ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM client_identity ci
      WHERE ci.id = orders.client_id AND ci.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS clients_insert_orders ON orders;
CREATE POLICY clients_insert_orders ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM client_identity ci
      WHERE ci.id = orders.client_id AND ci.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS clients_update_orders ON orders;
CREATE POLICY clients_update_orders ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM client_identity ci
      WHERE ci.id = orders.client_id AND ci.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM client_identity ci
      WHERE ci.id = orders.client_id AND ci.auth_user_id = auth.uid()
    )
  );

-- Order status events policies
DROP POLICY IF EXISTS clients_select_order_status ON order_status_events;
CREATE POLICY clients_select_order_status ON order_status_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      JOIN client_identity ci ON ci.id = o.client_id
      WHERE o.id = order_status_events.order_id AND ci.auth_user_id = auth.uid()
    )
  );

-- Feedback policies
DROP POLICY IF EXISTS clients_insert_feedback ON order_feedbacks;
CREATE POLICY clients_insert_feedback ON order_feedbacks
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT ci.id FROM client_identity ci WHERE ci.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS clients_select_feedback ON order_feedbacks;
CREATE POLICY clients_select_feedback ON order_feedbacks
  FOR SELECT
  USING (
    client_id IN (
      SELECT ci.id FROM client_identity ci WHERE ci.auth_user_id = auth.uid()
    )
  );

-- Support tickets policies
DROP POLICY IF EXISTS clients_insert_support ON support_tickets;
CREATE POLICY clients_insert_support ON support_tickets
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT ci.id FROM client_identity ci WHERE ci.auth_user_id = auth.uid()
    ) OR user_id IS NULL
  );

DROP POLICY IF EXISTS clients_select_support ON support_tickets;
CREATE POLICY clients_select_support ON support_tickets
  FOR SELECT
  USING (
    user_id IN (
      SELECT ci.id FROM client_identity ci WHERE ci.auth_user_id = auth.uid()
    ) OR user_id IS NULL
  );

-- Notifications policies
DROP POLICY IF EXISTS clients_select_notifications ON notifications;
CREATE POLICY clients_select_notifications ON notifications
  FOR SELECT
  USING (
    user_id IN (
      SELECT ci.id FROM client_identity ci WHERE ci.auth_user_id = auth.uid()
    )
  );

-- Delivery tracking policies
DROP POLICY IF EXISTS clients_select_delivery_tracking ON delivery_tracking;
CREATE POLICY clients_select_delivery_tracking ON delivery_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM orders o
      JOIN client_identity ci ON ci.id = o.client_id
      WHERE o.id = delivery_tracking.order_id AND ci.auth_user_id = auth.uid()
    )
  );

-- Ensure feedback table default columns exists (backfill)
ALTER TABLE order_feedbacks
  ALTER COLUMN product_rating SET DEFAULT 5;
