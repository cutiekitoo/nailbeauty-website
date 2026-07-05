import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://wvznpyazfxcayuakrzng.supabase.co";
const supabaseAnonKey = "sb_publishable_Lz_O6Poz2Sn1ieVAwBWiOg_ETph8i9X";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
export {
  supabase as s
};
