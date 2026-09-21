import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ypjrwemnpasdqgiecurk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwanJ3ZW1ucGFzZHFnaWVjdXJrIiwicm9sZSI6ImFub255IiwiaWF0IjoxNzg5NTkxMTAwLCJleHAiOjIxMDUxNjcxMDB9.SEmeLNueX5Pgtygxk3mpSDIpW6NPVgoNBA8sH9fMaLA';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const testUsers = [
  { email: 'e2e.owner@test.local', password: 'TestPass123!@#', role: 'owner', full_name: 'E2E Owner' },
  { email: 'e2e.technician@test.local', password: 'TestPass123!@#', role: 'technician', full_name: 'E2E Technician' },
  { email: 'e2e.accountant@test.local', password: 'TestPass123!@#', role: 'accountant', full_name: 'E2E Accountant' },
];

async function signUpUser(user) {
  console.log(`Signing up ${user.email}...`);
  const { data, error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
    options: {
      data: { full_name: user.full_name }
    }
  });
  
  if (error) {
    console.error(`Failed to sign up ${user.email}:`, error.message);
    return;
  }
  
  console.log(`Signed up ${user.email}:`, data.user?.id);
  
  // Wait for trigger to create profile
  await new Promise(r => setTimeout(r, 1000));
  
  // Verify profile was created
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  if (profileError) {
    console.error(`Profile error for ${user.email}:`, profileError.message);
  } else {
    console.log(`Profile for ${user.email}:`, profile);
  }
}

async function main() {
  for (const user of testUsers) {
    await signUpUser(user);
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('Done');
}

main();