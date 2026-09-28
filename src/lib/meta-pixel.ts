declare global {
    interface Window {
      fbq?: (...args: any[]) => void;
      _fbq?: any;
    }
  }
  
  const PIXEL_ID = "1070296012305601";
  
  export function initMetaPixel() {
    if (typeof window === "undefined") return;
    if (window.fbq) return;
  
    const n: any = function (...args: any[]) {
      if (n.callMethod) {
        n.callMethod.apply(n, args);
      } else {
        n.queue.push(args);
      }
    };
  
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  
    window.fbq = n;
  
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
  
    const firstScript = document.getElementsByTagName("script")[0];
  
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  
    // Meta Pixel initialization
    window.fbq?.("init", PIXEL_ID);
  }
  
  export function trackPageView() {
    if (typeof window === "undefined") return;
    if (!window.fbq) return;
  
    window.fbq("track", "PageView");
  }
  
  /**
   * ViewContent
   * Déclenché lorsqu'une fiche produit est consultée.
   */
  export function trackViewContent(product: {
    id: string;
    name: string;
    price: number;
  }) {
    if (typeof window === "undefined") return;
    if (!window.fbq) return;
  
    window.fbq("track", "ViewContent", {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name,
      value: product.price,
      currency: "DZD",
    });
  }
  
  /**
   * AddToCart
   * Déclenché lorsqu'un produit est ajouté au panier.
   */
  export function trackAddToCart(
    product: {
      id: string;
      name: string;
      price: number;
    },
    quantity: number,
  ) {
    if (typeof window === "undefined") return;
    if (!window.fbq) return;
  
    window.fbq("track", "AddToCart", {
      content_ids: [product.id],
      content_type: "product",
      content_name: product.name,
      value: product.price * quantity,
      currency: "DZD",
      contents: [
        {
          id: product.id,
          quantity,
        },
      ],
    });
  }
  
  /**
   * InitiateCheckout
   * Déclenché lorsqu'un client commence le processus de commande.
   */
  export function trackInitiateCheckout(params: {
    contentIds: string[];
    numItems: number;
    value: number;
  }) {
    if (typeof window === "undefined") return;
    if (!window.fbq) return;
  
    window.fbq("track", "InitiateCheckout", {
      content_ids: params.contentIds,
      content_type: "product",
      num_items: params.numItems,
      value: params.value,
      currency: "DZD",
    });
  }
  
  /**
   * Purchase
   * Déclenché uniquement après la création réussie d'une commande.
   */
  export function trackPurchase(params: {
    contentIds: string[];
    numItems: number;
    value: number;
    orderId?: string;
  }) {
    if (typeof window === "undefined") return;
    if (!window.fbq) return;
  
    window.fbq("track", "Purchase", {
      content_ids: params.contentIds,
      content_type: "product",
      num_items: params.numItems,
      value: params.value,
      currency: "DZD",
      ...(params.orderId ? { order_id: params.orderId } : {}),
    });
  }