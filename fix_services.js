const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'server', 'src', 'services');
const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
    const fullPath = path.join(servicesDir, file);
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Fix the syntax errors left by the regex
    content = content.replace(/:\s*string\s*\|\s*;/g, ': string;');
    content = content.replace(/type\?:\s*;/g, 'type?: string;');
    content = content.replace(/type:\s*;/g, 'type: string;');
    content = content.replace(/paymentMethod\?:\s*;/g, 'paymentMethod?: string;');
    content = content.replace(/paymentMethod:\s*;/g, 'paymentMethod: string;');
    content = content.replace(/unit\?:\s*;/g, 'unit?: string;');
    content = content.replace(/unit:\s*;/g, 'unit: string;');
    content = content.replace(/source\?:\s*;/g, 'source?: string;');
    content = content.replace(/source:\s*;/g, 'source: string;');
    
    // Fix normalizer import in expense.service.ts, etc.
    content = content.replace(/normalizenormalizecleanRelationId/g, 'normalizePaymentMethod, normalizeExpenseType, cleanRelationId');
    content = content.replace(/normalizenormalize/g, 'normalizePaymentMethod, normalizeExpenseType');
    
    // Replace old normalize() with specific normalizers if needed
    // In expense.service.ts
    content = content.replace(/type:\s*normalize\(data\.type\)/g, 'type: normalizeExpenseType(data.type)');
    content = content.replace(/paymentMethod:\s*normalize\(data\.paymentMethod\)/g, 'paymentMethod: normalizePaymentMethod(data.paymentMethod)');
    content = content.replace(/type:\s*normalize\(type\)/g, 'type: normalizeExpenseType(type)');

    fs.writeFileSync(fullPath, content, 'utf-8');
});

// Also fix normalizer calls in income.service.ts, labour.service.ts
const incomeServicePath = path.join(servicesDir, 'income.service.ts');
if (fs.existsSync(incomeServicePath)) {
    let content = fs.readFileSync(incomeServicePath, 'utf-8');
    content = content.replace(/import \{ normalize, cleanRelationId \} from '\.\.\/utils\/normalizers\.js';/g, "import { normalizePaymentMethod, cleanRelationId } from '../utils/normalizers.js';");
    content = content.replace(/paymentMethod:\s*normalize\(data\.paymentMethod\)/g, 'paymentMethod: normalizePaymentMethod(data.paymentMethod)');
    fs.writeFileSync(incomeServicePath, content, 'utf-8');
}

console.log("Successfully fixed syntax errors in services");
