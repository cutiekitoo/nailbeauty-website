import { supabase } from "../../integrations/supabase/client";

import type { DeliveryMethod } from "../shipping-config";
import type { Order, OrderItem } from "../orders";


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
    items: items.map(
      (item: any): OrderItem => ({
        id: item.id,
        productId: item.product_id || undefined,
        name: item.name,
        image: item.image || "",
        unitPrice: item.unit_price,
        quantity: item.quantity,
        lineTotal: item.line_total,
        variantId: item.variant_id || undefined,
      }),
    ),
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    notes: row.notes || undefined,
    deferredUntil: row.deferred_until ?? null,
    deferredNote: row.deferred_note || undefined,
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

  async updateStatus(
    orderId: string,
    status: Order["status"],
  ): Promise<void> {
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: orderId,
      new_status: status,
    });

    if (error) throw error;
  },

  async defer(
    orderId: string,
    deferredUntil: string | null,
    deferredNote: string,
  ): Promise<void> {
    const { error } = await supabase.rpc("defer_order", {
      p_order_id: orderId,
      p_deferred_until: deferredUntil || null,
      p_deferred_note: deferredNote.trim(),
    });

    if (error) throw error;
  },

  async updateDelivery(
    orderId: string,
    delivery: {
      method: DeliveryMethod;
      address: string | null;
      officeLocation: string | null;
    },
  ): Promise<void> {
    const { error } = await supabase.rpc("update_order_delivery", {
      p_order_id: orderId,
      p_delivery_method: delivery.method,
      p_address: delivery.address,
      p_office_location: delivery.officeLocation,
    });

    if (error) throw error;
  },

  async editOrder(
    orderId: string,
    items: Array<{
      orderItemId?: string;
      productId: string;
      variantId?: string;
      quantity: number;
    }>,
  ): Promise<{
    success: boolean;
    oldSubtotal: number;
    newSubtotal: number;
    oldShippingFee: number;
    newShippingFee: number;
    oldTotal: number;
    newTotal: number;
  }> {
    const { data, error } = await supabase.rpc("edit_order", {
      p_order_id: orderId,
      p_items: items.map((item) => ({
        orderItemId: item.orderItemId ?? null,
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: item.quantity,
      })),
    });

    if (error) throw error;

    return {
      success: data.success,
      oldSubtotal: Number(data.old_subtotal),
      newSubtotal: Number(data.new_subtotal),
      oldShippingFee: Number(data.old_shipping_fee),
      newShippingFee: Number(data.new_shipping_fee),
      oldTotal: Number(data.old_total),
      newTotal: Number(data.new_total),
    };
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
  confirmationToken?: string;
  subtotal?: number;
  shippingFee?: number;
  total?: number;
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
    confirmationToken:
      typeof data.confirmation_token === "string"
        ? data.confirmation_token
        : undefined,
    subtotal:
      Number.isFinite(Number(data.subtotal))
        ? Number(data.subtotal)
        : undefined,
    shippingFee:
      Number.isFinite(Number(data.shipping_fee))
        ? Number(data.shipping_fee)
        : undefined,
    total:
      Number.isFinite(Number(data.total))
        ? Number(data.total)
        : undefined,
  };
}

export const ORDER_CONFIRMATION_TOKEN_KEY = "nailbeauty.order-confirmation-token";
export const ORDER_CONFIRMATION_SNAPSHOT_KEY = "nailbeauty.order-confirmation-snapshot";

export async function getOrderConfirmation(
  confirmationToken: string,
): Promise<Order | null> {
  const { data, error } = await supabase.rpc("get_order_confirmation", {
    p_confirmation_token: confirmationToken,
  });

  if (error || !data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, any>;
  if (!row.id || !row.order_number || !Array.isArray(row.items)) {
    return null;
  }

  return fromDbOrder(row, row.items);
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
