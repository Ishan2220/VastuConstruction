import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { prisma } from '../index.js';

const router = Router();

router.post('/reset-finances', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // Soft delete incomes and expenses
    await prisma.income.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });
    await prisma.expense.updateMany({ data: { deletedAt: new Date() }, where: { deletedAt: null } });

    // Hard delete payments that don't have soft delete
    await prisma.vendorPayment.deleteMany({});
    await prisma.labourPayment.deleteMany({});
    await prisma.salaryPayment.deleteMany({});
    await prisma.journalLine.deleteMany({});
    await prisma.journalEntry.deleteMany({});

    res.json({ success: true, message: 'Financial records have been successfully reset.' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset financial records.' });
  }
});

export default router;
