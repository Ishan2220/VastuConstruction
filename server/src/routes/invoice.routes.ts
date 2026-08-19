import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, deleteInvoice, downloadInvoicePDF } from '../controllers/invoice.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getInvoices));
router.get('/:id', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getInvoiceById));
router.get('/:id/pdf', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(downloadInvoicePDF));
router.post('/', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(createInvoice));
router.patch('/:id/status', authorize('ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(updateInvoiceStatus));
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), asyncHandler(deleteInvoice));

export default router;
