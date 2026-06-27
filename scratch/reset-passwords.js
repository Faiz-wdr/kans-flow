const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
      console.log("No .env.local file found at:", envPath);
      return;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    });
  } catch (err) {
    console.error("Failed to load .env.local:", err);
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(cleanUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function reset() {
  console.log("Setting password of admin@kansflow.com (ID: 00000000-0000-0000-0000-000000000001) to 'password123'...");
  const { data: d1, error: e1 } = await supabase.auth.admin.updateUserById('00000000-0000-0000-0000-000000000001', {
    password: 'password123'
  });
  
  if (e1) {
    console.error("Failed to reset admin:", e1.message);
  } else {
    console.log("Admin password updated successfully!");
  }

  console.log("Setting password of staff@kansflow.com (ID: 00000000-0000-0000-0000-000000000002) to 'password123'...");
  const { data: d2, error: e2 } = await supabase.auth.admin.updateUserById('00000000-0000-0000-0000-000000000002', {
    password: 'password123'
  });
  
  if (e2) {
    console.error("Failed to reset staff:", e2.message);
  } else {
    console.log("Staff password updated successfully!");
  }
}

reset();
