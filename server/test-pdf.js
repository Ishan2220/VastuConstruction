import { generateInvoicePDF } from './src/utils/invoiceGenerator.js';
async function test() {
    try {
        await generateInvoicePDF({ id: '123', invoiceNumber: 'INV-123', items: [], subtotal: 100, taxAmount: 10, totalAmount: 110, date: new Date().toISOString() }, { name: 'Test Client', address: '123 Test St', city: 'Test City', state: 'TS', phone: '1234567890' }, './temp/test.pdf');
        console.log('PDF generated successfully');
    }
    catch (e) {
        console.error('PDF generation failed:', e);
    }
}
test();
