const crypto = require('crypto');

const BASE_URL = 'http://localhost:3002/api';
let token = null;

async function apiFetch(method, endpoint, body) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runUAT() {
  console.log('--- Starting UAT ---');

  // 1. Login
  const loginRes = await apiFetch('POST', '/auth/login', {
    email: 'admin@vastuconstruction.in',
    password: 'Admin@123'
  });
  
  if (loginRes.status !== 200) {
    console.error('Login failed!', loginRes.data);
    return;
  }
  token = loginRes.data.data.accessToken;
  console.log('✅ Logged in');

  // 2. Create Client
  const clientRes = await apiFetch('POST', '/clients', {
    name: 'UAT Client ' + Date.now(),
    phone: '9876543210',
    email: 'uat@example.com',
    companyName: 'UAT Corp',
    gst: '27AAACM1234E1Z5',
    address: 'UAT Address',
    city: 'Mumbai',
    state: 'Maharashtra'
  });
  if (clientRes.status !== 201) {
    console.error('Client failed:', clientRes.data);
    return;
  }
  const clientId = clientRes.data?.data?.id;
  console.log('✅ Created Client:', clientId);

  // 3. Create Project
  const projectRes = await apiFetch('POST', '/projects', {
    name: 'UAT Project ' + Date.now(),
    clientId,
    engineerId: null, // Ensure engineerId is valid or omitted if optional
    status: 'PLANNING',
    startDate: new Date().toISOString(),
    contractValue: 5000000,
    budget: 4500000
  });
  if (projectRes.status !== 201) {
    console.error('Project failed:', projectRes.data);
    return;
  }
  const projectId = projectRes.data?.data?.id;
  console.log('✅ Created Project:', projectId);

  // 4. Create Vendor
  const vendorRes = await apiFetch('POST', '/vendors', {
    name: 'UAT Vendor ' + Date.now(),
    category: 'MATERIAL',
    phone: '1231231234'
  });
  if (vendorRes.status !== 201) {
    console.error('Vendor failed:', vendorRes.data);
    return;
  }
  const vendorId = vendorRes.data?.data?.id;
  console.log('✅ Created Vendor:', vendorId);

  // 4.5 Create Material
  const materialRes = await apiFetch('POST', '/materials', {
    name: 'UAT Cement ' + Date.now(),
    unit: 'BAGS',
    rate: 400,
    vendorId
  });
  if (materialRes.status !== 201) {
    console.error('Material failed:', materialRes.data);
    return;
  }
  const materialId = materialRes.data?.data?.id;
  console.log('✅ Created Material:', materialId);

  // 5. Material Order
  const orderRes = await apiFetch('POST', '/material-orders', {
    projectId,
    vendorId,
    deliveryDate: new Date().toISOString(),
    items: [
      { materialId, quantityOrdered: 100, rate: 400 } 
    ],
    totalAmount: 40000
  });
  console.log('✅ Material Order Status:', orderRes.status, orderRes.data?.message || orderRes.data);

  // 6. Vendor Payment
  const paymentRes = await apiFetch('POST', `/vendors/${vendorId}/payments`, {
    amount: 10000,
    paymentDate: new Date().toISOString(),
    paymentMethod: 'BANK_TRANSFER'
  });
  console.log('✅ Vendor Payment Status:', paymentRes.status, paymentRes.data?.message);

  // 7. Check Dashboard Financials
  const finRes = await apiFetch('GET', '/financial/summary');
  console.log('✅ Financial Summary:', JSON.stringify(finRes.data?.data, null, 2));

  console.log('--- UAT Completed ---');
}

runUAT().catch(console.error);
