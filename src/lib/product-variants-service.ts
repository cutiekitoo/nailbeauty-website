import { supabase } from "../integrations/supabase/client";

export type ProductVariant = {
  id: string;
  productId: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function fromDbVariant(row: any): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    code: row.code,
    name: row.name,
    price: Number(row.price),
    stock: Number(row.stock),
    image: row.image ?? null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const productVariantsService = {
  async listByProduct(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map(fromDbVariant);
  },

  async listActiveByProduct(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map(fromDbVariant);
  },

  async get(id: string): Promise<ProductVariant | null> {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;

    return fromDbVariant(data);
  },

  async create(input: {
    productId: string;
    code: string;
    name: string;
    price: number;
    stock: number;
    image?: string | null;
    isActive?: boolean;
  }): Promise<ProductVariant> {
    const { data, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: input.productId,
        code: input.code.trim(),
        name: input.name.trim(),
        price: input.price,
        stock: input.stock,
        image: input.image ?? null,
        is_active: input.isActive ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return fromDbVariant(data);
  },

  async update(
    id: string,
    patch: Partial<{
      code: string;
      name: string;
      price: number;
      stock: number;
      image: string | null;
      isActive: boolean;
    }>
  ): Promise<ProductVariant | null> {
    const updateData: Record<string, unknown> = {};

    if (patch.code !== undefined) {
      updateData.code = patch.code.trim();
    }

    if (patch.name !== undefined) {
      updateData.name = patch.name.trim();
    }

    if (patch.price !== undefined) {
      updateData.price = patch.price;
    }

    if (patch.stock !== undefined) {
      updateData.stock = patch.stock;
    }

    if (patch.image !== undefined) {
      updateData.image = patch.image;
    }

    if (patch.isActive !== undefined) {
      updateData.is_active = patch.isActive;
    }

    const { data, error } = await supabase
      .from("product_variants")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) return null;

    return fromDbVariant(data);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  subscribe(productId: string, cb: () => void): () => void {
    const channel = supabase.channel(
      `product-variants-changes-${productId}-${crypto.randomUUID()}`
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "product_variants",
        filter: `product_id=eq.${productId}`,
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