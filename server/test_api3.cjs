const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5173,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const token = JSON.parse(data).data?.token || JSON.parse(data).data?.accessToken;
    if (!token) {
      console.log('Login failed:', data);
      return;
    }
    console.log('Got token');
    
    const putReq = http.request({
      hostname: 'localhost',
      port: 5173,
      path: '/api/attendance',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    }, putRes => {
      let putData = '';
      putRes.on('data', d => putData += d);
      putRes.on('end', () => {
        console.log('PUT Response:', putRes.statusCode, putData);
      });
    });
    
    putReq.write(JSON.stringify({
      personId: '64197f03-c3ad-4448-9ec6-462ffc64bf58',
      personType: 'EMPLOYEE',
      date: '2026-07-27',
      status: 'PRESENT',
      overtimeHours: 0
    }));
    putReq.end();
  });
});

req.write(JSON.stringify({ email: 'admin@vastuconstruction.in', password: 'admin' })); // guessing password
req.end();
