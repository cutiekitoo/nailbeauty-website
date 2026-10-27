import type { DeliveryMethod } from "./shipping-config";

export type OrderItem = {
  id: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  variantId?: string;
  productId?: string;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "deferred";

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
  internalNote?: string | null;
  deferredUntil?: string | null;
  deferredNote?: string | null;
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "deferred",
];
