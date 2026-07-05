import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

export type AdminSession = {
  email: string;
  userId: string;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: hasRole, error } = await supabase.rpc("has_role", {
    _user_id: session.user.id,
    _role: "admin",
  });

  if (error) {
    console.error("has_role error:", error);
    return null;
  }

  if (!hasRole) return null;

  return {
    email: session.user.email || "",
    userId: session.user.id,
  };
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getAdminSession();
  return session !== null;
}

export async function adminLogin(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: "Login failed" };
  }

  const { data: hasRole, error: roleError } = await supabase.rpc(
    "has_role",
    {
      _user_id: data.user.id,
      _role: "admin",
    }
  );

  if (roleError) {
    console.error("has_role error:", roleError);
    await supabase.auth.signOut();
    return { ok: false, error: roleError.message };
  }

  if (!hasRole) {
    await supabase.auth.signOut();
    return { ok: false, error: "Not authorized as admin" };
  }

  return { ok: true };
}

export async function adminLogout() {
  await supabase.auth.signOut();
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        if (mounted) {
          setSession(null);
        }
        return;
      }

      const { data: hasRole } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (mounted) {
        setSession(
          hasRole
            ? {
                email: session.user.email || "",
                userId: session.user.id,
              }
            : null
        );
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    ready,
    isAuthenticated: session !== null,
  };
}