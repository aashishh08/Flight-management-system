import { createClient } from "@supabase/supabase-js";

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

// // Server-side client for API routes
// export const createServerClient = () => {
//   // Debug log to check if the env variable is loaded (mask most of the key for safety)
//   const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1dGt4eHBla3ZveWdjdnFldGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjI1MDQxOSwiZXhwIjoyMDY3ODI2NDE5fQ.PiVgoOiSKlf5iymTWpkCHfw8dlwTr6u5P0ldwV9EMFE'
//   return createClient(
//     'https://gutkxxpekvoygcvqetli.supabase.co',
//     serviceRoleKey!
//   );
// };
