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
      
      content = content.replace(/require\('crypto'\)\.randomUUID\(\)/g, 'crypto.randomUUID()');
      
      if (content.includes('crypto.randomUUID()') && !content.includes("import crypto from 'crypto'")) {
        content = "import crypto from 'crypto';\n" + content;
      }
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(servicesDir);
console.log('Fixed require(crypto) across all services.');
