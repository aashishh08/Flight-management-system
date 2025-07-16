import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
console.log({ supabaseUrl });
console.log({ supabaseAnonKey });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Connectivity check (Node.js only)
if (typeof window === "undefined") {
  (async () => {
    try {
      // Try a simple query to check connectivity
      const { error } = await supabase.from("flights").select("id").limit(1);
      if (error) {
        console.error("Supabase connection failed:", error);
      } else {
        console.log("Supabase connection successful.");
      }
    } catch (err) {
      console.error("Supabase connectivity check error:", err);
    }
  })();
}

// Server-side client for API routes
export const createServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};
