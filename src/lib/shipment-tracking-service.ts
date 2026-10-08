import { supabase } from "@/integrations/supabase/client";

export type ShipmentTrackingOrder = {
  id: string;
  orderNumber: string;
  status: "shipped";
  shippedAt: string;
  deliveredAt: string | null;
};

export type ShipmentTrackingInfo = {
  elapsedMs: number;
  remainingMs: number;
  elapsedDays: number;
  remainingDays: number;
  isDueForContact: boolean;
  isExpired: boolean;
};

const CONTACT_AFTER_MS = 2 * 24 * 60 * 60 * 1000;
const COLLECTION_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

export async function getShippedOrders(): Promise<ShipmentTrackingOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, shipped_at, delivered_at")
    .eq("status", "shipped")
    .not("shipped_at", "is", null)
    .order("shipped_at", { ascending: true });

  if (error) {
    console.error("Failed to load shipped orders:", error);
    throw error;
  }

  return (data ?? []).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: "shipped",
    shippedAt: order.shipped_at!,
    deliveredAt: order.delivered_at,
  }));
}

export function getShipmentTrackingInfo(
  shippedAt: string,
  now = Date.now(),
): ShipmentTrackingInfo {
  const shippedTimestamp = new Date(shippedAt).getTime();

  const elapsedMs = Math.max(0, now - shippedTimestamp);
  const remainingMs = Math.max(0, COLLECTION_LIMIT_MS - elapsedMs);

  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  const remainingDays = Math.ceil(
    remainingMs / (24 * 60 * 60 * 1000),
  );

  return {
    elapsedMs,
    remainingMs,
    elapsedDays,
    remainingDays,
    isDueForContact: elapsedMs >= CONTACT_AFTER_MS,
    isExpired: elapsedMs >= COLLECTION_LIMIT_MS,
  };
}

export function formatRemainingTime(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "Délai dépassé";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}j ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}