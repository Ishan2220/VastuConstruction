import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { getInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, archiveInvoice } from '../controllers/invoice.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getInvoices));
router.get('/:id', authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), asyncHandler(getInvoiceById));
router.post('/', authorize('ADMIN', 'ACCOUNTANT'), asyncHandler(createInvoice));
router.patch('/:id/status', authorize('ADMIN', 'ACCOUNTANT'), asyncHandler(updateInvoiceStatus));
router.delete('/:id/archive', authorize('ADMIN'), asyncHandler(archiveInvoice));

export default router;
