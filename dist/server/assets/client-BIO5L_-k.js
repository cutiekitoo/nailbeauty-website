import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://wvznpyazfxcayuakrzng.supabase.co";
const supabaseAnonKey = "sb_publishable_P-BQ0jZ6k6neWtBzkV1R6A_wxpKqbd9";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
export {
  supabase as s
};
