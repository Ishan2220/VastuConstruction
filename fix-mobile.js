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
  
  const fixedWidthRegex = /className=(?:\{`|["']).*?\bw-\[?(?:[2-9]\d{2,}|1\d{3,})(?:px|rem)?\]?\b.*?["'`\}]/g;
  while ((match = fixedWidthRegex.exec(content)) !== null) {
      issues.push({file: file.replace(/\\/g, '/'), type: 'large-fixed-width', match: match[0]});
  }
  
  const hRegex = /className=(?:\{`|["']).*?\b(w-\[100vw\]|h-\[100vh\]|h-\[\d+(?:px|vh)\])\b.*?["'`\}]/g;
  while ((match = hRegex.exec(content)) !== null) {
      issues.push({file: file.replace(/\\/g, '/'), type: 'large-fixed-height-or-width', match: match[0]});
  }
  
  // Modals dialogs
  if (file.includes('Modal') || file.includes('Dialog')) {
      if (content.includes('DialogContent') && !content.includes('max-w-')) {
          issues.push({file: file.replace(/\\/g, '/'), type: 'dialog-no-max-w'});
      }
  }
});
console.log(JSON.stringify(issues, null, 2));
