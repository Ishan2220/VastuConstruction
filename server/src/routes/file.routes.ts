import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import * as fileController from '../controllers/file.controller.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Sanitize filename to prevent path traversal
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `raw_${uniqueSuffix}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: env.FMS_MAX_UPLOAD_SIZE },
});

// Routes
router.post('/upload', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), upload.single('file'), fileController.uploadFile);
router.get('/', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), fileController.getFiles);
router.get('/:id/download', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), fileController.getFileDownloadUrl);
router.delete('/:id', authenticate, authorize('ADMIN', 'ACCOUNTANT', 'ENGINEER'), fileController.softDeleteFile);
router.get('/dashboard/stats', authenticate, authorize('ADMIN'), fileController.getStorageDashboardStats);

export default router;
