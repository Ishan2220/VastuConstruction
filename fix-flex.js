const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('d:/VastuConstruction/client/src');
let issues = [];
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  
  const regex = /className=(?:\{`|["']).*?\b(flex[^"'\`]*?justify-between[^"'\`]*?)\b.*?["'`\}]/g;
  while ((match = regex.exec(content)) !== null) {
      if (!match[0].includes('flex-col') && !match[0].includes('flex-wrap') && !match[0].includes('sm:flex-row') && !match[0].includes('md:flex-row')) {
        issues.push({file: file.replace(/\\/g, '/'), match: match[0]});
      }
  }
});
console.log(JSON.stringify(issues, null, 2));
