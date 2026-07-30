const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const token = jwt.sign(
    { userId: admin.id, role: admin.role, name: admin.name, email: admin.email },
    process.env.ACCESS_TOKEN_SECRET || 'vastu_secret_key_2024',
    { expiresIn: '1h' }
  );
  console.log('Token generated');
  
  const putRes = await fetch('http://localhost:5173/api/attendance', {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: \Bearer \\
    },
    body: JSON.stringify({
      personId: '64197f03-c3ad-4448-9ec6-462ffc64bf58',
      personType: 'EMPLOYEE',
      date: '2026-07-27',
      status: 'HALF_DAY',
      overtimeHours: 2
    })
  });
  
  const putData = await putRes.json();
  console.log('PUT:', putData);
}
test();
