import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = Router();

router.get('/summary', authenticate, dashboardController.getAdminDashboard);
router.get('/kpis', authenticate, dashboardController.getKPIs);
router.get('/stats', authenticate, dashboardController.getAdminDashboard);
router.get('/engineer-stats', authenticate, dashboardController.getEngineerDashboard);
router.get('/activities', authenticate, dashboardController.getTodayActivities);

export default router;
