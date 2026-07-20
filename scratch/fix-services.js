import fs from 'fs';
import path from 'path';

const servicesDir = path.join('D:\\VastuConstruction\\server\\src\\services');

const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix: make sure idempotencyKey is extracted from payload if there's a spread to prisma
  // Actually, we'll just remove idempotencyKey from being passed to Prisma by explicitly destructuring it 
  // where we see ...data or ...payload if it's not already done.
  // Also, replace crypto.randomUUID() in publishMutation with (data.idempotencyKey || payload.idempotencyKey || crypto.randomUUID())
  
  // This is too complex for a simple regex, I'll manually fix the key files instead of a generic script.
});
