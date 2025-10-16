const fetch = require('node:http');
// We'll use built-in http.request for a quick smoke test
const http = require('http');

function post(path, data){
  return new Promise((resolve,reject)=>{
    const payload = JSON.stringify(data);
    const opts = {
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'Accept': 'application/json' }
    };
    const req = http.request(opts, res=>{
      let buf='';
      res.on('data', c=>buf+=c);
      res.on('end', ()=>resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

(async ()=>{
  console.log('Testing register...');
  const r1 = await post('/register', { fullname: 'Test User', username: 'testuser1', password: 'password123' });
  console.log(r1.status, r1.body);
  console.log('Testing login...');
  const r2 = await post('/login', { username: 'testuser1', password: 'password123' });
  console.log(r2.status, r2.body);
})();
