import { getAttendanceByDate } from './src/services/attendance.service.js';

async function main() {
  try {
    const res = await getAttendanceByDate('2026-07-27', 'EMPLOYEE');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}
main();
