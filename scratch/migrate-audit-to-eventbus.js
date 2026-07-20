const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = path.join(__dirname, '..', 'server', 'src', 'services');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    if (!content.includes('createAuditLog')) return;
    if (file === 'audit.service.ts' || file === 'journal.service.ts') return;
    
    // Add eventBus import if missing
    if (!content.includes("import { eventBus } from '../events/EventBus.js';")) {
        content = content.replace(/import \{ createAuditLog \} from '\.\/audit\.service\.js';/g, "import { eventBus } from '../events/EventBus.js';");
        // in case the import is slightly different
        content = content.replace(/import \{ createAuditLog \} from '\.\.\/services\/audit\.service\.js';/g, "import { eventBus } from '../events/EventBus.js';");
    }

    // Replace createAuditLog calls with eventBus.publishMutation
    // Signature of createAuditLog: createAuditLog(userId, action, entityType, entityId, oldData, newData)
    // Signature of eventBus.publishMutation: publishMutation(entityType, action, userId, entityId, idempotencyKey, data, oldData)
    
    // We will find all `await createAuditLog(` and capture the arguments
    content = content.replace(/await\s+createAuditLog\(([^,]+),\s*'([^']+)',\s*'([^']+)',\s*([^,]+),\s*([^,]+),\s*([^)]+)\);/g, (match, userId, action, entityType, entityId, oldData, newData) => {
        return `eventBus.publishMutation('${entityType}', '${action}', ${userId}, ${entityId}, (arguments[0] as any)?.idempotencyKey || require('crypto').randomUUID(), ${newData}, ${oldData});`;
    });

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Migrated', file);
});
