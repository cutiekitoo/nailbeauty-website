import { supabase } from "../integrations/supabase/client";
import type { DeliveryMethod } from "./shipping-config";

export type WilayaConfig = {
  code: string;
  name: string;
  rates: {
    home: number;
    office: number;
  };
  enabled: boolean;
};

function fromDbRow(row: any): WilayaConfig {
  return {
    code: row.code,
    name: row.name,
    rates: {
      home: row.home_rate,
      office: row.office_rate,
    },
    enabled: row.enabled,
  };
}

function toDbRow(config: WilayaConfig): any {
  return {
    code: config.code,
    name: config.name,
    home_rate: config.rates.home,
    office_rate: config.rates.office,
    enabled: config.enabled,
  };
}

export const shippingService = {
  async list(): Promise<WilayaConfig[]> {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .order('code');
    
    if (error) throw error;
    return (data || []).map(fromDbRow);
  },
  
  async get(code: string): Promise<WilayaConfig | undefined> {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) return undefined;
    return fromDbRow(data);
  },
  
  async update(code: string, patch: Partial<WilayaConfig>): Promise<WilayaConfig | null> {
    const updateData: any = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.rates?.home !== undefined) updateData.home_rate = patch.rates.home;
    if (patch.rates?.office !== undefined) updateData.office_rate = patch.rates.office;
    if (patch.enabled !== undefined) updateData.enabled = patch.enabled;
    
    const { data, error } = await supabase
      .from('shipping_rates')
      .update(updateData)
      .eq('code', code)
      .select()
      .single();
    
    if (error) return null;
    return fromDbRow(data);
  },
  
  async enableAll(): Promise<void> {
    const { error } = await supabase
      .from('shipping_rates')
      .update({ enabled: true })
      .neq('code', ''); // Update all rows
    
    if (error) throw error;
  },
  
  async disableAll(): Promise<void> {
    const { error } = await supabase
      .from('shipping_rates')
      .update({ enabled: false })
      .neq('code', ''); // Update all rows
    
    if (error) throw error;
  },
  
  subscribe(cb: () => void): () => void {
    const channel = supabase
      .channel('shipping-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipping_rates'
        },
        () => cb()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  },
  
  async getShippingFee(wilayaCode: string | null, method: DeliveryMethod): Promise<number | null> {
    if (!wilayaCode) return null;
    const w = await this.get(wilayaCode);
    if (!w || !w.enabled) return null;
    return w.rates[method];
  },
  
  async resetToDefaults(): Promise<void> {
    // This would need to be implemented based on your default wilayas
    // For now, just enable all
    await this.enableAll();
  },
};
