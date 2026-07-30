async function test() {
  try {
    const loginRes = await fetch('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.token;
    
    // Get people first
    const getRes = await fetch('http://localhost:5173/api/attendance?date=2026-07-27&type=EMPLOYEE', {
      headers: { Authorization: Bearer  }
    });
    const getData = await getRes.json();
    
    const person = getData.data.people[0];
    if (!person) {
      console.log('No person found');
      return;
    }
    
    console.log('Trying to update person:', person.personId);
    
    const putRes = await fetch('http://localhost:5173/api/attendance', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: Bearer 
      },
      body: JSON.stringify({
        personId: person.personId,
        personType: 'EMPLOYEE',
        date: '2026-07-27',
        status: 'PRESENT',
        overtimeHours: 0
      })
    });
    
    const putData = await putRes.json();
    console.log('Success:', putData);
  } catch (err) {
    console.error('API Error:', err);
  }
}

test();
