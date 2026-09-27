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
};

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f8c8dc'/%3E%3Ccircle cx='200' cy='168' r='74' fill='%23ffffff' opacity='.72'/%3E%3Cpath d='M95 315c36-64 76-96 120-96 39 0 69 27 90 96z' fill='%23e6d6ff'/%3E%3C/svg%3E";

function toStorefrontProduct(product: AdminProduct): Product {
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
      "Qualité professionnelle",
      "Produit sélectionné avec soin",
      "Résultat durable et élégant",
    ],
    usage: [
      "Préparer les ongles avant utilisation",
      "Appliquer selon les instructions",
      "Conserver dans un endroit sec",
    ],
  };
}

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

export const productsService = {
  async list(): Promise<AdminProduct[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(fromDbProduct);
  },
  
  async get(id: string): Promise<AdminProduct | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return fromDbProduct(data);
  },
  
  async listStorefront(): Promise<Product[]> {
    const products = await this.list();
    return products.map(toStorefrontProduct);
  },
  
  async getStorefront(id: string): Promise<Product | null> {
    const product = await this.get(id);
    return product ? toStorefrontProduct(product) : null;
  },
  
  async create(input: Omit<AdminProduct, "id" | "createdAt">): Promise<AdminProduct> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: input.name,
        slug: input.name.toLowerCase().replace(/\s+/g, '-'),
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
  
  async update(id: string, patch: Partial<AdminProduct>): Promise<AdminProduct | null> {
    const updateData: any = {};
    if (patch.name !== undefined) {
      updateData.name = patch.name;
      updateData.slug = patch.name.toLowerCase().replace(/\s+/g, '-');
    }
    if (patch.price !== undefined) updateData.price = patch.price;
    if (patch.stock !== undefined) updateData.stock = patch.stock;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.images !== undefined) updateData.images = patch.images;
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return null;
    return fromDbProduct(data);
  },
  
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
  
  async decreaseStock(items: Array<{ id: string; quantity: number }>): Promise<{ ok: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check stock availability
    for (const it of items) {
      const { data: product } = await supabase
        .from('products')
        .select('name, stock')
        .eq('id', it.id)
        .single();
      
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
      await supabase.rpc('decrement_product_stock', {
        p_product_id: it.id,
        p_quantity: it.quantity
      });
    }

    return { ok: true, errors: [] };
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
  
    channel.subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  },};