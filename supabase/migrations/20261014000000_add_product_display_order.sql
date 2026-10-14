-- Persist the manual catalog order for the admin drag-and-drop control.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS display_order integer;

WITH ranked_products AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC NULLS LAST, id) - 1 AS position
  FROM public.products
)
UPDATE public.products AS product
SET display_order = ranked_products.position
FROM ranked_products
WHERE product.id = ranked_products.id
  AND product.display_order IS NULL;

ALTER TABLE public.products
  ALTER COLUMN display_order SET DEFAULT 0;

ALTER TABLE public.products
  ALTER COLUMN display_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS products_display_order_idx
  ON public.products (display_order, created_at DESC);
