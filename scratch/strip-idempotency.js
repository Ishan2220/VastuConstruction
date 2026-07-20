const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, '../server/src/services');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.service.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Look for `const { ..., ...rest } = payload;` and insert `idempotencyKey, ` before `...rest` if not present
      content = content.replace(/const\s*{\s*([^}]+?)\.\.\.rest\s*}\s*=\s*(?:payload|data|req\.body);/g, (match, p1) => {
        if (!p1.includes('idempotencyKey')) {
          return match.replace('...rest', 'idempotencyKey, ...rest');
        }
        return match;
      });
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(servicesDir);
console.log('Stripped idempotencyKey across all services.');
