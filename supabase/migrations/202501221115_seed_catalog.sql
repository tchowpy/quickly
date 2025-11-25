-- Seed data for Quickly mobile catalogue

-- Categories
INSERT INTO categories (name, description)
SELECT 'Alimentation', 'Produits frais et épicerie du quotidien'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Alimentation');

INSERT INTO categories (name, description)
SELECT 'Boissons', 'Sélection de jus, sodas et eaux locales'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Boissons');

INSERT INTO categories (name, description)
SELECT 'Hygiène & Entretien', 'Essentiels pour la maison et le bien-être'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hygiène & Entretien');

-- Subcategories
WITH alimentation AS (
  SELECT id FROM categories WHERE name = 'Alimentation'
), boissons AS (
  SELECT id FROM categories WHERE name = 'Boissons'
), hygiene AS (
  SELECT id FROM categories WHERE name = 'Hygiène & Entretien'
)
INSERT INTO subcategories (name, description, category_id)
SELECT 'Fruits & Légumes', 'Produits frais de proximité', alimentation.id
FROM alimentation
WHERE NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Fruits & Légumes');

WITH alimentation AS (
  SELECT id FROM categories WHERE name = 'Alimentation'
)
INSERT INTO subcategories (name, description, category_id)
SELECT 'Produits Laitiers', 'Yaourts, laits et fromages', alimentation.id
FROM alimentation
WHERE NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Produits Laitiers');

WITH boissons AS (
  SELECT id FROM categories WHERE name = 'Boissons'
)
INSERT INTO subcategories (name, description, category_id)
SELECT 'Jus & Sodas', 'Boissons rafraîchissantes', boissons.id
FROM boissons
WHERE NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Jus & Sodas');

WITH boissons AS (
  SELECT id FROM categories WHERE name = 'Boissons'
)
INSERT INTO subcategories (name, description, category_id)
SELECT 'Eaux & Boissons chaudes', 'Eaux minérales et thés instantanés', boissons.id
FROM boissons
WHERE NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Eaux & Boissons chaudes');

WITH hygiene AS (
  SELECT id FROM categories WHERE name = 'Hygiène & Entretien'
)
INSERT INTO subcategories (name, description, category_id)
SELECT 'Hygiène personnelle', 'Soins du corps et accessoires', hygiene.id
FROM hygiene
WHERE NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Hygiène personnelle');

WITH hygiene AS (
  SELECT id FROM categories WHERE name = 'Hygiène & Entretien'
)
INSERT INTO subcategories (name, description, category_id)
SELECT 'Entretien maison', 'Nettoyants et produits ménagers', hygiene.id
FROM hygiene
WHERE NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Entretien maison');

-- Products
WITH sub AS (
  SELECT id FROM subcategories WHERE name = 'Fruits & Légumes'
)
INSERT INTO products (name, description, unit, base_price, stock, is_active, subcategory_id, price_regulated)
SELECT 'Panier primeur', 'Sélection de fruits et légumes pour 2 personnes', 'panier', 6500, 15, true, sub.id, 6500
FROM sub
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Panier primeur');

WITH sub AS (
  SELECT id FROM subcategories WHERE name = 'Produits Laitiers'
)
INSERT INTO products (name, description, unit, base_price, stock, is_active, subcategory_id, price_regulated)
SELECT 'Pack lait UHT 6x1L', 'Lait demi-écrémé longue conservation', 'pack', 5400, 25, true, sub.id, 5200
FROM sub
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Pack lait UHT 6x1L');

WITH sub AS (
  SELECT id FROM subcategories WHERE name = 'Jus & Sodas'
)
INSERT INTO products (name, description, unit, base_price, stock, is_active, subcategory_id, price_regulated)
SELECT 'Jus d''ananas 1L', 'Jus pressé sans sucres ajoutés', 'bouteille', 1800, 40, true, sub.id, 1700
FROM sub
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Jus d''ananas 1L');

WITH sub AS (
  SELECT id FROM subcategories WHERE name = 'Eaux & Boissons chaudes'
)
INSERT INTO products (name, description, unit, base_price, stock, is_active, subcategory_id, price_regulated)
SELECT 'Pack eau minérale 6x1.5L', 'Eau minérale naturelle', 'pack', 2500, 30, true, sub.id, 2400
FROM sub
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Pack eau minérale 6x1.5L');

WITH sub AS (
  SELECT id FROM subcategories WHERE name = 'Hygiène personnelle'
)
INSERT INTO products (name, description, unit, base_price, stock, is_active, subcategory_id, price_regulated)
SELECT 'Kit soins essentiels', 'Gel douche, déodorant, crème hydratante', 'kit', 4800, 20, true, sub.id, 4700
FROM sub
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Kit soins essentiels');

WITH sub AS (
  SELECT id FROM subcategories WHERE name = 'Entretien maison'
)
INSERT INTO products (name, description, unit, base_price, stock, is_active, subcategory_id, price_regulated)
SELECT 'Pack ménage rapide', 'Désinfectant multi-usage + éponge', 'pack', 3200, 35, true, sub.id, 3000
FROM sub
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Pack ménage rapide');
