import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useState, useEffect } from "react";
import { Sparkles, Mail, Lock, EyeOff, Eye, Loader2 } from "lucide-react";
import { c as cn, u as useAdminSession, B as Button, d as adminLogin } from "./admin-auth-DUqyDMAG.js";
import { I as Input } from "./input-CXIXWaUi.js";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "./client-BIO5L_-k.js";
import "@supabase/supabase-js";
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(LabelPrimitive.Root, { ref, className: cn(labelVariants(), className), ...props }));
Label.displayName = LabelPrimitive.Root.displayName;
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
const Alert = React.forwardRef(({ className, variant, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, role: "alert", className: cn(alertVariants({ variant }), className), ...props }));
Alert.displayName = "Alert";
const AlertTitle = React.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx(
    "h5",
    {
      ref,
      className: cn("mb-1 font-medium leading-none tracking-tight", className),
      ...props
    }
  )
);
AlertTitle.displayName = "AlertTitle";
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { ref, className: cn("text-sm [&_p]:leading-relaxed", className), ...props }));
AlertDescription.displayName = "AlertDescription";
function AdminLoginPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    ready
  } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (ready && isAuthenticated) navigate({
      to: "/admin"
    });
  }, [ready, isAuthenticated, navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Please enter your email.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const result = adminLogin(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login failed.");
      return;
    }
    navigate({
      to: "/admin"
    });
  };
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen flex items-center justify-center px-4 py-12", children: /* @__PURE__ */ jsx("div", { className: "w-full max-w-md", children: /* @__PURE__ */ jsxs("div", { className: "bg-card rounded-3xl shadow-[var(--shadow-glow)] border border-border/60 p-8 sm:p-10", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center text-center mb-8", children: [
      /* @__PURE__ */ jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-2xl font-display font-semibold text-foreground", children: [
        "Nail Beauty ",
        /* @__PURE__ */ jsx(Sparkles, { className: "w-5 h-5 text-primary" })
      ] }),
      /* @__PURE__ */ jsx("h1", { className: "mt-6 text-2xl font-display font-semibold text-foreground", children: "Admin Login" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Access the store management dashboard" })
    ] }),
    error && /* @__PURE__ */ jsx(Alert, { variant: "destructive", className: "mb-5", children: /* @__PURE__ */ jsx(AlertDescription, { children: error }) }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", noValidate: true, children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(Mail, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsx(Input, { id: "email", type: "email", autoComplete: "email", placeholder: "admin@nailbeauty.com", value: email, onChange: (e) => setEmail(e.target.value), className: "pl-9 h-11 rounded-xl", disabled: loading })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Password" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(Lock, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" }),
          /* @__PURE__ */ jsx(Input, { id: "password", type: showPassword ? "text" : "password", autoComplete: "current-password", placeholder: "••••••••", value: password, onChange: (e) => setPassword(e.target.value), className: "pl-9 pr-10 h-11 rounded-xl", disabled: loading }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setShowPassword((s) => !s), className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors", "aria-label": showPassword ? "Hide password" : "Show password", tabIndex: -1, children: showPassword ? /* @__PURE__ */ jsx(EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ jsx(Eye, { className: "w-4 h-4" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { type: "submit", disabled: loading, className: "w-full h-11 rounded-xl text-base", children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Loader2, { className: "w-4 h-4 animate-spin" }),
        " Signing in…"
      ] }) : "Sign in" })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-6 text-center text-xs text-muted-foreground", children: "Authorized personnel only." })
  ] }) }) });
}
export {
  AdminLoginPage as component
};
