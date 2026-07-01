const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://mdyznqfzdqlbucoqksdv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keXpucWZ6ZHFsYnVjb3Frc2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjczODI5NSwiZXhwIjoyMDk4MzE0Mjk1fQ.J2SluYl7__hqtFPL-W21U2jGUPhwupLNUF8gBXGggN8';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  try {
    const { data, error } = await supabase
      .from('pg_namespace')
      .select('nspname')
      .limit(5);
    console.log('pg_namespace result:', { data, error });
  } catch (e) {
    console.error('Error:', e);
  }
}
test();