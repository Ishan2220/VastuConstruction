const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5173/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    const token = loginRes.data.data.token;
    
    // Get people first
    const getRes = await axios.get('http://localhost:5173/api/attendance?date=2026-07-27&type=EMPLOYEE', {
      headers: { Authorization: Bearer  }
    });
    
    const person = getRes.data.data.people[0];
    if (!person) {
      console.log('No person found');
      return;
    }
    
    console.log('Trying to update person:', person.personId);
    
    const putRes = await axios.put('http://localhost:5173/api/attendance', {
      personId: person.personId,
      personType: 'EMPLOYEE',
      date: '2026-07-27',
      status: 'PRESENT',
      overtimeHours: 0
    }, {
      headers: { Authorization: Bearer  }
    });
    
    console.log('Success:', putRes.data);
  } catch (err) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

test();
