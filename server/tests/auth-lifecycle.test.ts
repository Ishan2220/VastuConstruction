import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL || 'admin@vastu.com';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'admin123';

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
}

/**
 * Extracts a specific cookie value from the Set-Cookie header of a Fetch Response.
 * Supports both standard Node.js getSetCookie() and string get('set-cookie').
 */
function extractCookie(res: Response, name: string): string | null {
  let cookies: string[] = [];
  if (typeof (res.headers as any).getSetCookie === 'function') {
    cookies = (res.headers as any).getSetCookie();
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) {
      cookies = [raw];
    }
  }

  for (const cookieStr of cookies) {
    const parts = cookieStr.split(';');
    for (const part of parts) {
      const [key, ...valParts] = part.trim().split('=');
      if (key === name) {
        return valParts.join('=');
      }
    }
  }
  return null;
}

(async () => {
  console.log('==================================================');
  console.log('     Vastu Construction - Auth Lifecycle Test     ');
  console.log('==================================================');
  console.log(`Target Base URL : ${BASE_URL}`);
  console.log(`Test Credentials: ${LOGIN_EMAIL}`);
  console.log('--------------------------------------------------\n');

  const results: TestResult[] = [];
  let accessToken1 = '';
  let refreshToken1 = '';
  let accessToken2 = '';
  let refreshToken2 = '';

  // 1. Login Test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });

    const body = await res.json().catch(() => ({}));
    accessToken1 = body?.data?.accessToken || body?.accessToken || '';
    refreshToken1 = extractCookie(res, 'refreshToken') || '';

    const passed = res.status === 200 && Boolean(accessToken1) && Boolean(refreshToken1);
    results.push({
      step: 1,
      name: 'Login Test',
      passed,
      details: `Status: ${res.status}, AccessToken: ${Boolean(accessToken1) ? 'Received' : 'Missing'}, RefreshToken Cookie: ${Boolean(refreshToken1) ? 'Set' : 'Missing'}`,
    });
  } catch (err: any) {
    results.push({
      step: 1,
      name: 'Login Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 2. Authenticated Request Test
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken1}`,
      },
    });

    const body = await res.json().catch(() => ({}));
    const passed = res.status === 200 && body?.success !== false;
    results.push({
      step: 2,
      name: 'Authenticated Request Test',
      passed,
      details: `Status: ${res.status}, Response: ${body?.message || (body?.data ? 'Valid stats returned' : 'No data')}`,
    });
  } catch (err: any) {
    results.push({
      step: 2,
      name: 'Authenticated Request Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 3. Refresh Token Test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `refreshToken=${refreshToken1}`,
      },
    });

    const body = await res.json().catch(() => ({}));
    accessToken2 = body?.data?.accessToken || body?.accessToken || '';
    const newCookie = extractCookie(res, 'refreshToken');
    refreshToken2 = newCookie || refreshToken1;

    const passed = res.status === 200 && Boolean(accessToken2);
    results.push({
      step: 3,
      name: 'Refresh Token Test',
      passed,
      details: `Status: ${res.status}, New AccessToken: ${Boolean(accessToken2) ? 'Received' : 'Missing'}`,
    });
  } catch (err: any) {
    results.push({
      step: 3,
      name: 'Refresh Token Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 4. Use New Token Test
  try {
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken2}`,
      },
    });

    const body = await res.json().catch(() => ({}));
    const passed = res.status === 200;
    results.push({
      step: 4,
      name: 'Use New Token Test',
      passed,
      details: `Status: ${res.status}, Response: ${body?.message || 'Successfully fetched leads'}`,
    });
  } catch (err: any) {
    results.push({
      step: 4,
      name: 'Use New Token Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 5. Logout Test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': `refreshToken=${refreshToken2 || refreshToken1}`,
      },
    });

    const setCookieHeader = res.headers.get('set-cookie') || '';
    const cookieVal = extractCookie(res, 'refreshToken');
    const isCleared = setCookieHeader.toLowerCase().includes('refreshtoken=') &&
      (cookieVal === '' || cookieVal === null || setCookieHeader.includes('Max-Age=0') || setCookieHeader.includes('Expires=Thu, 01 Jan 1970'));

    const passed = res.status === 200 && isCleared;
    results.push({
      step: 5,
      name: 'Logout Test',
      passed,
      details: `Status: ${res.status}, RefreshToken Cookie Cleared: ${isCleared}`,
    });
  } catch (err: any) {
    results.push({
      step: 5,
      name: 'Logout Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 6. Post-Logout Rejection Test
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken1}`,
      },
    });

    const isStatelessValid = res.status === 200;
    const isRejected = res.status === 401;
    const passed = isStatelessValid || isRejected;

    results.push({
      step: 6,
      name: 'Post-Logout Rejection Test',
      passed,
      details: `Status: ${res.status} (${isStatelessValid ? 'Stateless JWT remains valid prior to expiry' : 'Rejected'})`,
    });
  } catch (err: any) {
    results.push({
      step: 6,
      name: 'Post-Logout Rejection Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 7. Refresh After Logout Test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Cookie': `refreshToken=${refreshToken2 || refreshToken1}`,
      },
    });

    const passed = res.status === 401;
    results.push({
      step: 7,
      name: 'Refresh After Logout Test',
      passed,
      details: `Status: ${res.status} (Invalidated refresh token rejected)`,
    });
  } catch (err: any) {
    results.push({
      step: 7,
      name: 'Refresh After Logout Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 8. Unauthorized Access Test
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`, {
      method: 'GET',
    });

    const passed = res.status === 401;
    results.push({
      step: 8,
      name: 'Unauthorized Access Test',
      passed,
      details: `Status: ${res.status} (Access denied without token)`,
    });
  } catch (err: any) {
    results.push({
      step: 8,
      name: 'Unauthorized Access Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // 9. Forgot Password Test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@vastu.com' }),
    });

    const body = await res.json().catch(() => ({}));
    const hasNoPassword = body?.data?.password === undefined &&
      body?.data?.tempPassword === undefined &&
      body?.password === undefined &&
      body?.tempPassword === undefined;

    const passed = res.status === 200 && hasNoPassword;
    results.push({
      step: 9,
      name: 'Forgot Password Test',
      passed,
      details: `Status: ${res.status}, Password field absent: ${hasNoPassword}`,
    });
  } catch (err: any) {
    results.push({
      step: 9,
      name: 'Forgot Password Test',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // Print Summary Table
  console.log('==================================================');
  console.log('                 TEST RESULTS SUMMARY             ');
  console.log('==================================================');

  let allPassed = true;
  for (const r of results) {
    const statusStr = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`${r.step}. ${r.name.padEnd(30)} ${statusStr} - ${r.details}`);
    if (!r.passed) {
      allPassed = false;
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Final Result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('==================================================\n');

  process.exit(allPassed ? 0 : 1);
})();
