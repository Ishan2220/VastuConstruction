/**
 * Performance & Bundle Validation
 * Verifies bundle sizes, lazy loading, and chunk splitting
 * Run: npx tsx tests/performance-validation.test.ts
 */

import fs from 'fs';
import path from 'path';

interface ChunkInfo {
  name: string;
  sizeKB: number;
  gzipKB: number | null;
  type: 'js' | 'css' | 'html' | 'other';
}

const DIST_DIR = path.resolve(import.meta.dirname || '.', '../../client/dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

const MAX_INITIAL_CHUNK_KB = 300;
const MAX_TOTAL_JS_KB = 3000;
const EXPECTED_CHUNKS = ['vendor', 'ui', 'charts', 'query', 'modules'];

function getFileSizeKB(filepath: string): number {
  const stats = fs.statSync(filepath);
  return Math.round((stats.size / 1024) * 100) / 100;
}

function analyzeBundle(): ChunkInfo[] {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('  ⚠️  dist/assets not found. Run `npm run build` in client first.\n');
    return [];
  }

  const files = fs.readdirSync(ASSETS_DIR);
  const chunks: ChunkInfo[] = [];

  for (const file of files) {
    const filepath = path.join(ASSETS_DIR, file);
    const sizeKB = getFileSizeKB(filepath);
    const ext = path.extname(file).slice(1);
    const type = ext === 'js' ? 'js' : ext === 'css' ? 'css' : ext === 'html' ? 'html' : 'other';
    
    chunks.push({
      name: file,
      sizeKB,
      gzipKB: null, // Would need gzip to calculate
      type,
    });
  }

  return chunks.sort((a, b) => b.sizeKB - a.sizeKB);
}

(async () => {
  console.log('\n⚡ ═══════════════════════════════════════════');
  console.log('   Performance & Bundle Validation');
  console.log('═══════════════════════════════════════════════\n');

  let allPassed = true;

  // ── 1. Bundle Size Analysis ──
  console.log('📦 Phase 1: Bundle Size Analysis\n');
  
  const chunks = analyzeBundle();
  
  if (chunks.length === 0) {
    console.log('  ❌ No bundle found. Build the client first.\n');
    allPassed = false;
  } else {
    const jsChunks = chunks.filter(c => c.type === 'js');
    const cssChunks = chunks.filter(c => c.type === 'css');
    
    console.log('  JavaScript Chunks:');
    for (const chunk of jsChunks) {
      const warning = chunk.sizeKB > 500 ? ' ⚠️  LARGE' : '';
      console.log(`    ${chunk.sizeKB.toString().padStart(10)} KB  ${chunk.name}${warning}`);
    }
    
    console.log('\n  CSS Chunks:');
    for (const chunk of cssChunks) {
      console.log(`    ${chunk.sizeKB.toString().padStart(10)} KB  ${chunk.name}`);
    }
    
    const totalJS = jsChunks.reduce((sum, c) => sum + c.sizeKB, 0);
    const totalCSS = cssChunks.reduce((sum, c) => sum + c.sizeKB, 0);
    
    console.log(`\n  📊 Total JS: ${totalJS.toFixed(1)} KB | Total CSS: ${totalCSS.toFixed(1)} KB`);
    
    // Check initial chunk size (index-*.js is the entry point)
    const initialChunk = jsChunks.find(c => c.name.startsWith('index-'));
    if (initialChunk) {
      const passed = initialChunk.sizeKB < MAX_INITIAL_CHUNK_KB;
      console.log(`  ${passed ? '✅' : '❌'} Initial chunk: ${initialChunk.sizeKB} KB (limit: ${MAX_INITIAL_CHUNK_KB} KB)`);
      if (!passed) allPassed = false;
    }
    
    // Check total JS size
    const totalPassed = totalJS < MAX_TOTAL_JS_KB;
    console.log(`  ${totalPassed ? '✅' : '❌'} Total JS bundle: ${totalJS.toFixed(1)} KB (limit: ${MAX_TOTAL_JS_KB} KB)`);
    if (!totalPassed) allPassed = false;
  }

  // ── 2. Chunk Splitting Verification ──
  console.log('\n📦 Phase 2: Chunk Splitting Verification\n');
  
  for (const expectedChunk of EXPECTED_CHUNKS) {
    const found = chunks.some(c => c.name.includes(expectedChunk));
    console.log(`  ${found ? '✅' : '❌'} Chunk "${expectedChunk}" ${found ? 'found' : 'MISSING'}`);
    if (!found) allPassed = false;
  }

  // ── 3. Lazy Loading Verification ──
  console.log('\n📦 Phase 3: Lazy Loading Verification\n');
  
  const appTsxPath = path.resolve(import.meta.dirname || '.', '../../client/src/App.tsx');
  if (fs.existsSync(appTsxPath)) {
    const appContent = fs.readFileSync(appTsxPath, 'utf-8');
    
    const hasReactLazy = /React\.lazy|lazy\(/.test(appContent);
    const hasSuspense = /Suspense/.test(appContent);
    const lazyImportCount = (appContent.match(/lazy\(\(\) =>/g) || []).length;
    
    console.log(`  ${hasReactLazy ? '✅' : '❌'} React.lazy imports: ${hasReactLazy ? 'YES' : 'NO'}`);
    console.log(`  ${hasSuspense ? '✅' : '❌'} Suspense wrapper: ${hasSuspense ? 'YES' : 'NO'}`);
    console.log(`  📊 Lazy-loaded pages: ${lazyImportCount}`);
    
    if (!hasReactLazy || !hasSuspense) allPassed = false;
    
    // Count how many pages are lazy-loaded vs static
    const staticImportCount = (appContent.match(/^import \w+ from '@\/pages\//gm) || []).length;
    if (staticImportCount > 0) {
      console.log(`  ⚠️  ${staticImportCount} pages are still statically imported`);
    }
  } else {
    console.log('  ❌ App.tsx not found\n');
    allPassed = false;
  }

  // ── 4. Page Chunk Verification ──
  console.log('\n📦 Phase 4: Per-Page Code Splitting\n');
  
  const expectedPages = [
    'DashboardPage', 'LeadsPage', 'ProjectsPage', 'ExpensesPage',
    'IncomePage', 'VendorsPage', 'InvoicesPage', 'TasksPage',
    'EmployeesPage', 'MaterialsPage', 'AttendancePage', 'LoginPage',
  ];
  
  let pagesFound = 0;
  for (const page of expectedPages) {
    const found = chunks.some(c => c.name.includes(page));
    if (found) pagesFound++;
    console.log(`  ${found ? '✅' : '⚠️ '} ${page} chunk: ${found ? 'split' : 'bundled'}`);
  }
  
  console.log(`\n  📊 ${pagesFound}/${expectedPages.length} pages independently chunked`);

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════');
  console.log('   PERFORMANCE SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  
  if (allPassed) {
    console.log('  🎉 PERFORMANCE VALIDATION PASSED!\n');
    process.exit(0);
  } else {
    console.log('  🚨 PERFORMANCE VALIDATION HAS WARNINGS — Review above.\n');
    process.exit(1);
  }
})();
