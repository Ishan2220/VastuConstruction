const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../client/src/pages');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

let modifiedFiles = 0;

walk(PAGES_DIR, (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Optimize padding
  content = content.replace(/className="p-6 md:p-8 /g, 'className="p-4 md:p-8 lg:p-8 ');
  content = content.replace(/className="p-6 md:p-8"/g, 'className="p-4 md:p-8 lg:p-8"');

  // 2. Wrap tables if not already wrapped
  // A naive approach: find <table ...> and ensure it is preceded by <div className="overflow-x-auto w-full">
  // Since JSX can be complex, let's use a regex that matches <table> and checks its wrapper.
  // Actually, we can just replace <table with <div className="overflow-x-auto w-full pb-4 rounded-xl shadow-sm ring-1 ring-slate-200/50"><table 
  // and </table> with </table></div>
  // BUT we must make sure we don't double wrap!
  if (content.includes('<table') && !content.includes('overflow-x-auto')) {
    content = content.replace(/(<table[\s\S]*?<\/table>)/g, '<div className="overflow-x-auto w-full pb-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent rounded-xl shadow-sm ring-1 ring-slate-200/50 bg-white">$1</div>');
  }

  // 3. Modals: make them full width on mobile
  content = content.replace(/max-w-2xl w-full/g, 'max-w-2xl w-[95%] md:w-full mx-auto');
  content = content.replace(/max-w-4xl w-full/g, 'max-w-4xl w-[95%] md:w-full mx-auto');
  content = content.replace(/max-w-md w-full/g, 'max-w-md w-[95%] md:w-full mx-auto');
  content = content.replace(/max-w-3xl w-full/g, 'max-w-3xl w-[95%] md:w-full mx-auto');
  content = content.replace(/max-w-5xl w-full/g, 'max-w-5xl w-[95%] md:w-full mx-auto');
  content = content.replace(/max-w-lg w-full/g, 'max-w-lg w-[95%] md:w-full mx-auto');
  content = content.replace(/max-w-xl w-full/g, 'max-w-xl w-[95%] md:w-full mx-auto');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    modifiedFiles++;
    console.log(`Updated ${path.basename(filePath)}`);
  }
});

console.log(`Successfully updated ${modifiedFiles} files.`);
