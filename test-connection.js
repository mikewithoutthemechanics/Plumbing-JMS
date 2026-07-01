const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mdyznqfzdqlbucoqksdv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1keXpucWZ6ZHFsYnVjb3Frc2R2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjczODI5NSwiZXhwIjoyMDk4MzE0Mjk1fQ.J2SluYl7__hqtFPL-W21U2jGUPhwupLNUF8gBXGggN8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('Testing connection...');

    // Try a simple query
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (error) {
      console.error('Error querying information_schema.tables:', error);

      // Try an even simpler query
      const { data: data2, error: error2 } = await supabase
        .from('pg_tables')
        .select('tablename')
        .limit(1);

      if (error2) {
        console.error('Error querying pg_tables:', error2);

        // Try to query a table we know might exist from a fresh install
        const { data: data3, error: error3 } = await supabase
          .from('pg_tables')
          .select('*')
          .limit(1);

        console.log('pg_tables query result:', { data: data3, error: error3 });
      } else {
        console.log('pg_tables success:', data2);
      }
    } else {
      console.log('information_schema.tables success:', data);
    }

    // Try to see if we can access the auth schema
    const { data: authData, error: authError } = await supabase
      .from('auth.users')
      .select('id')
      .limit(1);

    console.log('auth.users query:', { data: authData, error: error });

  } catch (err) {
    console.error('Exception:', err);
  }
}

testConnection();