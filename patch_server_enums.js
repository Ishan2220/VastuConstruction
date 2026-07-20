const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'server', 'src');

function patchFile(filePath, replacements) {
    const fullPath = path.join(baseDir, filePath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf-8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
}

// src/services/document.service.ts
patchFile('services/document.service.ts', [
    [/DocumentType,?\s*/g, ''] // Removes DocumentType import from Prisma
]);

// src/services/expense.service.ts
patchFile('services/expense.service.ts', [
    [/ExpenseType,?\s*/g, ''],
    [/PaymentMethod,?\s*/g, '']
]);

// src/services/income.service.ts
patchFile('services/income.service.ts', [
    [/PaymentMethod,?\s*/g, '']
]);

// src/services/labour.service.ts
patchFile('services/labour.service.ts', [
    [/PaymentMethod,?\s*/g, '']
]);

// src/services/lead.service.ts
patchFile('services/lead.service.ts', [
    [/Prisma\.EnumLeadSourceFilter/g, 'Prisma.StringFilter']
]);

// src/utils/normalizers.ts
patchFile('utils/normalizers.ts', [
    [/ExpenseType,?\s*/g, ''],
    [/PaymentMethod,?\s*/g, '']
]);

console.log("Successfully patched server files to remove enum dependencies.");
