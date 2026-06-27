const http = require('http');

function get(url) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve(Date.now() - start);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function test() {
  try {
    console.log("Request 1 to /login...");
    const t1 = await get('http://localhost:3000/login');
    console.log(`Request 1 took: ${t1}ms`);

    console.log("Request 2 to /login...");
    const t2 = await get('http://localhost:3000/login');
    console.log(`Request 2 took: ${t2}ms`);
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

test();
