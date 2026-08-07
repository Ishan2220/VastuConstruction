import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, deleteInvoice, downloadInvoicePDF } from '../controllers/invoice.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getInvoices));
router.get('/:id', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getInvoiceById));
router.get('/:id/pdf', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(downloadInvoicePDF));
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), asyncHandler(createInvoice));
router.patch('/:id/status', authorize('ADMIN', 'ACCOUNTANT'), asyncHandler(updateInvoiceStatus));
router.delete('/:id', authorize('ADMIN'), asyncHandler(deleteInvoice));

export default router;
