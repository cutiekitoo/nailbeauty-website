import { supabase } from "../integrations/supabase/client";

export type AdminProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  rating: number;
  shortDescription: string;
  description: string;
  images: string[];
  createdAt: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  isActive: boolean;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  rating: number;
  image: string;
  gallery: string[];
  description: string;
  fullDescription: string;
  stock: number;
  benefits: string[];
  usage: string[];
  tag?: string;
  category?: string;
  variants?: ProductVariant[];
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f8c8dc'/%3E%3Ccircle cx='200' cy='168' r='74' fill='%23ffffff' opacity='.72'/%3E%3Cpath d='M95 315c36-64 76-96 120-96 39 0 69 27 90 96z' fill='%23e6d6ff'/%3E%3C/svg%3E";

function fromDbProduct(row: any): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
    rating: row.rating ?? 5,
    shortDescription: row.description,
    description: row.description,
    images: row.images || [],
    createdAt: row.created_at,
  };
}

function fromDbVariant(row: any): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    code: row.code,
    name: row.name,
    price: Number(row.price),
    stock: Number(row.stock),
    image: row.image || undefined,
    isActive: row.is_active ?? true,
  };
}

async function getVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) throw error;

  return (data || []).map(fromDbVariant);
}

async function getVariantsForProducts(
  productIds: string[]
): Promise<Map<string, ProductVariant[]>> {
  const result = new Map<string, ProductVariant[]>();

  if (!productIds.length) {
    return result;
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) throw error;

  for (const row of data || []) {
    const variant = fromDbVariant(row);

    const existing = result.get(variant.productId) || [];
    existing.push(variant);

    result.set(variant.productId, existing);
  }

  return result;
}

function toStorefrontProduct(
  product: AdminProduct,
  variants: ProductVariant[] = []
): Product {
  const images = product.images.length
    ? product.images
    : [PLACEHOLDER_IMAGE];

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    rating: product.rating,
    image: images[0],
    gallery: images,
    description:
      product.shortDescription || product.description,
    stock: product.stock,
    fullDescription:
      product.description || product.shortDescription,
    benefits: [
      "Qualité professionnelle",
      "Produit sélectionné avec soin",
      "Résultat durable et élégant",
    ],
    usage: [
      "Préparer les ongles avant utilisation",
      "Appliquer selon les instructions",
      "Conserver dans un endroit sec",
    ],
    variants,
  };
}

export const productsService = {
  async list(): Promise<AdminProduct[]> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map(fromDbProduct);
  },

  async get(id: string): Promise<AdminProduct | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;

    return fromDbProduct(data);
  },

  async listStorefront(): Promise<Product[]> {
    const products = await this.list();

    const variantsByProduct =
      await getVariantsForProducts(
        products.map((product) => product.id)
      );

    return products.map((product) =>
      toStorefrontProduct(
        product,
        variantsByProduct.get(product.id) || []
      )
    );
  },

  async getStorefront(
    id: string
  ): Promise<Product | null> {
    const product = await this.get(id);

    if (!product) {
      return null;
    }

    const variants = await getVariants(id);

    return toStorefrontProduct(product, variants);
  },

  async create(
    input: Omit<AdminProduct, "id" | "createdAt">
  ): Promise<AdminProduct> {
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: input.name,
        slug: input.name
          .toLowerCase()
          .replace(/\s+/g, "-"),
        description: input.description,
        price: input.price,
        stock: input.stock,
        images: input.images,
        rating: input.rating,
      })
      .select()
      .single();

    if (error) throw error;

    return fromDbProduct(data);
  },

  async update(
    id: string,
    patch: Partial<AdminProduct>
  ): Promise<AdminProduct | null> {
    const updateData: any = {};

    if (patch.name !== undefined) {
      updateData.name = patch.name;
      updateData.slug = patch.name
        .toLowerCase()
        .replace(/\s+/g, "-");
    }

    if (patch.price !== undefined) {
      updateData.price = patch.price;
    }

    if (patch.stock !== undefined) {
      updateData.stock = patch.stock;
    }

    if (patch.description !== undefined) {
      updateData.description = patch.description;
    }

    if (patch.images !== undefined) {
      updateData.images = patch.images;
    }

    if (patch.rating !== undefined) {
      updateData.rating = patch.rating;
    }

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return null;

    return fromDbProduct(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async listVariants(
    productId: string
  ): Promise<ProductVariant[]> {
    return getVariants(productId);
  },

  async getVariant(
    variantId: string
  ): Promise<ProductVariant | null> {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("id", variantId)
      .eq("is_active", true)
      .single();

    if (error) return null;

    return fromDbVariant(data);
  },

  async decreaseStock(
    items: Array<{
      id: string;
      quantity: number;
      variantId?: string;
    }>
  ): Promise<{
    ok: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Vérification du stock
    for (const item of items) {
      if (item.variantId) {
        const { data: variant } = await supabase
          .from("product_variants")
          .select("name, code, stock")
          .eq("id", item.variantId)
          .single();

        if (!variant) {
          errors.push(
            `Variant ${item.variantId} no longer exists`
          );
          continue;
        }

        if (variant.stock < item.quantity) {
          errors.push(
            `${variant.name} (${variant.code}): only ${variant.stock} left (requested ${item.quantity})`
          );
        }
      } else {
        const { data: product } = await supabase
          .from("products")
          .select("name, stock")
          .eq("id", item.id)
          .single();

        if (!product) {
          errors.push(
            `${item.id} no longer exists`
          );
          continue;
        }

        if (product.stock < item.quantity) {
          errors.push(
            `${product.name}: only ${product.stock} left (requested ${item.quantity})`
          );
        }
      }
    }

    if (errors.length) {
      return {
        ok: false,
        errors,
      };
    }

    // Décrémentation du stock
    for (const item of items) {
      if (item.variantId) {
        const { error } = await supabase.rpc(
          "decrement_variant_stock",
          {
            p_variant_id: item.variantId,
            p_quantity: item.quantity,
          }
        );

        if (error) {
          return {
            ok: false,
            errors: [error.message],
          };
        }
      } else {
        const { error } = await supabase.rpc(
          "decrement_product_stock",
          {
            p_product_id: item.id,
            p_quantity: item.quantity,
          }
        );

        if (error) {
          return {
            ok: false,
            errors: [error.message],
          };
        }
      }
    }

    return {
      ok: true,
      errors: [],
    };
  },

  subscribe(cb: () => void): () => void {
    const channel = supabase.channel(
      `products-changes-${crypto.randomUUID()}`
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "products",
      },
      () => {
        cb();
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "product_variants",
      },
      () => {
        cb();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};