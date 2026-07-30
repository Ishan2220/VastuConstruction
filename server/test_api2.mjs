async function test() {
  try {
    const loginRes = await fetch('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    console.log(loginData);
  } catch (err) {
    console.error('API Error:', err);
  }
}
test();
