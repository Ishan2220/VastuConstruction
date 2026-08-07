import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateLeadInvoicePDF = async (
  leadData: any,
  paymentData: any,
  outputPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // --- Letterhead ---
      const brownColor = '#8B5A2B';
      
      // Vertical line
      doc
        .moveTo(40, 0)
        .lineTo(40, doc.page.height)
        .lineWidth(1)
        .strokeColor(brownColor)
        .stroke();

      // Left side: Company Name
      const leftX = 60;
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('black')
        .text('VASTU', leftX, 40, { characterSpacing: 4 })
        .text('CONSTRUCTION', leftX, 65, { characterSpacing: 2 });
      
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .text('ENGINEERS, CONSULTANT', leftX, 95, { characterSpacing: 1.5 })
        .text('INTERIOR DESIGNERS &', leftX, 107, { characterSpacing: 1.5 })
        .text('CONTRACTORS', leftX, 119, { characterSpacing: 1.5 });

      // Right side: Owner info & Contact
      const rightX = 320;
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('ER. SANDIP JADHAV', rightX, 40, { characterSpacing: 1.5 });
      
      doc
        .font('Helvetica')
        .fontSize(7)
        .text('(B.E. CIVIL, MBA FINANCE, GOVT.REG. ENGINEER)', rightX, 58);

      const textX = rightX + 15;
      
      doc
        .fontSize(9)
        .text('+91 9604459628, 9373363654,', textX, 75)
        .text('9579785510', textX, 87)
        .text('vastuconstructionich@gmail.com', textX, 102)
        .text('Near Ram Mandir, Sakharpe Hospital Area', textX, 117)
        .text('Ichalkaranji. 416115', textX, 129);

      const iconsDir = path.join(__dirname, '../assets/icons');
      const iconSize = 10;
      const iconX = rightX + 5;

      doc.image(path.join(iconsDir, 'phone.png'), iconX - iconSize/2, 76, { width: iconSize, height: iconSize });
      doc.image(path.join(iconsDir, 'envelope.png'), iconX - iconSize/2, 101, { width: iconSize, height: iconSize });
      doc.image(path.join(iconsDir, 'pin.png'), iconX - iconSize/2, 116, { width: iconSize, height: iconSize });

      // Horizontal line
      doc
        .moveTo(40, 150)
        .lineTo(545, 150)
        .lineWidth(1)
        .strokeColor(brownColor)
        .stroke();

      // --- Invoice Title ---
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('black')
        .text('PAYMENT RECEIPT / INVOICE', 50, 180, { align: 'center', underline: true });

      // --- Client Details ---
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Billed To:', 50, 220);
        
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(`Name: ${leadData.name || 'N/A'}`, 50, 240)
        .text(`Phone: ${leadData.phone || 'N/A'}`, 50, 255)
        .text(`Email: ${leadData.email || 'N/A'}`, 50, 270)
        .text(`Address: ${leadData.address || 'N/A'}`, 50, 285);

      // --- Invoice Details ---
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Receipt Details:', 350, 220);
        
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(`Date: ${new Date(paymentData.paymentDate).toLocaleDateString()}`, 350, 240)
        .text(`Receipt No: ${paymentData.id.slice(-6).toUpperCase()}`, 350, 255)
        .text(`Payment Mode: ${paymentData.paymentMethod || 'N/A'}`, 350, 270);

      // --- Table Header ---
      let y = 330;
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Description', 50, y)
        .text('Amount (Rs)', 400, y, { width: 145, align: 'right' });
        
      doc
        .moveTo(50, y + 20)
        .lineTo(545, y + 20)
        .lineWidth(1)
        .strokeColor('black')
        .stroke();

      // --- Table Row ---
      y += 30;
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(`Payment received for: ${leadData.requirement || 'Services rendered'}`, 50, y, { width: 300 })
        .text(`${Number(paymentData.amount).toFixed(2)} /-`, 400, y, { width: 145, align: 'right' });
        
      if (paymentData.notes) {
        y += 20;
        doc.text(`Notes: ${paymentData.notes}`, 50, y, { width: 300 });
      }

      // --- Totals ---
      y += 50;
      doc
        .moveTo(350, y)
        .lineTo(545, y)
        .stroke();
        
      y += 10;
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Total Received:', 300, y)
        .text(`${Number(paymentData.amount).toFixed(2)} /-`, 400, y, { width: 145, align: 'right' });

      // --- Footer ---
      doc
        .font('Helvetica')
        .fontSize(10)
        .text('Thank you for your business.', 50, 650, { align: 'center' });
        
      doc
        .font('Helvetica-Bold')
        .text('For Vastu Construction,', 400, 700, { align: 'right' })
        .text('Authorized Signatory', 400, 750, { align: 'right' });

      doc.end();

      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

function drawFooter(doc: PDFKit.PDFDocument, brownColor: string) {
  // Prevent PDFKit's auto page-break: it treats text near the
  // bottom margin as overflow and silently adds a new page.
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  const footerY = doc.page.height - 40;
  doc.rect(0, footerY, doc.page.width, 40).fill(brownColor);
  doc.fillColor('white').font('Helvetica').fontSize(9);

  const colWidth = doc.page.width / 3;
  const textY = footerY + 16;

  const webIconX = colWidth / 2 - 75;
  doc.circle(webIconX + 4, textY + 4, 4).lineWidth(1).strokeColor('white').stroke();
  doc.fillColor('white').text('Website : www.Vastuconstructions.com', webIconX + 12, textY, { lineBreak: false });

  const fbIconX = colWidth + (colWidth / 2) - 60;
  doc.circle(fbIconX + 4, textY + 4, 4).fillAndStroke('white', 'white');
  doc.fillColor(brownColor).font('Helvetica-Bold').text('f', fbIconX + 2.5, textY + 1, { lineBreak: false });
  doc.fillColor('white').font('Helvetica').text('Vastu Construction', fbIconX + 12, textY, { lineBreak: false });

  const igIconX = 2 * colWidth + (colWidth / 2) - 55;
  doc.rect(igIconX, textY, 8, 8).lineWidth(1).strokeColor('white').stroke();
  doc.circle(igIconX + 4, textY + 4, 2).stroke();
  doc.fillColor('white').text('vastu_construction_1', igIconX + 12, textY, { lineBreak: false });

  doc.page.margins.bottom = originalBottomMargin; // restore for the rest of the doc
}

export const generateInvoicePDF = async (
  invoiceData: any,
  entityData: any,
  outputPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a document with 0 bottom margin so the footer can touch the bottom easily,
      // but keep normal margins for top, left, right.
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      const brownColor = '#B18654';

      // --- Header ---
      // Vertical line on far-left
      doc
        .moveTo(40, 0)
        .lineTo(40, 160)
        .lineWidth(1)
        .strokeColor(brownColor)
        .stroke();

      // Left column: Company name
      const leftX = 60;
      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('black')
        .text('VASTU', leftX, 40, { characterSpacing: 4 })
        .text('CONSTRUCTION', leftX, 65, { characterSpacing: 2 });
      
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .text('ENGINEERS, CONSULTANT', leftX, 95, { characterSpacing: 1.5 })
        .text('INTERIOR DESIGNERS &', leftX, 107, { characterSpacing: 1.5 })
        .text('CONTRACTORS', leftX, 119, { characterSpacing: 1.5 });

      // Right column, right-aligned: Contact person
      const rightX = 320;
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('ER. SANDIP JADHAV', rightX, 40, { characterSpacing: 1.5 });
      
      doc
        .font('Helvetica')
        .fillColor('gray')
        .fontSize(7)
        .text('(B.E. CIVIL, MBA FINANCE, GOVT.REG. ENGINEER)', rightX, 58);

      const iconX = rightX + 5;
      const textX = rightX + 18;
      
      doc.fillColor('black');
      
      doc
        .fontSize(9)
        .text('+91 9604459628, 9373363654,', textX, 75)
        .text('9579785510', textX, 87)
        .text('vastuconstructionich@gmail.com', textX, 102)
        .text('Near Ram Mandir, Sakharpe Hospital Area', textX, 117)
        .text('Ichalkaranji. 416115', textX, 129);

      const iconsDir = path.join(__dirname, '../assets/icons');
      const iconSize = 10;

      doc.image(path.join(iconsDir, 'phone.png'), iconX - iconSize/2, 76, { width: iconSize, height: iconSize });
      doc.image(path.join(iconsDir, 'envelope.png'), iconX - iconSize/2, 101, { width: iconSize, height: iconSize });
      doc.image(path.join(iconsDir, 'pin.png'), iconX - iconSize/2, 116, { width: iconSize, height: iconSize });

      // Solid horizontal divider (1px, dark gray/black) below both columns
      doc
        .moveTo(40, 160)
        .lineTo(545, 160)
        .lineWidth(1)
        .strokeColor('black')
        .stroke();

      // --- Body ---
      let y = 190;
      
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('black')
        .text('INVOICE', 0, y, { align: 'center', underline: true });
        
      y += 40;
      
      // Invoice # and Date on one line
      const invoiceNo = invoiceData.invoiceNumber || 'INV-001';
      const issueDate = invoiceData.issueDate ? new Date(invoiceData.issueDate).toLocaleDateString() : new Date().toLocaleDateString();
      
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(`Invoice #: ${invoiceNo}`, 50, y)
        .text(`Date: ${issueDate}`, 350, y, { align: 'right' });
        
      y += 30;
      
      // Bill To client block
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Bill To:', 50, y);
      
      y += 20;
      doc
        .font('Helvetica')
        .fontSize(11)
        .text(`Name: ${entityData?.name || 'N/A'}`, 50, y)
        .text(`Phone: ${entityData?.phone || 'N/A'}`, 50, y + 15)
        .text(`Address: ${entityData?.address || entityData?.city || 'N/A'}`, 50, y + 30);
        
      y += 60;
      
      // Line-item table: Description | Qty | Rate | Amount
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('Description', 50, y)
        .text('Qty', 350, y, { width: 40, align: 'right' })
        .text('Rate', 400, y, { width: 60, align: 'right' })
        .text('Amount', 470, y, { width: 75, align: 'right' });
        
      y += 15;
      doc
        .moveTo(50, y)
        .lineTo(545, y)
        .lineWidth(1)
        .strokeColor('black')
        .stroke();
        
      y += 15;
      
      const items = invoiceData.items || [];
      doc.font('Helvetica').fontSize(10);
      
      if (items.length === 0) {
        if (y > doc.page.height - 90) {
          doc.addPage();
          y = 50;
        }
        doc.text('Services Rendered', 50, y);
        doc.text('1', 350, y, { width: 40, align: 'right' });
        doc.text(Number(invoiceData.subtotal || 0).toFixed(2), 400, y, { width: 60, align: 'right' });
        doc.text(Number(invoiceData.subtotal || 0).toFixed(2), 470, y, { width: 75, align: 'right' });
        y += 20;
      } else {
        items.forEach((item: any) => {
          if (y > doc.page.height - 90) {
            doc.addPage();
            y = 50;
          }
          doc.text(item.description || 'Item', 50, y, { width: 280 });
          doc.text(Number(item.quantity || 1).toString(), 350, y, { width: 40, align: 'right' });
          doc.text(Number(item.rate || 0).toFixed(2), 400, y, { width: 60, align: 'right' });
          doc.text(Number(item.amount || 0).toFixed(2), 470, y, { width: 75, align: 'right' });
          y += 20;
        });
      }
      
      y += 10;
      doc
        .moveTo(350, y)
        .lineTo(545, y)
        .lineWidth(1)
        .strokeColor('gray')
        .stroke();
        
      y += 15;
      
      // Totals block (Subtotal, Tax, Grand Total) right-aligned, bold final line
      const subtotal = Number(invoiceData.subtotal || 0);
      const taxAmount = Number(invoiceData.taxAmount || 0);
      const grandTotal = Number(invoiceData.totalAmount || 0);
      
      doc
        .font('Helvetica')
        .fontSize(10)
        .text('Subtotal:', 350, y, { width: 100, align: 'right' })
        .text(subtotal.toFixed(2), 470, y, { width: 75, align: 'right' });
        
      y += 20;
      doc
        .text('Tax:', 350, y, { width: 100, align: 'right' })
        .text(taxAmount.toFixed(2), 470, y, { width: 75, align: 'right' });
        
      y += 20;
      doc
        .moveTo(420, y - 5)
        .lineTo(545, y - 5)
        .lineWidth(1)
        .strokeColor('black')
        .stroke();
        
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Grand Total:', 350, y, { width: 100, align: 'right' })
        .text(grandTotal.toFixed(2), 470, y, { width: 75, align: 'right' });

      // After ALL content is drawn (including totals), loop back and stamp
      // the footer + vertical line on every page that got created
      const pageRange = doc.bufferedPageRange();
      for (let i = 0; i < pageRange.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, brownColor);
        
        // Ensure vertical line is on all pages
        if (i > 0) {
          doc
            .moveTo(40, 0)
            .lineTo(40, doc.page.height)
            .lineWidth(1)
            .strokeColor(brownColor)
            .stroke();
        }
      }

      doc.end();

      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};
