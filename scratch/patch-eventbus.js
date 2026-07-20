const fs = require('fs');
const path = require('path');

const files = ['expense.service.ts', 'income.service.ts', 'project.service.ts'];

files.forEach(f => {
  const p = path.join(__dirname, 'server', 'src', 'services', f);
  if (!fs.existsSync(p)) {
      console.log('Skipping', p);
      return;
  }
  let c = fs.readFileSync(p, 'utf8');
  
  if (!c.includes("import { randomUUID } from 'crypto';")) {
      c = c.replace(/import \{ eventBus \} from '\.\.\/events\/EventBus\.js';/g, "import { eventBus } from '../events/EventBus.js';\nimport { randomUUID } from 'crypto';");
  }

  // Replace eventBus.publishMutation(a,b,c,d,e,f) with a,b,c,d,randomUUID(),e,f
  c = c.replace(/eventBus\.publishMutation\((.*?)\);/g, (m, args) => {
    // only split by top level commas, but assuming no nested commas here for simplicity
    const parts = args.split(',').map(s => s.trim());
    if (parts.length === 6) {
      return `eventBus.publishMutation(${parts[0]}, ${parts[1]}, ${parts[2]}, ${parts[3]}, randomUUID(), ${parts[4]}, ${parts[5]});`;
    }
    return m;
  });

  fs.writeFileSync(p, c);
  console.log('Patched', p);
});
