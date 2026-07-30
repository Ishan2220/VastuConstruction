/**
 * EventBus Coverage Validation
 * Verifies that all entity-mutating services properly emit EventBus events
 * Run: npx tsx tests/eventbus-coverage.test.ts
 * 
 * This is a STATIC ANALYSIS test - it reads service source files and checks
 * that each service that performs create/update/delete calls eventBus.publishMutation
 */

import fs from 'fs';
import path from 'path';

interface CoverageResult {
  service: string;
  hasMutations: boolean;
  hasEventBusImport: boolean;
  hasPublishMutation: boolean;
  mutationTypes: string[];
  covered: boolean;
}

const SERVICES_DIR = path.resolve(import.meta.dirname || '.', '../src/services');

// Services that are EXPECTED to emit events (they perform data mutations)
const MUTATION_SERVICES = [
  'expense.service.ts',
  'income.service.ts',
  'vendor.service.ts',
  'vendorPayment.service.ts',
  'lead.service.ts',
  'project.service.ts',
  'task.service.ts',
  'client.service.ts',
  'employee.service.ts',
  'attendance.service.ts',
  'siteMaterial.service.ts',
  'invoice.service.ts',
  'material.service.ts',
  'materialOrder.service.ts',
  'labour.service.ts',
];

// Services that are READ-ONLY or infrastructure (not expected to emit events)
const EXCLUDED_SERVICES = [
  'financial.service.ts',   // Read-only aggregations
  'dashboard.service.ts',   // Read-only dashboard queries
  'report.service.ts',      // Read-only reports
  'audit.service.ts',       // Called BY the EventBus, not a source of events
  'storage.service.ts',     // File storage helper
  'journal.service.ts',     // Called by other services for double-entry
  'auth.service.ts',        // Auth operations (login/logout/refresh)
  'user.service.ts',        // User management (separate from domain events)
  'settings.service.ts',    // System settings (config, not domain data)
  'file.service.ts',        // File management utility
  'notification.service.ts', // Notification delivery
  'calendar.service.ts',    // Calendar (read-heavy)
  'document.service.ts',    // Document metadata
  'bankAccount.service.ts', // Modified by journal entries, not directly
];

function analyzeService(filename: string): CoverageResult {
  const filepath = path.join(SERVICES_DIR, filename);
  let content: string;
  
  try {
    content = fs.readFileSync(filepath, 'utf-8');
  } catch {
    return {
      service: filename,
      hasMutations: false,
      hasEventBusImport: false,
      hasPublishMutation: false,
      mutationTypes: [],
      covered: false,
    };
  }

  const hasPrismaCreate = /prisma\.\w+\.create\(/.test(content);
  const hasPrismaUpdate = /prisma\.\w+\.update\(/.test(content);
  const hasPrismaDelete = /prisma\.\w+\.delete\(/.test(content);
  const hasPrismaUpsert = /prisma\.\w+\.upsert\(/.test(content);
  const hasMutations = hasPrismaCreate || hasPrismaUpdate || hasPrismaDelete || hasPrismaUpsert;

  const hasEventBusImport = /import.*eventBus/.test(content) || /from.*EventBus/.test(content);
  const hasPublishMutation = /eventBus\.publishMutation/.test(content);

  const mutationTypes: string[] = [];
  if (hasPrismaCreate) mutationTypes.push('CREATE');
  if (hasPrismaUpdate) mutationTypes.push('UPDATE');
  if (hasPrismaDelete) mutationTypes.push('DELETE');
  if (hasPrismaUpsert) mutationTypes.push('UPSERT');

  return {
    service: filename,
    hasMutations,
    hasEventBusImport,
    hasPublishMutation,
    mutationTypes,
    covered: !hasMutations || hasPublishMutation,
  };
}

(async () => {
  console.log('\n📡 ═══════════════════════════════════════════');
  console.log('   EventBus Coverage Validation');
  console.log('═══════════════════════════════════════════════\n');

  const results: CoverageResult[] = [];

  // Check mutation services
  console.log('🔍 Analyzing mutation services...\n');
  
  for (const service of MUTATION_SERVICES) {
    const result = analyzeService(service);
    results.push(result);
    
    const icon = result.covered ? '✅' : '❌';
    const mutations = result.mutationTypes.join(', ') || 'NONE';
    const eventBus = result.hasPublishMutation ? 'YES' : 'NO';
    
    console.log(`  ${icon} ${service}`);
    console.log(`     Mutations: [${mutations}] | EventBus: ${eventBus}`);
  }

  // Verify excluded services don't accidentally have untracked mutations
  console.log('\n🔍 Verifying excluded (read-only) services...\n');
  
  for (const service of EXCLUDED_SERVICES) {
    const result = analyzeService(service);
    if (result.hasMutations && !result.hasPublishMutation) {
      console.log(`  ⚠️  ${service} has mutations but no EventBus calls (expected for infrastructure)`);
    } else {
      console.log(`  ✓  ${service} — OK`);
    }
  }

  // Check SynchronizationEngine handles all event types
  console.log('\n🔍 Verifying SynchronizationEngine handler...\n');
  
  const syncEnginePath = path.resolve(SERVICES_DIR, '../events/SynchronizationEngine.ts');
  const syncContent = fs.readFileSync(syncEnginePath, 'utf-8');
  
  const hasAuditLog = /createAuditLog/.test(syncContent);
  const hasIdempotency = /checkIdempotency/.test(syncContent);
  const hasDeadLetter = /deadLetterQueue/.test(syncContent);
  const hasRetry = /retryAsync/.test(syncContent);
  
  console.log(`  ${hasAuditLog ? '✅' : '❌'} Audit logging in handler`);
  console.log(`  ${hasIdempotency ? '✅' : '❌'} Idempotency check`);
  console.log(`  ${hasDeadLetter ? '✅' : '❌'} Dead letter queue for failures`);
  console.log(`  ${hasRetry ? '✅' : '❌'} Retry mechanism`);

  // Summary
  const covered = results.filter(r => r.covered).length;
  const uncovered = results.filter(r => !r.covered).length;
  const total = results.length;

  console.log('\n═══════════════════════════════════════════════');
  console.log('   COVERAGE SUMMARY');
  console.log('═══════════════════════════════════════════════\n');
  console.log(`  📊 Mutation Services: ${total}`);
  console.log(`  ✅ Covered by EventBus: ${covered}`);
  console.log(`  ❌ Missing EventBus calls: ${uncovered}`);
  console.log(`  📡 SyncEngine Features: Audit=${hasAuditLog} | Idempotency=${hasIdempotency} | DLQ=${hasDeadLetter} | Retry=${hasRetry}`);

  if (uncovered > 0) {
    console.log('\n  🚨 EVENTBUS COVERAGE INCOMPLETE — Some services do not emit events!');
    console.log('     Missing services:');
    for (const r of results.filter(r => !r.covered)) {
      console.log(`       - ${r.service} (${r.mutationTypes.join(', ')})`);
    }
    console.log('');
    process.exit(1);
  } else {
    console.log('\n  🎉 EVENTBUS COVERAGE COMPLETE — All mutation services emit events!\n');
    process.exit(0);
  }
})();
