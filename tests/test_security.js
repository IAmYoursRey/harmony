import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SECURITY TESTS ---');

  // Test 1: Access without token
  console.log('\\n[TEST 1] GET /api/auth/me without token');
  let res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/me',
    method: 'GET'
  });
  console.log(`Status: ${res.status} (Expected 401) - Data: ${res.data}`);

  // Test 2: Login as student
  console.log('\\n[TEST 2] POST /api/auth/login as student');
  const loginData = JSON.stringify({ email: 'test@test.com', password: 'password123' });
  res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, loginData);
  console.log(`Status: ${res.status} (Expected 200)`);
  const parsed = JSON.parse(res.data);
  const studentToken = parsed.token;
  console.log(`Token received: ${!!studentToken}`);

  // Test 3: Access with invalid token
  console.log('\\n[TEST 3] GET /api/auth/me with invalid token');
  res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer INVALID_TOKEN_XYZ'
    }
  });
  console.log(`Status: ${res.status} (Expected 403) - Data: ${res.data}`);

  // Test 4: Digital twin edit as student
  console.log('\\n[TEST 4] POST /api/digital-twin/sch-20534748 as student');
  const twinData = JSON.stringify({ mapImage: 'mock', nodes: [], edges: [] });
  res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/digital-twin/sch-20534748',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
      'Content-Length': twinData.length
    }
  }, twinData);
  console.log(`Status: ${res.status} (Expected 403) - Data: ${res.data}`);

  // Test 5: Login as dev
  console.log('\\n[TEST 5] POST /api/auth/login as dev');
  const devLoginData = JSON.stringify({ email: 'devtest@test.com', password: 'password123' });
  res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': devLoginData.length
    }
  }, devLoginData);
  const devToken = JSON.parse(res.data).token;
  console.log(`Status: ${res.status} (Expected 200)`);

  // Test 6: Digital twin edit as dev
  console.log('\\n[TEST 6] POST /api/digital-twin/sch-20534748 as dev');
  res = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/digital-twin/sch-20534748',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${devToken}`,
      'Content-Type': 'application/json',
      'Content-Length': twinData.length
    }
  }, twinData);
  console.log(`Status: ${res.status} (Expected 200) - Data: ${res.data}`);

  console.log('\\n--- TESTS COMPLETE ---');
}

runTests().catch(console.error);
