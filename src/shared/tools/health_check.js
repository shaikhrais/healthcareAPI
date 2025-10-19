const http = require('http');

function check(path) {
  return new Promise((resolve) => {
    const opts = { hostname: 'localhost', port: 3001, path, method: 'GET', timeout: 5000 };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ path, statusCode: res.statusCode, body: data }));
    });
    req.on('error', (err) => resolve({ path, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ path, error: 'timeout' });
    });
    req.end();
  });
}

(async () => {
  const checks = ['/health', '/api/generated-code/TASK-1.1'];
  for (const p of checks) {
    const r = await check(p);
    console.log(JSON.stringify(r));
  }
})();
