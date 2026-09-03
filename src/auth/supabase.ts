import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

type PlannerDatabase = {
  public: {
    Tables: {
      planner_account: {
        Row: {
          user_id: string;
          payload: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          payload: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          payload?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const supabase: SupabaseClient<PlannerDatabase> | null =
  supabaseConfigured ? createClient<PlannerDatabase>(url!, anon!) : null;
