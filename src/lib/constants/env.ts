export const environment = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  resendApiKey: process.env.RESEND_API_KEY || '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  vatRate: 0.15,
};

export function isConfigured(): boolean {
  return !!(
    environment.supabaseUrl &&
    environment.supabaseAnonKey &&
    environment.supabaseServiceRole
  );
}
