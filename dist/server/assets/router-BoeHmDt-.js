import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, useRouter, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Toaster as Toaster$1 } from "sonner";
const appCss = "/assets/styles-DC-eWNUE.css";
function reportLovableError(error, context = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error"
    }
  );
}
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 text-xl font-semibold text-foreground", children: "Page not found" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist or has been moved." }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(
      Link,
      {
        to: "/",
        className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        children: "Go home"
      }
    ) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold tracking-tight text-foreground", children: "This page didn't load" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Something went wrong on our end. You can try refreshing or head back home." }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex flex-wrap justify-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const Route$a = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "An e-commerce platform for premium nail beauty products, featuring a responsive homepage with real-time search and cart functionality." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "An e-commerce platform for premium nail beauty products, featuring a responsive homepage with real-time search and cart functionality." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "twitter:description", content: "An e-commerce platform for premium nail beauty products, featuring a responsive homepage with real-time search and cart functionality." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/65ac9bc5-cdf4-4d56-bbd2-71021f6276eb/id-preview-da6f1f63--7c4e2e47-aeec-4687-9490-76a8c764e720.lovable.app-1781218122477.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/65ac9bc5-cdf4-4d56-bbd2-71021f6276eb/id-preview-da6f1f63--7c4e2e47-aeec-4687-9490-76a8c764e720.lovable.app-1781218122477.png" }
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss
      }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const { queryClient } = Route$a.useRouteContext();
  return /* @__PURE__ */ jsxs(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(Toaster, { position: "top-center" })
  ] });
}
const $$splitComponentImporter$9 = () => import("./order-success-Coi6MB37.js");
const Route$9 = createFileRoute("/order-success")({
  head: () => ({
    meta: [{
      title: "Order Confirmed — Nail Beauty"
    }, {
      name: "description",
      content: "Your Nail Beauty order is on its way."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./checkout-Bgzk4Yhm.js");
const Route$8 = createFileRoute("/checkout")({
  head: () => ({
    meta: [{
      title: "Checkout — Nail Beauty"
    }, {
      name: "description",
      content: "Complete your order with Cash on Delivery across Algeria."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./index-9UroT0L6.js");
const Route$7 = createFileRoute("/")({
  head: () => ({
    meta: [{
      title: "Nail Beauty — Beautiful Nails, Beautiful You"
    }, {
      name: "description",
      content: "Premium nail polish, art stickers, brushes and tools. Salon-quality results at home with Nail Beauty."
    }, {
      property: "og:title",
      content: "Nail Beauty — Beautiful Nails, Beautiful You"
    }, {
      property: "og:description",
      content: "Discover our latest nail products and accessories."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./admin.index-CE4tc9H6.js");
const Route$6 = createFileRoute("/admin/")({
  head: () => ({
    meta: [{
      title: "Admin Dashboard — Nail Beauty"
    }, {
      name: "robots",
      content: "noindex"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./products._id-D9MZmGXb.js");
const Route$5 = createFileRoute("/products/$id")({
  head: () => ({
    meta: [{
      title: "Product — Nail Beauty"
    }, {
      name: "description",
      content: "View product details from Nail Beauty."
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./admin.shipping-DttZQt1P.js");
const Route$4 = createFileRoute("/admin/shipping")({
  head: () => ({
    meta: [{
      title: "Shipping Rates — Admin"
    }, {
      name: "robots",
      content: "noindex"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./admin.products-BsMPE3rS.js");
const Route$3 = createFileRoute("/admin/products")({
  head: () => ({
    meta: [{
      title: "Products — Admin"
    }, {
      name: "robots",
      content: "noindex"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./admin.orders-C2bc5NoL.js");
const Route$2 = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [{
      title: "Orders — Admin"
    }, {
      name: "robots",
      content: "noindex"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./admin.migrate-zeK_MzNE.js");
const Route$1 = createFileRoute("/admin/migrate")({
  head: () => ({
    meta: [{
      title: "Data Migration — Admin"
    }, {
      name: "robots",
      content: "noindex"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./admin.login-RGcElK53.js");
const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{
      title: "Admin Login — Nail Beauty"
    }, {
      name: "robots",
      content: "noindex"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const OrderSuccessRoute = Route$9.update({
  id: "/order-success",
  path: "/order-success",
  getParentRoute: () => Route$a
});
const CheckoutRoute = Route$8.update({
  id: "/checkout",
  path: "/checkout",
  getParentRoute: () => Route$a
});
const IndexRoute = Route$7.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$a
});
const AdminIndexRoute = Route$6.update({
  id: "/admin/",
  path: "/admin/",
  getParentRoute: () => Route$a
});
const ProductsIdRoute = Route$5.update({
  id: "/products/$id",
  path: "/products/$id",
  getParentRoute: () => Route$a
});
const AdminShippingRoute = Route$4.update({
  id: "/admin/shipping",
  path: "/admin/shipping",
  getParentRoute: () => Route$a
});
const AdminProductsRoute = Route$3.update({
  id: "/admin/products",
  path: "/admin/products",
  getParentRoute: () => Route$a
});
const AdminOrdersRoute = Route$2.update({
  id: "/admin/orders",
  path: "/admin/orders",
  getParentRoute: () => Route$a
});
const AdminMigrateRoute = Route$1.update({
  id: "/admin/migrate",
  path: "/admin/migrate",
  getParentRoute: () => Route$a
});
const AdminLoginRoute = Route.update({
  id: "/admin/login",
  path: "/admin/login",
  getParentRoute: () => Route$a
});
const rootRouteChildren = {
  IndexRoute,
  CheckoutRoute,
  OrderSuccessRoute,
  AdminLoginRoute,
  AdminMigrateRoute,
  AdminOrdersRoute,
  AdminProductsRoute,
  AdminShippingRoute,
  ProductsIdRoute,
  AdminIndexRoute
};
const routeTree = Route$a._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route$5 as R,
  Toaster as T,
  router as r
};
