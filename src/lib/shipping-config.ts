// Centralized shipping configuration.
// In the future, replace these constants with values fetched from the
// admin dashboard / database. The shape stays the same so the checkout
// page does not need to change.

export type DeliveryMethod = "home" | "office";

export type WilayaShippingRates = {
  home: number;
  office: number;
};

export type WilayaConfig = {
  code: string; // e.g. "16"
  name: string; // e.g. "Alger"
  enabled: boolean;
  rates: WilayaShippingRates;
};

// Placeholder pricing — to be managed from the admin dashboard later.
const DEFAULT_RATES: WilayaShippingRates = { home: 700, office: 500 };

const RAW_WILAYAS: Array<[string, string, Partial<WilayaShippingRates>?]> = [
  ["01", "Adrar", { home: 1200, office: 900 }],
  ["02", "Chlef", { home: 700, office: 500 }],
  ["03", "Laghouat", { home: 900, office: 700 }],
  ["04", "Oum El Bouaghi", { home: 800, office: 600 }],
  ["05", "Batna", { home: 800, office: 600 }],
  ["06", "Béjaïa", { home: 700, office: 500 }],
  ["07", "Biskra", { home: 900, office: 700 }],
  ["08", "Béchar", { home: 1200, office: 900 }],
  ["09", "Blida", { home: 600, office: 400 }],
  ["10", "Bouira", { home: 700, office: 500 }],
  ["11", "Tamanrasset", { home: 1400, office: 1100 }],
  ["12", "Tébessa", { home: 900, office: 700 }],
  ["13", "Tlemcen", { home: 800, office: 600 }],
  ["14", "Tiaret", { home: 800, office: 600 }],
  ["15", "Tizi Ouzou", { home: 700, office: 500 }],
  ["16", "Alger", { home: 600, office: 400 }],
  ["17", "Djelfa", { home: 900, office: 700 }],
  ["18", "Jijel", { home: 800, office: 600 }],
  ["19", "Sétif", { home: 700, office: 500 }],
  ["20", "Saïda", { home: 900, office: 700 }],
  ["21", "Skikda", { home: 800, office: 600 }],
  ["22", "Sidi Bel Abbès", { home: 800, office: 600 }],
  ["23", "Annaba", { home: 800, office: 600 }],
  ["24", "Guelma", { home: 800, office: 600 }],
  ["25", "Constantine", { home: 800, office: 600 }],
  ["26", "Médéa", { home: 700, office: 500 }],
  ["27", "Mostaganem", { home: 800, office: 600 }],
  ["28", "M'Sila", { home: 800, office: 600 }],
  ["29", "Mascara", { home: 800, office: 600 }],
  ["30", "Ouargla", { home: 1100, office: 800 }],
  ["31", "Oran", { home: 800, office: 600 }],
  ["32", "El Bayadh", { home: 1000, office: 800 }],
  ["33", "Illizi", { home: 1400, office: 1100 }],
  ["34", "Bordj Bou Arreridj", { home: 700, office: 500 }],
  ["35", "Boumerdès", { home: 600, office: 400 }],
  ["36", "El Tarf", { home: 800, office: 600 }],
  ["37", "Tindouf", { home: 1400, office: 1100 }],
  ["38", "Tissemsilt", { home: 800, office: 600 }],
  ["39", "El Oued", { home: 1000, office: 800 }],
  ["40", "Khenchela", { home: 900, office: 700 }],
  ["41", "Souk Ahras", { home: 800, office: 600 }],
  ["42", "Tipaza", { home: 600, office: 400 }],
  ["43", "Mila", { home: 800, office: 600 }],
  ["44", "Aïn Defla", { home: 700, office: 500 }],
  ["45", "Naâma", { home: 1000, office: 800 }],
  ["46", "Aïn Témouchent", { home: 800, office: 600 }],
  ["47", "Ghardaïa", { home: 1000, office: 800 }],
  ["48", "Relizane", { home: 800, office: 600 }],
  ["49", "Timimoun", { home: 1300, office: 1000 }],
  ["50", "Bordj Badji Mokhtar", { home: 1400, office: 1100 }],
  ["51", "Ouled Djellal", { home: 900, office: 700 }],
  ["52", "Béni Abbès", { home: 1300, office: 1000 }],
  ["53", "In Salah", { home: 1400, office: 1100 }],
  ["54", "In Guezzam", { home: 1500, office: 1200 }],
  ["55", "Touggourt", { home: 1000, office: 800 }],
  ["56", "Djanet", { home: 1500, office: 1200 }],
  ["57", "El M'Ghair", { home: 1000, office: 800 }],
  ["58", "El Meniaa", { home: 1200, office: 900 }],
];

export const WILAYAS: WilayaConfig[] = RAW_WILAYAS.map(([code, name, rates]) => ({
  code,
  name,
  enabled: true,
  rates: { ...DEFAULT_RATES, ...(rates ?? {}) },
}));

export function getWilaya(code: string): WilayaConfig | undefined {
  return WILAYAS.find((w) => w.code === code);
}

export function getShippingFee(
  wilayaCode: string | null,
  method: DeliveryMethod,
): number | null {
  if (!wilayaCode) return null;
  const w = getWilaya(wilayaCode);
  if (!w || !w.enabled) return null;
  return w.rates[method];
}

export const DELIVERY_METHODS: Array<{
  value: DeliveryMethod;
  label: string;
  description: string;
}> = [
  {
    value: "home",
    label: "Home Delivery",
    description: "Delivered to your door by courier.",
  },
  {
    value: "office",
    label: "DHD Office Pickup",
    description: "Pick up your order from the nearest DHD office.",
  },
];
