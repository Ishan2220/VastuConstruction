import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import fs from 'fs';
import path from 'path';

export const exportAuditLogs = async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000 // Limit for CSV export
    });

    if (logs.length === 0) {
      return res.status(200).send('No logs available');
    }

    const headers = 'ID,User ID,Action,Entity,Entity ID,IP Address,Created At\n';
    const rows = logs.map((l: any) => 
      `${l.id},${l.userId || 'System'},${l.action},${l.entity},${l.entityId},${l.ipAddress || ''},${l.createdAt.toISOString()}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-export.csv');
    res.status(200).send(headers + rows);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
};

export const cleanupStorage = async (_req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.status(200).json({ success: true, message: 'No uploads directory found' });
    }

    const physicalFiles = fs.readdirSync(uploadsDir);
    const dbFiles = await prisma.file.findMany({
      select: { storedFileName: true }
    });

    const dbFileNames = dbFiles.map((f: any) => f.storedFileName);

    const orphans = physicalFiles.filter((pf: string) => !dbFileNames.includes(pf));
    
    // In a real environment, we would delete these files:
    // orphans.forEach(f => fs.unlinkSync(path.join(uploadsDir, f)));

    res.status(200).json({
      success: true,
      data: {
        totalPhysicalFiles: physicalFiles.length,
        totalDbFiles: dbFileNames.length,
        orphansFound: orphans.length,
        actionTaken: 'Simulated deletion'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Cleanup failed' });
  }
};
