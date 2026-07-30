/**
 * RBAC Authorization Test Suite
 * Verifies that protected endpoints reject unauthorized access
 * Run: npx tsx tests/rbac-validation.test.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';

interface TestResult {
  test: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const results: TestResult[] = [];

async function loginAs(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return null;
    const data = await res.json() as any;
    return data.accessToken || data.token || null;
  } catch {
    return null;
  }
}

async function testEndpoint(
  name: string,
  url: string,
  token: string | null,
  expectedStatus: number,
  method: string = 'GET'
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${BASE_URL}${url}`, { method, headers });
    const passed = res.status === expectedStatus;
    
    results.push({
      test: name,
      expected: `${expectedStatus}`,
      actual: `${res.status}`,
      passed,
    });
  } catch (err: any) {
    results.push({
      test: name,
      expected: `${expectedStatus}`,
      actual: `ERROR: ${err.message}`,
      passed: false,
    });
  }
}

(async () => {
  console.log('\n🔒 ═══════════════════════════════════════════');
  console.log('   RBAC Authorization Validation Suite');
  console.log('═══════════════════════════════════════════════\n');

  // ── Test 1: Unauthenticated access should be blocked ──
  console.log('📋 Phase 1: Unauthenticated Access Tests\n');
  
  const adminOnlyEndpoints = [
    '/settings',
    '/audit-logs',
    '/users',
  ];
  
  const authRequiredEndpoints = [
    '/dashboard/stats',
    '/leads',
    '/projects',
    '/expenses',
    '/income',
    '/vendors',
    '/tasks',
    '/employees',
    '/invoices',
    '/bank-accounts',
  ];
  
  for (const ep of [...adminOnlyEndpoints, ...authRequiredEndpoints]) {
    await testEndpoint(
      `No-Auth → GET ${ep}`,
      ep,
      null,
      401
    );
  }

  // ── Test 2: Health endpoint should be public ──
  console.log('📋 Phase 2: Public Endpoint Tests\n');
  await testEndpoint('Public → GET /health', '/health', null, 200);

  // ── Test 3: RBAC with ENGINEER role ──
  console.log('📋 Phase 3: ENGINEER Role Restriction Tests\n');
  
  // Try to login as an engineer (if one exists)
  // We test with a non-admin user. If none exist, these tests are skipped.
  const engineerToken = await loginAs(
    process.env.ENGINEER_EMAIL || 'engineer@vastu.com',
    process.env.ENGINEER_PASSWORD || 'engineer123'
  );
  
  if (engineerToken) {
    const adminOnlyRoutes = [
      { path: '/settings', name: 'Settings' },
      { path: '/audit-logs', name: 'Audit Logs' },
    ];
    
    for (const route of adminOnlyRoutes) {
      await testEndpoint(
        `ENGINEER → GET ${route.path} (should be 403)`,
        route.path,
        engineerToken,
        403
      );
    }
    
    // Engineer SHOULD be able to access these
    const engineerAllowedRoutes = [
      { path: '/projects', name: 'Projects' },
      { path: '/tasks', name: 'Tasks' },
    ];
    
    for (const route of engineerAllowedRoutes) {
      await testEndpoint(
        `ENGINEER → GET ${route.path} (should be 200)`,
        route.path,
        engineerToken,
        200
      );
    }
  } else {
    console.log('  ⚠️  No engineer user available — skipping ENGINEER role tests\n');
  }

  // ── Test 4: ADMIN should access everything ──
  console.log('📋 Phase 4: ADMIN Full Access Tests\n');
  
  const adminToken = await loginAs(
    process.env.LOGIN_EMAIL || 'admin@vastu.com',
    process.env.LOGIN_PASSWORD || 'admin123'
  );

  if (adminToken) {
    const allEndpoints = [
      '/dashboard/stats',
      '/leads',
      '/projects',
      '/expenses',
      '/income',
      '/vendors',
      '/bank-accounts',
      '/invoices',
      '/tasks',
      '/employees',
      '/categories',
    ];

    for (const ep of allEndpoints) {
      await testEndpoint(
        `ADMIN → GET ${ep} (should be 200)`,
        ep,
        adminToken,
        200
      );
    }
  } else {
    console.log('  ⚠️  Could not login as admin — skipping ADMIN tests\n');
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════');
  console.log('   RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.test} — Expected: ${r.expected}, Got: ${r.actual}`);
  }
  
  console.log(`\n  📊 Total: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('  🚨 RBAC VALIDATION FAILED — Some endpoints have authorization gaps!\n');
    process.exit(1);
  } else {
    console.log('  🎉 RBAC VALIDATION PASSED — All authorization checks are correct!\n');
    process.exit(0);
  }
})();
