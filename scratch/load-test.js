const crypto = require('crypto');

const BASE_URL = 'http://localhost:3002/api';
let token = null;

async function apiFetch(method, endpoint, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    const latency = performance.now() - start;
    return { status: res.status, latency, data };
  } catch (err) {
    return { status: 500, latency: performance.now() - start, error: err.message };
  }
}

async function runLoadTest(concurrentUsers) {
  console.log(`\n--- Starting Load Test: ${concurrentUsers} Concurrent Users ---`);
  
  // Login once for the token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ email: 'admin@vastuconstruction.in', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  if (!loginData.data) {
    console.error('Login failed in load test:', loginData);
    process.exit(1);
  }
  token = loginData.data.accessToken;

  // Setup client for projects
  const clientRes = await apiFetch('POST', '/clients', {
    name: 'Load Test Client', phone: '9998887776', email: 'load@test.com', companyName: 'Load Corp'
  });

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  let totalLatency = 0;

  const tasks = Array.from({ length: concurrentUsers }).map(async (_, i) => {
    // Each user creates a project
    const res = await apiFetch('POST', '/projects', {
      name: `Load Project ${Date.now()}-${i}`,
      clientId: clientRes.data?.data?.id || 'dumm-id',
      status: 'PLANNING',
      contractValue: 10000,
      budget: 5000,
      startDate: new Date().toISOString()
    });
    
    if (res.status === 201) successCount++;
    else failCount++;
    
    totalLatency += res.latency;
  });

  await Promise.all(tasks);
  
  const totalTime = (Date.now() - startTime) / 1000;
  const avgLatency = totalLatency / concurrentUsers;
  
  console.log(`✅ Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`✅ Throughput: ${(concurrentUsers / totalTime).toFixed(2)} req/sec`);
  console.log(`✅ Avg Latency: ${avgLatency.toFixed(2)}ms`);
  console.log(`✅ Success: ${successCount} | Failed: ${failCount}`);
}

async function execute() {
  await runLoadTest(100);
  await new Promise(r => setTimeout(r, 2000));
  await runLoadTest(250);
  await new Promise(r => setTimeout(r, 2000));
  await runLoadTest(500);
  await new Promise(r => setTimeout(r, 2000));
  await runLoadTest(1000);
}

execute().catch(console.error);
