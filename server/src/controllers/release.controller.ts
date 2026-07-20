import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import os from 'os';

export const getVersioning = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      applicationVersion: '1.0.0-rc',
      databaseSchemaVersion: '1.0.0',
      migrationVersion: '20260719',
      gitCommitHash: process.env.GIT_COMMIT_HASH || 'unknown',
      buildTimestamp: process.env.BUILD_TIMESTAMP || new Date().toISOString(),
      releaseDate: '2026-07-19',
      environment: process.env.NODE_ENV || 'development'
    }
  });
};

export const getHealthScore = async (_req: Request, res: Response) => {
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsagePct = ((totalMem - freeMem) / totalMem) * 100;

    let score = 100;
    
    if (dbLatency > 1000) score -= 20;
    if (memUsagePct > 90) score -= 20;
    else if (memUsagePct > 80) score -= 10;

    let status = 'Healthy';
    if (score < 50) status = 'Critical';
    else if (score < 80) status = 'Warning';

    res.status(200).json({
      success: true,
      data: {
        score,
        status,
        metrics: {
          dbLatencyMs: dbLatency,
          memoryUsagePct: Math.round(memUsagePct),
          cpuLoad: os.loadavg(),
          uptimeSeconds: process.uptime()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        score: 0,
        status: 'Critical',
        error: error instanceof Error ? error.message : 'Unknown health check failure'
      }
    });
  }
};
