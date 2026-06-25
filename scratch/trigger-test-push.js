const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local to load environment variables
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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const cleanSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabase = createClient(cleanSupabaseUrl, supabaseKey);

async function testTrigger() {
  console.log("Checking fcm_tokens table...");
  const { data: tokens, error: tokenErr } = await supabase
    .from('fcm_tokens')
    .select('*, staff_profiles(full_name, role)');

  if (tokenErr) {
    if (tokenErr.code === 'PGRST205' || tokenErr.status === 404) {
      console.error("Error: The 'fcm_tokens' table does not exist in the database yet. Please ensure the migration SQL script has been run in your database.");
    } else {
      console.error("Error reading fcm_tokens:", tokenErr.message);
    }
    process.exit(1);
  }

  console.log(`Found ${tokens.length} registered device tokens in the database.`);
  if (tokens.length === 0) {
    console.log("\nNo device tokens registered.");
    console.log("To register a token:");
    console.log("1. Run the local development server (npm run dev).");
    console.log("2. Open the dashboard in your browser (http://localhost:3000/login).");
    console.log("3. Log in as Admin (admin@kansflow.com / password123) or Staff.");
    console.log("4. Accept browser notification permissions when prompted.");
    console.log("5. The dropdown component will automatically generate and save your browser's FCM token to the database.");
    console.log("6. Run this test script again.");
    return;
  }

  console.log("\nFound active tokens for users:");
  tokens.forEach((t, i) => {
    const name = t.staff_profiles ? t.staff_profiles.full_name : 'Unknown User';
    const role = t.staff_profiles ? t.staff_profiles.role : 'N/A';
    console.log(`  ${i+1}. User: ${name} (${role}) | Token: ${t.token.substring(0, 15)}...`);
  });

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs && orgs.length > 0 ? orgs[0].id : null;
  if (!orgId) {
    console.error("Error: No organization found in the database.");
    process.exit(1);
  }

  const targetToken = tokens[0];
  const targetUser = targetToken.staff_profiles ? targetToken.staff_profiles.full_name : 'Staff';

  console.log(`\nInserting a test notification targeting ${targetUser} (${targetToken.user_id})...`);
  
  const { data: newNotif, error: insertErr } = await supabase
    .from('notifications')
    .insert([
      {
        organization_id: orgId,
        type: 'announcement',
        title: '🔔 Push Notification Test',
        message: 'This is a live test of the KANs Flow centralized notification service.',
        is_read: false,
        target_user_id: targetToken.user_id,
        reference_module: 'general',
        action_url: '/dashboard/announcements',
        priority: 'high',
        rich_type: 'general'
      }
    ])
    .select()
    .single();

  if (insertErr) {
    console.error("Error inserting notification:", insertErr.message);
    process.exit(1);
  }

  console.log(`\nSuccess! Notification record created with ID: ${newNotif.id}`);
  console.log("If your Supabase Database Webhook is configured, it will trigger the /api/notifications/trigger API endpoint.");
  console.log("Alternatively, if you are running locally, this insert will be delivered to the client UI dropdown in realtime.");
}

testTrigger();
