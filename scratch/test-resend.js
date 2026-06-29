const { Resend } = require('resend');
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

const apiKey = process.env.RESEND_API_KEY;
const resend = new Resend(apiKey);

async function testSend() {
  try {
    const res = await resend.emails.send({
      from: 'KANs Flow <onboarding@resend.dev>',
      to: ['xiongdidesigns@gmail.com'],
      subject: 'Resend API Diagnostic Test - KANs Flow',
      html: '<h1>Resend Email Test</h1><p>Testing live email dispatch via KANs Flow system.</p>',
    });
    console.log("Resend API Full Response:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Resend API Throw Error:", err);
  }
}

testSend();
