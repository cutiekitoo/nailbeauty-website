import { s as supabase } from "./client-BIO5L_-k.js";
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f8c8dc'/%3E%3Ccircle cx='200' cy='168' r='74' fill='%23ffffff' opacity='.72'/%3E%3Cpath d='M95 315c36-64 76-96 120-96 39 0 69 27 90 96z' fill='%23e6d6ff'/%3E%3C/svg%3E";
function toStorefrontProduct(product) {
  const images = product.images.length ? product.images : [PLACEHOLDER_IMAGE];
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    rating: product.rating,
    image: images[0],
    gallery: images,
    description: product.shortDescription || product.description,
    stock: product.stock,
    fullDescription: product.description || product.shortDescription,
    benefits: [
      "Premium Nail Beauty quality",
      "Selected for an elegant at-home manicure",
      "Prepared with care for each order"
    ],
    usage: [
      "Start with clean, dry nails.",
      "Use the product as part of your manicure ritual.",
      "Finish with your favorite nail care step."
    ]
  };
}
function fromDbProduct(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    stock: row.stock,
    rating: 5,
    // Default rating since DB doesn't have this field
    shortDescription: row.description,
    description: row.description,
    images: row.images || [],
    createdAt: row.created_at
  };
}
const productsService = {
  async list() {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(fromDbProduct);
  },
  async get(id) {
    const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
    if (error) return null;
    return fromDbProduct(data);
  },
  async listStorefront() {
    const products = await this.list();
    return products.map(toStorefrontProduct);
  },
  async getStorefront(id) {
    const product = await this.get(id);
    return product ? toStorefrontProduct(product) : null;
  },
  async create(input) {
    const { data, error } = await supabase.from("products").insert({
      name: input.name,
      slug: input.name.toLowerCase().replace(/\s+/g, "-"),
      description: input.description,
      price: input.price,
      stock: input.stock,
      images: input.images,
      category: "general"
    }).select().single();
    if (error) throw error;
    return fromDbProduct(data);
  },
  async update(id, patch) {
    const updateData = {};
    if (patch.name !== void 0) {
      updateData.name = patch.name;
      updateData.slug = patch.name.toLowerCase().replace(/\s+/g, "-");
    }
    if (patch.price !== void 0) updateData.price = patch.price;
    if (patch.stock !== void 0) updateData.stock = patch.stock;
    if (patch.description !== void 0) updateData.description = patch.description;
    if (patch.images !== void 0) updateData.images = patch.images;
    const { data, error } = await supabase.from("products").update(updateData).eq("id", id).select().single();
    if (error) return null;
    return fromDbProduct(data);
  },
  async remove(id) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },
  async decreaseStock(items) {
    const errors = [];
    for (const it of items) {
      const { data: product } = await supabase.from("products").select("name, stock").eq("id", it.id).single();
      if (!product) {
        errors.push(`${it.id} no longer exists`);
        continue;
      }
      if (product.stock < it.quantity) {
        errors.push(`${product.name}: only ${product.stock} left (requested ${it.quantity})`);
      }
    }
    if (errors.length) return { ok: false, errors };
    for (const it of items) {
      await supabase.rpc("decrement_product_stock", {
        p_product_id: it.id,
        p_quantity: it.quantity
      });
    }
    return { ok: true, errors: [] };
  },
  subscribe(cb) {
    const channel = supabase.channel("products-changes").on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "products"
      },
      () => {
        cb();
      }
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
export {
  productsService as p
};
