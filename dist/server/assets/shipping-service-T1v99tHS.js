import { s as supabase } from "./client-oLxEsiRw.js";
function fromDbRow(row) {
  return {
    code: row.code,
    name: row.name,
    rates: {
      home: row.home_rate,
      office: row.office_rate
    },
    enabled: row.enabled
  };
}
const shippingService = {
  async list() {
    const { data, error } = await supabase.from("shipping_rates").select("*").order("code");
    if (error) throw error;
    return (data || []).map(fromDbRow);
  },
  async get(code) {
    const { data, error } = await supabase.from("shipping_rates").select("*").eq("code", code).single();
    if (error) return void 0;
    return fromDbRow(data);
  },
  async update(code, patch) {
    const updateData = {};
    if (patch.name !== void 0) updateData.name = patch.name;
    if (patch.rates?.home !== void 0) updateData.home_rate = patch.rates.home;
    if (patch.rates?.office !== void 0) updateData.office_rate = patch.rates.office;
    if (patch.enabled !== void 0) updateData.enabled = patch.enabled;
    const { data, error } = await supabase.from("shipping_rates").update(updateData).eq("code", code).select().single();
    if (error) return null;
    return fromDbRow(data);
  },
  async enableAll() {
    const { error } = await supabase.from("shipping_rates").update({ enabled: true }).neq("code", "");
    if (error) throw error;
  },
  async disableAll() {
    const { error } = await supabase.from("shipping_rates").update({ enabled: false }).neq("code", "");
    if (error) throw error;
  },
  subscribe(cb) {
    const channel = supabase.channel("shipping-changes").on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "shipping_rates"
      },
      () => cb()
    ).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
  async getShippingFee(wilayaCode, method) {
    if (!wilayaCode) return null;
    const w = await this.get(wilayaCode);
    if (!w || !w.enabled) return null;
    return w.rates[method];
  },
  async resetToDefaults() {
    await this.enableAll();
  }
};
export {
  shippingService as s
};
