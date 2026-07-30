/**
 * Vastu Construction ERP - API Endpoint Smoke Test Suite
 *
 * Validates availability and responses for all major API endpoints.
 * Run with: npx tsx tests/api-smoke.test.ts
 */

const BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}/api`;
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'admin@vastu.com';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'admin123';

interface TestResult {
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  requiresAuth: boolean;
  error?: string;
  responseTimeMs: number;
}

// ANSI colors & styling
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
};

(async () => {
  console.log(`\n${colors.bold}${colors.cyan}=====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} 🚀 VASTU ERP API ENDPOINT SMOKE TEST SUITE ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=====================================================${colors.reset}`);
  console.log(`${colors.dim}Target URL: ${BASE_URL}${colors.reset}\n`);

  let token: string | null = null;
  const results: TestResult[] = [];

  // Step 1: Authenticate
  console.log(`${colors.bold}🔑 Step 1: Authenticating...${colors.reset}`);
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });

    const loginData = (await loginRes.json()) as any;

    if (loginRes.ok) {
      token = loginData?.data?.accessToken || loginData?.accessToken || loginData?.token || null;
      if (token) {
        console.log(`   ${colors.green}✓ Login successful! Token acquired.${colors.reset}\n`);
      } else {
        console.log(`   ${colors.yellow}⚠️ Login status 200 OK but access token not found in response.${colors.reset}\n`);
      }
    } else {
      console.log(`   ${colors.yellow}⚠️ Login failed (${loginRes.status}): ${loginData?.message || 'Unauthorized'}. Proceeding with unauthenticated testing for remaining endpoints...${colors.reset}\n`);
    }
  } catch (err: any) {
    console.log(`   ${colors.yellow}⚠️ Login request failed (${err.message}). Proceeding...${colors.reset}\n`);
  }

  // Endpoints to test
  const endpointsToTest: Array<{ path: string; expectedStatus: number; requiresAuth: boolean; description?: string }> = [
    { path: '/health', expectedStatus: 200, requiresAuth: false, description: 'Public Health Check' },
    { path: '/dashboard/stats', expectedStatus: 200, requiresAuth: true },
    { path: '/dashboard/kpis', expectedStatus: 200, requiresAuth: true },
    { path: '/leads', expectedStatus: 200, requiresAuth: true },
    { path: '/projects', expectedStatus: 200, requiresAuth: true },
    { path: '/clients', expectedStatus: 200, requiresAuth: true },
    { path: '/vendors', expectedStatus: 200, requiresAuth: true },
    { path: '/materials', expectedStatus: 200, requiresAuth: true },
    { path: '/material-orders', expectedStatus: 200, requiresAuth: true },
    { path: '/expenses', expectedStatus: 200, requiresAuth: true },
    { path: '/income', expectedStatus: 200, requiresAuth: true },
    { path: '/bank-accounts', expectedStatus: 200, requiresAuth: true },
    { path: '/invoices', expectedStatus: 200, requiresAuth: true },
    { path: '/tasks', expectedStatus: 200, requiresAuth: true },
    { path: '/employees', expectedStatus: 200, requiresAuth: true },
    { path: '/labour', expectedStatus: 200, requiresAuth: true },
    { path: '/calendar', expectedStatus: 200, requiresAuth: true },
    { path: '/documents', expectedStatus: 200, requiresAuth: true },
    { path: '/notifications', expectedStatus: 200, requiresAuth: true },
    { path: '/reports/financial', expectedStatus: 200, requiresAuth: true },
    { path: '/audit-logs', expectedStatus: 200, requiresAuth: true },
    { path: '/categories', expectedStatus: 200, requiresAuth: true },
    { path: '/activities', expectedStatus: 200, requiresAuth: true },
    { path: '/purchase-orders', expectedStatus: 200, requiresAuth: true },
    { path: '/attendance', expectedStatus: 200, requiresAuth: true },
    { path: '/payments', expectedStatus: 200, requiresAuth: true },
    { path: '/settings', expectedStatus: 401, requiresAuth: false, description: 'RBAC / Unauthenticated access check' },
  ];

  // Step 2: Run GET requests against endpoints
  console.log(`${colors.bold}🧪 Step 2: Testing API Endpoints...${colors.reset}`);

  for (const item of endpointsToTest) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (item.requiresAuth && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}${item.path}`;
    const startTime = Date.now();
    let actualStatus = 0;
    let errorMsg: string | undefined;

    try {
      const res = await fetch(url, { method: 'GET', headers });
      actualStatus = res.status;
      const duration = Date.now() - startTime;
      const passed = actualStatus === item.expectedStatus;

      results.push({
        endpoint: `GET /api${item.path}`,
        method: 'GET',
        expectedStatus: item.expectedStatus,
        actualStatus,
        passed,
        requiresAuth: item.requiresAuth,
        responseTimeMs: duration,
      });

      const symbol = passed ? `${colors.green}✓${colors.reset}` : `${colors.red}❌${colors.reset}`;
      const statusText = passed
        ? `${colors.green}${actualStatus}${colors.reset}`
        : `${colors.red}${actualStatus} (Expected ${item.expectedStatus})${colors.reset}`;

      console.log(`  ${symbol} GET /api${item.path.padEnd(24)} ➔ ${statusText} [${duration}ms]`);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      errorMsg = err.message || 'Fetch failed';
      results.push({
        endpoint: `GET /api${item.path}`,
        method: 'GET',
        expectedStatus: item.expectedStatus,
        actualStatus: 0,
        passed: false,
        requiresAuth: item.requiresAuth,
        error: errorMsg,
        responseTimeMs: duration,
      });
      console.log(`  ${colors.red}❌ GET /api${item.path.padEnd(24)} ➔ ERROR: ${errorMsg}${colors.reset}`);
    }
  }

  // Step 3: Summary Table
  console.log(`\n${colors.bold}${colors.cyan}=====================================================${colors.reset}`);
  console.log(`${colors.bold}📊 TEST RESULTS SUMMARY TABLE${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=====================================================${colors.reset}\n`);

  const col = {
    endpoint: 34,
    expected: 10,
    actual: 10,
    time: 10,
    status: 10,
  };

  const lineTop = `┌${'─'.repeat(col.endpoint)}┬${'─'.repeat(col.expected)}┬${'─'.repeat(col.actual)}┬${'─'.repeat(col.time)}┬${'─'.repeat(col.status)}┐`;
  const lineMid = `├${'─'.repeat(col.endpoint)}┼${'─'.repeat(col.expected)}┼${'─'.repeat(col.actual)}┼${'─'.repeat(col.time)}┼${'─'.repeat(col.status)}┤`;
  const lineBot = `└${'─'.repeat(col.endpoint)}┴${'─'.repeat(col.expected)}┴${'─'.repeat(col.actual)}┴${'─'.repeat(col.time)}┴${'─'.repeat(col.status)}┘`;

  console.log(lineTop);
  console.log(
    `│ ${'Endpoint'.padEnd(col.endpoint - 2)} │ ${'Expected'.padEnd(col.expected - 2)} │ ${'Actual'.padEnd(col.actual - 2)} │ ${'Time'.padEnd(col.time - 2)} │ ${'Status'.padEnd(col.status - 2)} │`
  );
  console.log(lineMid);

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    if (r.passed) passedCount++;
    else failedCount++;

    const ep = r.endpoint.length > col.endpoint - 2
      ? r.endpoint.substring(0, col.endpoint - 5) + '...'
      : r.endpoint.padEnd(col.endpoint - 2);

    const exp = String(r.expectedStatus).padEnd(col.expected - 2);
    const actStr = r.actualStatus === 0 ? 'ERR' : String(r.actualStatus);
    const act = actStr.padEnd(col.actual - 2);
    const time = `${r.responseTimeMs}ms`.padEnd(col.time - 2);

    const statusDisplay = r.passed
      ? `${colors.green}PASS${colors.reset}`
      : `${colors.red}FAIL${colors.reset}`;

    // Account for ANSI escape codes when calculating padding for status
    const statusPadding = ' '.repeat(col.status - 2 - 4);

    console.log(`│ ${ep} │ ${exp} │ ${act} │ ${time} │ ${statusDisplay}${statusPadding} │`);
  }

  console.log(lineBot);

  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  Total Endpoints Tested: ${results.length}`);
  console.log(`  Passed:                ${colors.green}${passedCount}${colors.reset}`);
  console.log(`  Failed:                ${failedCount > 0 ? colors.red + failedCount + colors.reset : '0'}`);

  if (failedCount === 0) {
    console.log(`\n${colors.bold}${colors.bgGreen} 🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY! ${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.bold}${colors.bgRed} ❌ SMOKE TESTS FAILED! (${failedCount} test(s) failed) ${colors.reset}\n`);
    process.exit(1);
  }
})();
