-- Enable trigram extension for fuzzy customer/product matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for fast similarity queries
CREATE INDEX IF NOT EXISTS customer_name_trgm
  ON agent_order_intake."Customer" USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_name_trgm
  ON agent_order_intake."Product" USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_sku_trgm
  ON agent_order_intake."Product" USING GIN (sku gin_trgm_ops);