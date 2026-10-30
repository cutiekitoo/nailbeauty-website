import { supabase } from "@/integrations/supabase/client";

export type AmbassadorDashboard = {
  profile: {
    id: string;
    full_name: string;
    email: string;
    referral_code: string;
    is_active: boolean;
    payment_method: "ccp" | "baridimob" | null;
    payment_account_name: string | null;
    payment_identifier: string | null;
  };
  current_month: {
    period_month: string;
    delivered_count: number;
    pending_orders: number;
    commission_under_review: number;
    commission_payable: number;
    commission_paid: number;
    reward_threshold: number;
    reward_progress: number;
  };
  all_time: { delivered_count: number; commission_paid: number };
  orders: Array<{
    order_number: string;
    created_at: string;
    status: string;
    delivered_at: string | null;
    commission_amount: number;
    commission_status: string;
    commission_eligible_at: string | null;
  }>;
  monthly_history: Array<{
    period_month: string;
    delivered_count: number;
    commission_earned: number;
    commission_paid: number;
  }>;
  payouts: Array<{
    period_month: string;
    gross_amount: number;
    adjustment_amount: number;
    amount: number;
    payment_method: string | null;
    payment_reference: string | null;
    paid_at: string;
  }>;
  rewards: Array<{
    period_month: string;
    delivered_count: number;
    threshold: number;
    gift_name: string | null;
    status: string;
    given_at: string | null;
  }>;
};

export const ambassadorService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      return { ok: false as const, error: error?.message ?? "Connexion impossible." };
    }

    try {
      const dashboard = await this.getMyDashboard();
      if (!dashboard.profile.is_active) {
        await supabase.auth.signOut();
        return { ok: false as const, error: "Votre compte ambassadrice est suspendu. Contactez l'administration." };
      }
      return { ok: true as const, dashboard };
    } catch (err) {
      await supabase.auth.signOut();
      return { ok: false as const, error: err instanceof Error ? err.message : "Ce compte n'est pas autorisé à accéder à l'espace ambassadrice." };
    }
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async getMyDashboard(): Promise<AmbassadorDashboard> {
    const { data, error } = await supabase.rpc("get_my_ambassador_dashboard");
    if (error) throw error;
    return data as AmbassadorDashboard;
  },

  async updatePaymentDetails(input: {
    paymentMethod: "ccp" | "baridimob";
    accountName: string;
    identifier: string;
  }) {
    const { error } = await supabase.rpc("update_ambassador_payment_details", {
      p_payment_method: input.paymentMethod,
      p_payment_account_name: input.accountName,
      p_payment_identifier: input.identifier,
    });
    if (error) throw error;
  },

  async listAdmin() {
    const { data, error } = await supabase.rpc("get_ambassadors_admin_overview");
    if (error) throw error;
    return (data ?? []) as Array<Record<string, any>>;
  },

  async getAdminDetails(id: string) {
    const { data, error } = await supabase.rpc("get_ambassador_admin_details", {
      p_ambassador_id: id,
    });
    if (error) throw error;
    return data as Record<string, any>;
  },

  async setStatus(id: string, active: boolean) {
    const { error } = await supabase.rpc("set_ambassador_status", {
      p_ambassador_id: id,
      p_is_active: active,
    });
    if (error) throw error;
  },

  async setCode(id: string, code: string) {
    const { error } = await supabase.rpc("set_ambassador_code", {
      p_ambassador_id: id,
      p_referral_code: code,
    });
    if (error) throw error;
  },

  async recordPayout(id: string, periodMonth: string, reference: string, note: string) {
    const { data, error } = await supabase.rpc("record_ambassador_monthly_payout", {
      p_ambassador_id: id,
      p_period_month: periodMonth,
      p_payment_reference: reference || null,
      p_note: note || null,
    });
    if (error) throw error;
    return data;
  },

  async updateReward(id: string, giftName: string, status: string) {
    const { error } = await supabase.rpc("update_ambassador_reward", {
      p_reward_id: id,
      p_gift_name: giftName,
      p_status: status,
    });
    if (error) throw error;
  },

  async createAccount(input: { fullName: string; email: string; referralCode: string }) {
    const { data, error } = await supabase.functions.invoke("create-ambassador", {
      body: input,
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },
};
