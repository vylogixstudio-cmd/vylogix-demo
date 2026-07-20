const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_policies'); // this might not exist
  // Let's just query pg_policies
  const { data: policies, error: polErr } = await supabase
    .from('pg_policies') // not accessible via API usually, but let's try raw query? No raw query in supabase-js.
    .select('*')
    .eq('tablename', 'profiles');
    
  console.log("POLICIES:", policies, polErr);
}
check();
