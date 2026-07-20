const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'prisma', 'schema.prisma');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove the Enum definitions
const enumsToRemove = ['LeadSource', 'ExpenseType', 'PaymentMethod', 'DocumentType', 'MaterialUnit'];

enumsToRemove.forEach(enumName => {
    const regex = new RegExp(`enum ${enumName} \\{[^}]+\\}`, 'g');
    content = content.replace(regex, `// Removed ${enumName}`);
});

// 2. Change field types to String and update defaults
content = content.replace(/source\s+LeadSource\s+@default\(OTHER\)/g, 'source         String      @default("OTHER")');
content = content.replace(/type\s+ExpenseType/g, 'type          String');
content = content.replace(/paymentMethod\s+PaymentMethod/g, 'paymentMethod String');
content = content.replace(/type\s+DocumentType/g, 'type        String');
content = content.replace(/unit\s+MaterialUnit/g, 'unit      String');

// 3. Add CustomCategory model
const customCategoryModel = `
model CustomCategory {
  id        String   @id @default(uuid())
  type      String   // e.g., "EXPENSE_TYPE", "MATERIAL_UNIT", "PAYMENT_METHOD", "LEAD_SOURCE"
  value     String
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([type, value])
  @@map("custom_categories")
}
`;

content += customCategoryModel;

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully updated schema.prisma");
