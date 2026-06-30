import { createClient } from '@supabase/supabase-js';

// Initialize with fallback values - will use env vars if available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mdyznqfzdqlbucoqksdv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keXpucWZ6ZHFsYnVjb3Frc2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzgyOTUsImV4cCI6MjA5ODMxNDI5NX0.5tyLBGa_tW2aTSyCzgZtI90_WG_20-fpXuGiAXhwGEo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});