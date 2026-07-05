import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { s as supabase } from "./client-BIO5L_-k.js";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
async function getAdminSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data: hasRole } = await supabase.rpc("has_role", {
    user_id: session.user.id,
    role: "admin"
  });
  if (!hasRole) return null;
  return {
    email: session.user.email || "",
    userId: session.user.id
  };
}
async function adminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data.user) {
    return { ok: false, error: "Login failed" };
  }
  const { data: hasRole } = await supabase.rpc("has_role", {
    user_id: data.user.id,
    role: "admin"
  });
  if (!hasRole) {
    await supabase.auth.signOut();
    return { ok: false, error: "Not authorized as admin" };
  }
  return { ok: true };
}
async function adminLogout() {
  await supabase.auth.signOut();
}
function useAdminSession() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      const s = await getAdminSession();
      if (mounted) {
        setSession(s);
        setReady(true);
      }
    }
    loadSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session2) => {
      if (!session2?.user) {
        if (mounted) {
          setSession(null);
        }
        return;
      }
      const { data: hasRole } = await supabase.rpc("has_role", {
        user_id: session2.user.id,
        role: "admin"
      });
      if (mounted) {
        setSession(hasRole ? {
          email: session2.user.email || "",
          userId: session2.user.id
        } : null);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  return { session, ready, isAuthenticated: session !== null };
}
export {
  Button as B,
  adminLogout as a,
  buttonVariants as b,
  cn as c,
  adminLogin as d,
  useAdminSession as u
};
