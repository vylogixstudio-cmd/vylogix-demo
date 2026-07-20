const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'zakimuharror0@gmail.com',
    password: '0@71@q9CP!1g' // from temp_password
  });
  
  if (authErr) {
    console.error("AUTH ERROR:", authErr);
    return;
  }
  
  const user = authData.user;
  
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single();
    
  console.log("PROFILE (ANON):", profile, profErr);
  
  if (profile?.organization_id) {
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('is_active, auto_suspend, license_expires_at')
      .eq('id', profile.organization_id)
      .single();
      
    console.log("ORG (ANON):", org, orgErr);
  }
}
check();
