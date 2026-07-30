const fs = require('fs');
const path = require('path');

const files = [
  'ExpensesPage.tsx',
  'IncomePage.tsx',
  'InvoicesPage.tsx',
  'MaterialsPage.tsx',
  'PurchaseOrdersPage.tsx',
  'VendorPaymentModal.tsx'
];

const basePath = path.join('d:', 'VastuConstruction', 'client', 'src', 'pages');

files.forEach(file => {
  const filePath = path.join(basePath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /<option value="NONE">No GST<\/option>/g, 
    `{!settings?.gstMandatory && <option value="NONE">No GST</option>}`
  );
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
