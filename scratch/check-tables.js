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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const cleanUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(cleanUrl, supabaseKey);

async function check() {
  console.log("Checking database access...");
  
  // Check notifications table
  const { data: notifications, error: notifErr } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (notifErr) {
    console.error("Error reading notifications table:", notifErr.message);
  } else {
    console.log("notifications table exists. Data:", notifications);
  }

  // Check staff_profiles
  const { data: staff, error: staffErr } = await supabase
    .from('staff_profiles')
    .select('*')
    .limit(1);

  if (staffErr) {
    console.error("Error reading staff_profiles table:", staffErr.message);
  } else {
    console.log("staff_profiles table exists. Data:", staff);
  }

  // Check organizations
  const { data: orgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);

  if (orgsErr) {
    console.error("Error reading organizations table:", orgsErr.message);
  } else {
    console.log("organizations table exists. Data:", orgs);
  }
}

check();
