const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const { statusCode, headers } = res;
      console.log(`URL: ${url} -> Status: ${statusCode}`);
      console.log(`Headers:`, headers);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Body length: ${data.length}`);
        console.log(`Preview:\n`, data.substring(0, 1000));
        resolve({ statusCode, headers, data });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function test() {
  try {
    console.log("Testing root /...");
    await get('http://localhost:3000/');
    
    console.log("\nTesting /login...");
    await get('http://localhost:3000/login');

    console.log("\nTesting /dashboard...");
    await get('http://localhost:3000/dashboard');
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

test();
