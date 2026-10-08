import { supabase } from "@/integrations/supabase/client";

export type AnalyticsSummary = {
  totalOrders: number;
  deliveredOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
  productRevenue: number;
  averageOrderValue: number;
};

export type RevenueByDay = {
  date: string;
  revenue: number;
  orders: number;
};

export type ProductSales = {
  productId: string | null;
  name: string;
  quantity: number;
  revenue: number;
};

export type WilayaSales = {
  wilaya: string;
  orders: number;
  revenue: number;
};

type AnalyticsOrder = {
  id: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
  wilaya_name: string | null;
};

type AnalyticsOrderItem = {
  order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  line_total: number;
};

/**
 * Load all orders needed by the analytics dashboard.
 */
async function getAnalyticsOrders(): Promise<AnalyticsOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      created_at,
      delivered_at,
      wilaya_name
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load analytics orders:", error);
    throw error;
  }

  return (data ?? []) as AnalyticsOrder[];
}

/**
 * Load order items for a list of orders.
 */
async function getOrderItems(
  orderIds: string[],
): Promise<AnalyticsOrderItem[]> {
  if (orderIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      order_id,
      product_id,
      name,
      quantity,
      line_total
    `)
    .in("order_id", orderIds);

  if (error) {
    console.error("Failed to load analytics order items:", error);
    throw error;
  }

  return (data ?? []) as AnalyticsOrderItem[];
}

/**
 * General analytics summary.
 *
 * Product revenue excludes shipping fees.
 * Only delivered orders are included in product revenue.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const orders = await getAnalyticsOrders();

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered",
  );

  const deliveredOrderIds = deliveredOrders.map((order) => order.id);

  const items = await getOrderItems(deliveredOrderIds);

  const productRevenue = items.reduce(
    (sum, item) => sum + Number(item.line_total ?? 0),
    0,
  );

  return {
    totalOrders: orders.length,

    deliveredOrders: deliveredOrders.length,

    pendingOrders: orders.filter(
      (order) => order.status === "pending",
    ).length,

    confirmedOrders: orders.filter(
      (order) => order.status === "confirmed",
    ).length,

    shippedOrders: orders.filter(
      (order) => order.status === "shipped",
    ).length,

    cancelledOrders: orders.filter(
      (order) => order.status === "cancelled",
    ).length,

    productRevenue,

    averageOrderValue:
      deliveredOrders.length > 0
        ? productRevenue / deliveredOrders.length
        : 0,
  };
}

/**
 * Revenue by day.
 *
 * Uses delivered_at when available because this represents
 * the actual date the order became delivered.
 *
 * Product revenue only — shipping fees are excluded.
 */
export async function getRevenueByDay(
  days = 30,
): Promise<RevenueByDay[]> {
  const orders = await getAnalyticsOrders();

  const fromDate = new Date();

  fromDate.setDate(fromDate.getDate() - (days - 1));
  fromDate.setHours(0, 0, 0, 0);

  const deliveredOrders = orders.filter((order) => {
    if (order.status !== "delivered") {
      return false;
    }

    const revenueDate = new Date(
      order.delivered_at ?? order.created_at,
    );

    return revenueDate >= fromDate;
  });

  const orderIds = deliveredOrders.map((order) => order.id);

  const items = await getOrderItems(orderIds);

  const revenueMap = new Map<
    string,
    {
      revenue: number;
      orders: number;
    }
  >();

  /**
   * Create all days first so the chart also displays
   * days with zero revenue.
   */
  for (let i = 0; i < days; i++) {
    const date = new Date(fromDate);

    date.setDate(fromDate.getDate() + i);

    const key = date.toISOString().slice(0, 10);

    revenueMap.set(key, {
      revenue: 0,
      orders: 0,
    });
  }

  /**
   * Count each delivered order once per day.
   */
  for (const order of deliveredOrders) {
    const revenueDate = new Date(
      order.delivered_at ?? order.created_at,
    );

    const key = revenueDate.toISOString().slice(0, 10);

    if (!revenueMap.has(key)) {
      continue;
    }

    const current = revenueMap.get(key)!;

    current.orders += 1;
  }

  /**
   * Add product revenue to each corresponding day.
   */
  const orderDateMap = new Map<string, string>();

  for (const order of deliveredOrders) {
    const revenueDate = new Date(
      order.delivered_at ?? order.created_at,
    );

    orderDateMap.set(
      order.id,
      revenueDate.toISOString().slice(0, 10),
    );
  }

  for (const item of items) {
    const key = orderDateMap.get(item.order_id);

    if (!key || !revenueMap.has(key)) {
      continue;
    }

    const current = revenueMap.get(key)!;

    current.revenue += Number(item.line_total ?? 0);
  }

  return Array.from(revenueMap.entries()).map(
    ([date, values]) => ({
      date,
      revenue: values.revenue,
      orders: values.orders,
    }),
  );
}

/**
 * Top-selling products.
 *
 * Only delivered orders are included.
 */
export async function getTopProducts(
  limit = 10,
): Promise<ProductSales[]> {
  const orders = await getAnalyticsOrders();

  const deliveredOrderIds = orders
    .filter((order) => order.status === "delivered")
    .map((order) => order.id);

  const items = await getOrderItems(deliveredOrderIds);

  const productMap = new Map<string, ProductSales>();

  for (const item of items) {
    const key = item.product_id ?? item.name;

    const current = productMap.get(key);

    if (current) {
      current.quantity += Number(item.quantity ?? 0);
      current.revenue += Number(item.line_total ?? 0);
    } else {
      productMap.set(key, {
        productId: item.product_id,
        name: item.name,
        quantity: Number(item.quantity ?? 0),
        revenue: Number(item.line_total ?? 0),
      });
    }
  }

  return Array.from(productMap.values())
    .sort((a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity;
      }

      return b.revenue - a.revenue;
    })
    .slice(0, limit);
}

/**
 * Top-performing wilayas.
 *
 * Uses orders.wilaya_name.
 *
 * Only delivered orders are included.
 * Revenue excludes shipping fees.
 */
export async function getTopWilayas(
  limit = 10,
): Promise<WilayaSales[]> {
  const orders = await getAnalyticsOrders();

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered",
  );

  const deliveredOrderIds = deliveredOrders.map(
    (order) => order.id,
  );

  const items = await getOrderItems(deliveredOrderIds);

  /**
   * Map order ID -> wilaya.
   */
  const orderWilayaMap = new Map<string, string>();

  for (const order of deliveredOrders) {
    const wilaya =
      order.wilaya_name?.trim() || "Unknown";

    orderWilayaMap.set(order.id, wilaya);
  }

  const wilayaMap = new Map<string, WilayaSales>();

  /**
   * First count each delivered order once.
   */
  for (const order of deliveredOrders) {
    const wilaya =
      order.wilaya_name?.trim() || "Unknown";

    const current = wilayaMap.get(wilaya);

    if (current) {
      current.orders += 1;
    } else {
      wilayaMap.set(wilaya, {
        wilaya,
        orders: 1,
        revenue: 0,
      });
    }
  }

  /**
   * Add product revenue to the corresponding wilaya.
   */
  for (const item of items) {
    const wilaya = orderWilayaMap.get(item.order_id);

    if (!wilaya) {
      continue;
    }

    const current = wilayaMap.get(wilaya);

    if (!current) {
      continue;
    }

    current.revenue += Number(item.line_total ?? 0);
  }

  return Array.from(wilayaMap.values())
    .sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }

      return b.orders - a.orders;
    })
    .slice(0, limit);
}