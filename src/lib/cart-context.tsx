import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import {
  productsService,
  type Product,
  type ProductVariant,
} from "./products-service";

import { trackAddToCart } from "./meta-pixel";

export type CartItem = {
  id: string;
  quantity: number;
  variantId?: string;
};

type DetailedCartItem = {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;

  detailed: DetailedCartItem[];

  outOfStockItems: DetailedCartItem[];

  hasOutOfStock: boolean;

  isOpen: boolean;

  open: () => void;
  close: () => void;

  add: (
    id: string,
    quantity?: number,
    variantId?: string
  ) => Promise<boolean>;

  remove: (
    id: string,
    variantId?: string
  ) => void;

  setQuantity: (
    id: string,
    q: number,
    variantId?: string
  ) => Promise<void>;

  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

const STORAGE_KEY = "nail-beauty-cart-v1";

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore invalid cart data
    }

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

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items)
    );
  }, [items, hydrated]);

  const value = useMemo<CartCtx>(() => {
    const detailed = items
    .map((item) => {
      const product = allProducts.find(
        (p) => p.id === item.id
      );
  
      if (!product) {
        return null;
      }
  
      const variant = item.variantId
        ? product.variants?.find(
            (v) => v.id === item.variantId
          )
        : undefined;
  
      return {
        product,
        quantity: item.quantity,
        variant,
      };
    })
    .filter((item) => item !== null) as DetailedCartItem[];

    const outOfStockItems =
      detailed.filter((item) => {
        if (item.variant) {
          return item.variant.stock <= 0;
        }

        return item.product.stock <= 0;
      });

    const count = items.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const subtotal = detailed.reduce(
      (sum, item) => {
        const price =
          item.variant?.price ??
          item.product.price;

        return (
          sum +
          price * item.quantity
        );
      },
      0
    );

    const add = async (
      id: string,
      quantity = 1,
      variantId?: string
    ): Promise<boolean> => {
      const safeQuantity = Math.max(
        1,
        Math.floor(quantity)
      );

      const product =
        await productsService.getStorefront(id);

      if (!product) {
        toast.error("Produit introuvable");
        return false;
      }

      let variant: ProductVariant | undefined;

      if (variantId) {
        variant =
          product.variants?.find(
            (v) => v.id === variantId
          );

        if (!variant) {
          toast.error(
            "Cette variante n'est plus disponible"
          );

          return false;
        }

        if (variant.stock <= 0) {
          toast.error(
            `${variant.name} est en rupture de stock`
          );

          return false;
        }
      } else if (
        product.variants &&
        product.variants.length > 0
      ) {
        toast.error(
          "Veuillez sélectionner une variante"
        );

        return false;
      }

      const availableStock =
        variant?.stock ?? product.stock;

      const current =
        items.find(
          (item) =>
            item.id === id &&
            item.variantId === variantId
        )?.quantity ?? 0;

      if (
        current + safeQuantity >
        availableStock
      ) {
        const remaining =
          availableStock - current;

        toast.error(
          remaining > 0
            ? `Seulement ${remaining} disponible${
                remaining > 1 ? "s" : ""
              }`
            : "Stock insuffisant"
        );

        return false;
      }

      setItems((prev) => {
        const found = prev.find(
          (item) =>
            item.id === id &&
            item.variantId === variantId
        );

        if (found) {
          return prev.map((item) =>
            item.id === id &&
            item.variantId === variantId
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    safeQuantity,
                }
              : item
          );
        }

        return [
          ...prev,
          {
            id,
            quantity: safeQuantity,
            ...(variantId
              ? { variantId }
              : {}),
          },
        ];
      });

      trackAddToCart(
        product,
        safeQuantity
      );

      return true;
    };

    const remove = (
      id: string,
      variantId?: string
    ) => {
      setItems((prev) =>
        prev.filter(
          (item) =>
            !(
              item.id === id &&
              item.variantId === variantId
            )
        )
      );
    };

    const setQuantity = async (
      id: string,
      q: number,
      variantId?: string
    ) => {
      if (q > 0) {
        const product =
          await productsService.getStorefront(id);

        if (!product) {
          return;
        }

        let availableStock =
          product.stock;

        if (variantId) {
          const variant =
            product.variants?.find(
              (v) => v.id === variantId
            );

          if (!variant) {
            return;
          }

          availableStock =
            variant.stock;
        }

        if (q > availableStock) {
          toast.error(
            `Seulement ${availableStock} disponible${
              availableStock > 1
                ? "s"
                : ""
            }`
          );

          q = availableStock;
        }
      }

      setItems((prev) => {
        if (q <= 0) {
          return prev.filter(
            (item) =>
              !(
                item.id === id &&
                item.variantId === variantId
              )
          );
        }

        return prev.map((item) =>
          item.id === id &&
          item.variantId === variantId
            ? {
                ...item,
                quantity: q,
              }
            : item
        );
      });
    };

    const clear = () => {
      setItems([]);
    };

    return {
      items,
      count,
      subtotal,
      detailed,
      outOfStockItems,
      hasOutOfStock:
        outOfStockItems.length > 0,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      remove,
      setQuantity,
      clear,
    };
  }, [items, isOpen, allProducts]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);

  if (!ctx) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return ctx;
}