import { supabase } from "../integrations/supabase/client";

import type { DeliveryMethod } from "./shipping-config";

export type OrderItem = {
  id: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  variantId?: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  contactStartedAt?: string | null;
  customer: {
    fullName: string;
    phone: string;
  };
  delivery: {
    wilayaCode: string;
    wilayaName: string;
    method: DeliveryMethod;
    address?: string;
    officeLocation?: string;
  };
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "cod";
  status: OrderStatus;
  notes?: string;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

function fromDbOrder(row: any, items: any[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    contactStartedAt: row.contact_started_at ?? null,
    customer: {
      fullName: row.customer_name,
      phone: row.customer_phone,
    },
    delivery: {
      wilayaCode: row.wilaya_code,
      wilayaName: row.wilaya_name,
      method: row.delivery_method,
      address: row.address || undefined,
      officeLocation: row.office_location || undefined,
    },
    items: items.map((item: any) => ({
      id: item.id,
      name: item.name,
      image: item.image || "",
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
      variantId: item.variant_id || undefined,
    })),
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    notes: row.notes || undefined,
  };
}

export const ordersService = {
  async list(): Promise<Order[]> {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) throw ordersError;

    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        return fromDbOrder(order, items || []);
      }),
    );

    return ordersWithItems;
  },

  async get(orderId: string): Promise<Order | undefined> {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) return undefined;

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    return fromDbOrder(order, items || []);
  },

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: orderId,
      new_status: status,
    });

    if (error) throw error;
  },

  async markContactStarted(orderId: string): Promise<void> {
    const { error } = await supabase.rpc("mark_order_contact_started", {
      p_order_id: orderId,
    });

    if (error) throw error;
  },

  async remove(orderId: string): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) throw error;
  },

  subscribe(cb: () => void): () => void {
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => cb(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

export async function createOrder(payload: {
  customer: {
    fullName: string;
    phone: string;
  };
  delivery: {
    wilayaCode: string;
    wilayaName: string;
    method: DeliveryMethod;
    address?: string;
    officeLocation?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    variantId?: string;
  }>;
  paymentMethod: "cod";
  notes?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}> {
  const { data, error } = await supabase.rpc("create_order", {
    payload,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: data.success,
    orderId: data.order_id,
    orderNumber: data.order_number,
  };
}

export async function getRevenueStats() {
  const [productRevenue, totalRevenue] = await Promise.all([
    supabase.from("product_revenue").select("*"),
    supabase.from("total_revenue").select("*").single(),
  ]);

  if (productRevenue.error) throw productRevenue.error;
  if (totalRevenue.error) throw totalRevenue.error;

  return {
    productRevenue: productRevenue.data || [],
    totalRevenue: totalRevenue.data,
  };
}

export async function getLastOrder(): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", data.id);

  return fromDbOrder(data, items || []);
}
