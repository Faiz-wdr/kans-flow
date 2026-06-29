const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) return;
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Supabase URL or Service Role Key missing");
  process.exit(1);
}

const supabase = createClient(url, key);

async function setupStorageAndTables() {
  console.log("Ensuring 'agreements' storage bucket exists...");
  const { data: buckets, error: getErr } = await supabase.storage.listBuckets();
  if (getErr) {
    console.error("Error listing buckets:", getErr.message);
  } else {
    const exists = buckets.some(b => b.id === 'agreements');
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket('agreements', { public: true });
      if (createErr) {
        console.error("Error creating 'agreements' bucket:", createErr.message);
      } else {
        console.log("Successfully created 'agreements' storage bucket!");
      }
    } else {
      console.log("'agreements' storage bucket already exists.");
    }
  }

  // Also check if we can execute raw SQL via REST / PG if needed
  console.log("Setup complete for storage buckets.");
}

setupStorageAndTables();
