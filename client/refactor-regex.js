const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/**/*.tsx');

let updated = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('confirm(') && !content.includes('window.confirm(')) {
    continue;
  }
  
  // 1. Add import if not exists
  if (!content.includes('useConfirm')) {
    const importMatch = content.match(/^import .* from '.*';$/m);
    if (importMatch) {
      content = content.replace(importMatch[0], `${importMatch[0]}\nimport { useConfirm } from '@/components/ui/ConfirmProvider';`);
    } else {
      content = `import { useConfirm } from '@/components/ui/ConfirmProvider';\n${content}`;
    }
  }

  // 2. Add const confirmDialog = useConfirm(); to the component body
  // Find the default export function
  const functionRegex = /export\s+default\s+function\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*{/;
  if (functionRegex.test(content) && !content.includes('const confirmDialog = useConfirm();')) {
    content = content.replace(functionRegex, (match) => {
      return `${match}\n  const confirmDialog = useConfirm();`;
    });
  }

  // 3. Find and replace confirm() calls
  // `if (confirm('msg'))` -> `if (await confirmDialog({ title: 'Confirm Action', message: 'msg' }))`
  const confirmRegex = /(?:window\.)?confirm\(([^)]+)\)/g;
  content = content.replace(confirmRegex, (match, msg) => {
    return `await confirmDialog({ title: 'Confirm Action', message: ${msg}, isDestructive: true })`;
  });

  // 4. Any function containing await confirmDialog must be async.
  // This is a naive replacement for onClick handlers
  const onClickRegex = /onClick=\{\s*\(\s*([^)]*)\s*\)\s*=>\s*{([^}]*await confirmDialog[^}]*)}/g;
  content = content.replace(onClickRegex, (match, args, body) => {
    return `onClick={async (${args}) => {${body}}`;
  });
  
  // Also handle inline expressions: onClick={() => confirm() && action()}
  // But Vastu codebase mainly uses onClick={() => { if(confirm()) ... }}
  
  fs.writeFileSync(file, content);
  updated++;
  console.log('Updated', file);
}

console.log('Total files updated:', updated);
