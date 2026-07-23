import { Router } from 'express';
import { getVersioning, getHealthScore } from '../controllers/release.controller.js';
import { checkConsistency } from '../controllers/consistency.controller.js';
import { exportAuditLogs, cleanupStorage } from '../controllers/maintenance.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

// Release & Health (Open or admin only)
router.get('/versioning', getVersioning);
router.get('/health-score', getHealthScore);

// Maintenance & Diagnostics (Admin only)
router.use(authenticate, authorize('ADMIN', { page: 'Settings' }));
router.get('/consistency', checkConsistency);
router.get('/audit-logs/export', exportAuditLogs);
router.post('/storage-cleanup', cleanupStorage);

export default router;
