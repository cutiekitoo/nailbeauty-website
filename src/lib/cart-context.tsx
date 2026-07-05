import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { productsService, type Product } from "./products-service";

export type CartItem = { id: string; quantity: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  detailed: Array<{ product: Product; quantity: number }>;
  outOfStockItems: Array<{ product: Product; quantity: number }>;
  hasOutOfStock: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (id: string) => Promise<boolean>;
  remove: (id: string) => void;
  setQuantity: (id: string, q: number) => Promise<void>;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "nail-beauty-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setItems(JSON.parse(raw));
      }
    } catch {}

    setHydrated(true);

    productsService.listStorefront().then((products) => {
      setAllProducts(products);
    });

    const unsubscribe = productsService.subscribe(() => {
      productsService.listStorefront().then((products) => {
        setAllProducts(products);
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const detailed = items
      .map((it) => {
        const product = allProducts.find((p) => p.id === it.id);
        return product ? { product, quantity: it.quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);

    const outOfStockItems = detailed.filter((d) => d.product.stock <= 0);
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = detailed.reduce((s, d) => s + d.product.price * d.quantity, 0);

    return {
      items,
      count,
      subtotal,
      detailed,
      outOfStockItems,
      hasOutOfStock: outOfStockItems.length > 0,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),

      add: async (id) => {
        const product = await productsService.getStorefront(id);

        if (!product || product.stock <= 0) {
          toast.error(`${product?.name ?? "This product"} is out of stock`);
          return false;
        }

        const current = items.find((p) => p.id === id)?.quantity ?? 0;

        if (current + 1 > product.stock) {
          toast.error(`Only ${product.stock} in stock for ${product.name}`);
          return false;
        }

        setItems((prev) => {
          const found = prev.find((p) => p.id === id);

          if (found) {
            return prev.map((p) =>
              p.id === id
                ? { ...p, quantity: p.quantity + 1 }
                : p
            );
          }

          return [...prev, { id, quantity: 1 }];
        });

        return true;
      },

      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),

      setQuantity: async (id: string, q: number) => {
        if (q > 0) {
          const product = await productsService.getStorefront(id);

          if (product && q > product.stock) {
            toast.error(`Only ${product.stock} in stock for ${product.name}`);
            q = product.stock;
          }
        }

        setItems((prev) =>
          q <= 0
            ? prev.filter((p) => p.id !== id)
            : prev.map((p) =>
                p.id === id ? { ...p, quantity: q } : p
              )
        );
      },

      clear: () => setItems([]),
    };
  }, [items, isOpen, allProducts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return ctx;
}