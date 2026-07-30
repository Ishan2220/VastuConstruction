import { upsertAttendance } from './src/services/attendance.service.js';
import { prisma } from './src/config/database.js';

async function main() {
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const employee = await prisma.employee.findFirst({ where: { isArchived: false } });
    
    if (!employee) {
      console.log('No employee found');
      return;
    }
    
    console.log('Trying to upsert for person:', employee.id);
    
    const res = await upsertAttendance(
      employee.id,
      'EMPLOYEE',
      '2026-07-27',
      'PRESENT',
      0,
      admin.id
    );
    
    console.log('Success:', res);
  } catch (err) {
    console.error('API Error:', err);
  }
}
main();
