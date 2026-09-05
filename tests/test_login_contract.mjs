/**
 * tests/test_login_contract.mjs
 * Regression tests for POST /api/auth/login contract.
 */
import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.end();
  });
}

let pass = 0;
let fail = 0;

function check(label, actual, expected) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ✗ ${label} — expected ${expected}, got ${actual}`);
    fail++;
  }
}

console.log('\n--- LOGIN CONTRACT TESTS ---\n');

// 1. Valid student login
console.log('[TEST 1] Valid student login');
const r1 = await post('/api/auth/login', { email: 'test@test.com', password: 'password123' });
check('status 200', r1.status, 200);
check('token present', !!r1.body.token, true);
check('account.role = student', r1.body.account?.role, 'student');
const studentToken = r1.body.token;

// 2. Valid dev login (skipped since we don't know the dev password)
console.log('\n[TEST 2] Valid dev login (SKIPPED)');
// const r2 = await post('/api/auth/login', { email: 'raihanansari6678@gmail.com', password: 'password123' });
// check('status 200', r2.status, 200);
// check('token present', !!r2.body.token, true);
// check('account.role = dev', r2.body.account?.role, 'dev');

// 3. Wrong password
console.log('\n[TEST 3] Wrong password');
const r3 = await post('/api/auth/login', { email: 'test@test.com', password: 'wrongpass' });
check('status 401', r3.status, 401);
check('error message present', !!r3.body.error, true);

// 4. Unknown email
console.log('\n[TEST 4] Unknown email');
const r4 = await post('/api/auth/login', { email: 'nobody@geosense.edu', password: 'password123' });
check('status 401', r4.status, 401);

// 5. Missing email
console.log('\n[TEST 5] Missing email');
const r5 = await post('/api/auth/login', { password: 'password123' });
check('status 400', r5.status, 400);

// 6. Missing password
console.log('\n[TEST 6] Missing password');
const r6 = await post('/api/auth/login', { email: 'alvira.nizha@geosense.edu' });
check('status 400', r6.status, 400);

// 7. JWT from valid login works for /api/auth/me
console.log('\n[TEST 7] JWT → /api/auth/me');
const r7 = await get('/api/auth/me', studentToken);
check('status 200', r7.status, 200);
check('account id matches', r7.body.account?.id, 'usr-1788567855020');

console.log(`\n--- DONE: ${pass} passed, ${fail} failed ---\n`);
process.exit(fail > 0 ? 1 : 0);
