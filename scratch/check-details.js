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

async function check() {
  console.log("Checking columns of staff_profiles...");
  
  // Let's insert a test profile or check columns by selecting
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error reading staff_profiles:", error);
  } else {
    console.log("staff_profiles data structure:", data);
  }

  console.log("Checking if sectors table exists...");
  const { data: sectors, error: sectorsErr } = await supabase
    .from('sectors')
    .select('*')
    .limit(1);

  if (sectorsErr) {
    console.log("sectors table does not exist or error:", sectorsErr.message);
  } else {
    console.log("sectors table exists! Data:", sectors);
  }
}

check();
