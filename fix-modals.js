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
let changed = [];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Fix Modals that have fixed inset-0 without overflow-y-auto on the inner card
  content = content.replace(/(<div className=(?:\{`|["']).*?\bw-full\s+max-w-[a-z0-9]+(?:-[a-z0-9]+)*.*?(?:space-y-\d+|p-\d+).*?["'`\}]>)/g, (match) => {
    // Only target those that look like modals (usually max-w-md or max-w-lg or max-w-2xl etc inside a fixed inset-0, but we'll just check if it's not already overflow-y-auto and is w-full max-w-)
    if (!match.includes('overflow-y-auto') && (match.includes('max-w-md') || match.includes('max-w-lg') || match.includes('max-w-xl') || match.includes('max-w-2xl'))) {
      if (content.includes('fixed inset-0')) {
        return match.replace('w-full', 'w-full max-h-[90vh] overflow-y-auto');
      }
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changed.push(file.replace(/\\/g, '/'));
  }
});
console.log(JSON.stringify(changed, null, 2));
