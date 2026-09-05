import http from 'http';

const baseUrl = 'http://localhost:3001/api';

async function makeRequest(endpoint, body, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  return new Promise((resolve, reject) => {
    const req = http.request(baseUrl + endpoint, {
      method: 'POST',
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE AUTH TEST MATRIX ---\n');

  try {
    // 1. Valid logins
    let res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com', password: 'admin123' });
    console.log(`[VALID DEV LOGIN] Expected 200, Got ${res.status} -> ${res.status === 200 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 'alvira.nizha@geosense.edu', password: 'admin123' });
    console.log(`[VALID STUDENT LOGIN] Expected 200, Got ${res.status} -> ${res.status === 200 ? 'PASS' : 'FAIL'}`);

    // 2. Invalid credentials
    res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com', password: 'wrongpassword' });
    console.log(`[WRONG PASSWORD] Expected 401, Got ${res.status} -> ${res.status === 401 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 'unknown@email.com', password: 'admin123' });
    console.log(`[UNKNOWN EMAIL] Expected 401, Got ${res.status} -> ${res.status === 401 ? 'PASS' : 'FAIL'}`);

    // 3. Malformed Payloads
    console.log('\n--- Malformed Payloads ---');
    
    res = await makeRequest('/auth/login', { password: 'admin123' });
    console.log(`[MISSING EMAIL] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com' });
    console.log(`[MISSING PASSWORD] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: null, password: 'admin123' });
    console.log(`[EMAIL NULL] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: { $gt: "" }, password: 'admin123' });
    console.log(`[EMAIL OBJECT] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: ['admin123'], password: 'admin123' });
    console.log(`[EMAIL ARRAY] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 12345, password: 'admin123' });
    console.log(`[EMAIL NUMBER] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com', password: { $gt: "" } });
    console.log(`[PASSWORD OBJECT] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com', password: ['admin123'] });
    console.log(`[PASSWORD ARRAY] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com', password: 12345 });
    console.log(`[PASSWORD NUMBER] Expected 400, Got ${res.status} -> ${res.status === 400 ? 'PASS' : 'FAIL'}`);

    // 4. Stability Check
    console.log('\n--- Stability Check (Should still work after malformed attacks) ---');
    res = await makeRequest('/auth/login', { email: 'raihanansari6678@gmail.com', password: 'admin123' });
    console.log(`[FINAL VALID LOGIN] Expected 200, Got ${res.status} -> ${res.status === 200 ? 'PASS' : 'FAIL'}`);
    
    console.log('\n--- TESTS COMPLETE ---');
  } catch (err) {
    console.error('Test suite failed (Server probably crashed):', err);
    process.exit(1);
  }
}

runTests();
