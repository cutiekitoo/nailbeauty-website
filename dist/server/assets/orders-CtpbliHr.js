import { s as supabase } from "./client-BIO5L_-k.js";
const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled"
];
function fromDbOrder(row, items) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    customer: {
      fullName: row.customer_name,
      phone: row.customer_phone
    },
    delivery: {
      wilayaCode: row.wilaya_code,
      wilayaName: row.wilaya_name,
      method: row.delivery_method,
      address: row.address || void 0,
      officeLocation: row.office_location || void 0
    },
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image || "",
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total
    })),
    subtotal: row.subtotal,
    shippingFee: row.shipping_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    status: row.status,
    notes: row.notes || void 0
  };
}
const ordersService = {
  async list() {
    const { data: orders, error: ordersError } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (ordersError) throw ordersError;
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order.id);
        return fromDbOrder(order, items || []);
      })
    );
    return ordersWithItems;
  },
  async get(orderId) {
    const { data: order, error } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (error) return void 0;
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    return fromDbOrder(order, items || []);
  },
  async updateStatus(orderId, status) {
    const { error } = await supabase.rpc("update_order_status", {
      p_order_id: orderId,
      new_status: status
    });
    if (error) throw error;
  },
  async remove(orderId) {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) throw error;
  },
  subscribe(cb) {
    const channel = supabase.channel("orders-changes").on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders"
      },
      () => cb()
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
async function createOrder(payload) {
  const { data, error } = await supabase.rpc("create_order", {
    payload
  });
  if (error) {
    return { success: false, error: error.message };
  }
  return {
    success: data.success,
    orderId: data.order_id,
    orderNumber: data.order_number
  };
}
async function getLastOrder() {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(1).single();
  if (error) return null;
  const { data: items } = await supabase.from("order_items").select("*").eq("order_id", data.id);
  return fromDbOrder(data, items || []);
}
export {
  ORDER_STATUSES as O,
  createOrder as c,
  getLastOrder as g,
  ordersService as o
};
