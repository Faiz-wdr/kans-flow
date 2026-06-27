const { Client } = require('pg');
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

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.error("SUPABASE_DB_PASSWORD is not defined in .env.local");
  process.exit(1);
}

const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.plqikziueqfbdawfnlyn.supabase.co:5432/postgres`;

async function enableRealtime() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL remote database successfully!");

    const tables = ['notifications', 'support_requests', 'seats', 'onboarding_requests', 'announcements'];
    for (const table of tables) {
      try {
        console.log(`Adding ${table} to supabase_realtime publication...`);
        await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${table};`);
        console.log(`Successfully added ${table} to supabase_realtime!`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('already in publication')) {
          console.log(`Table ${table} is already in publication supabase_realtime.`);
        } else {
          console.error(`Error adding ${table}:`, err.message);
        }
      }
    }

  } catch (err) {
    console.error("Error connecting to database:", err);
  } finally {
    await client.end();
  }
}

enableRealtime();
