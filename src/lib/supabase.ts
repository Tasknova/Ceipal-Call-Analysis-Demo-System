import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://lfpsgpumofgdhpihzqgp.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_MulddMIIdZBYSrxALyMjog_n91SiGuo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Recording {
  id: string;
  user_id: string;
  file_name?: string;
  file_size?: number;
  stored_file_url?: string;
  duration_seconds?: number;
  transcript?: string;
  call_date?: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  recording_id?: string;
  user_id: string;
  status?: string;
  created_at: string;

  call_overview?: Record<string, any>;
  sla_and_efficiency?: Record<string, any>;
  resolution_quality?: Record<string, any>;
  script_adherence?: Record<string, any>;
  compliance_and_process_risk?: Record<string, any>;
  customer_experience?: Record<string, any>;
  escalation_analysis?: Record<string, any>;
  issue_classification?: Record<string, any>;
  salesforce_tagging_integrity?: Record<string, any>;
  agent_capability?: Record<string, any>;
  repeat_contact_risk?: Record<string, any>;
  business_and_cost_leakage?: Record<string, any>;
  management_value?: Record<string, any>;
  evidence?: Record<string, any>;
  final_scoring?: Record<string, any>;
  token_usage?: Record<string, any>;
}
