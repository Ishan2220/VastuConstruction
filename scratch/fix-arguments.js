const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'server', 'src', 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('(arguments[0] as any)?.idempotencyKey')) {
    c = c.replace(/\(arguments\[0\] as any\)\?\.idempotencyKey/g, "require('crypto').randomUUID()");
    fs.writeFileSync(p, c);
    console.log('Fixed', f);
  }
});
