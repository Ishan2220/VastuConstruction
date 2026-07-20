import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pagesDir = path.join(__dirname, '..', 'client', 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Split into lines
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('queryClient.invalidateQueries(') && !line.includes('admin-dashboard-stats')) {
      // Check if the next line already has admin-dashboard-stats
      if (i + 1 < lines.length && lines[i + 1].includes('admin-dashboard-stats')) {
        continue;
      }
      
      // Get indentation of the current line
      const match = line.match(/^(\s*)/);
      const indent = match ? match[1] : '';
      
      lines.splice(i + 1, 0, `${indent}queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });`);
      modified = true;
      i++; // Skip the line we just added
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Updated ${file}`);
  }
}
