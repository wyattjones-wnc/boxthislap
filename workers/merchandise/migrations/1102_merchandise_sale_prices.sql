ALTER TABLE merch_products ADD COLUMN regular_price_minor INTEGER;

CREATE INDEX IF NOT EXISTS idx_merch_products_sale_feed
  ON merch_products(in_scope, regular_price_minor, price_minor, first_observed_at DESC, id ASC);
