import { createAuditLog } from '../services/audit.service.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export class SynchronizationEngine {
  /**
   * Durable Idempotency Check: Ensures that an event with the same ID isn't processed twice across server restarts.
   */
  private static async checkIdempotency(idempotencyKey: string, eventType: string): Promise<boolean> {
    try {
      const existing = await prisma.eventIdempotency.findUnique({
        where: { idempotencyKey }
      });
      if (existing) {
        logger.info(`[SyncEngine] Ignored duplicate event: ${idempotencyKey}`);
        return false;
      }
      await prisma.eventIdempotency.create({
        data: {
          idempotencyKey,
          eventType,
        }
      });
      return true;
    } catch (e) {
      // If concurrent insert fails due to unique constraint, it's a duplicate.
      logger.info(`[SyncEngine] Concurrent duplicate event blocked: ${idempotencyKey}`);
      return false;
    }
  }

  /**
   * Universal Retry Wrapper for Non-Critical Side Effects
   */
  private static async retryAsync(fn: () => Promise<void>, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await fn();
        return;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((res) => setTimeout(res, 1000 * (i + 1))); // Simple backoff
      }
    }
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  private static async executeSideEffects(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    payload: { idempotencyKey: string; entityId: string; userId: string; oldData?: any; data?: any }
  ) {
    await this.retryAsync(async () => {
      // Audit Logging (Centralized)
      await createAuditLog(payload.userId, action, entityType, payload.entityId, payload.oldData, payload.data);
    }, 3);
  }

  public static async handleEntityMutation(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    payload: { idempotencyKey: string; entityId: string; userId: string; oldData?: any; data?: any }
  ) {
    const eventType = `${action}_${entityType}`;
    
    // 1. Check Idempotency
    if (!(await this.checkIdempotency(payload.idempotencyKey, eventType))) return;

    try {
      await this.executeSideEffects(action, entityType, payload);
    } catch (e: any) {
      console.error(`[SyncEngine] Failed to process ${eventType} (Key: ${payload.idempotencyKey}):`, e);
      
      // Send to Dead Letter Queue
      try {
        await prisma.deadLetterQueue.create({
          data: {
            eventType,
            payload: JSON.parse(JSON.stringify(payload)), // ensure serializable
            errorReason: e.message || 'Unknown Error',
            retryCount: 3
          }
        });
      } catch (dlqError) {
        console.error(`[CRITICAL] Failed to write to Dead Letter Queue!`, dlqError);
      }
    }
  }

  public static async replayDeadLetterQueue() {
    const failedEvents = await prisma.deadLetterQueue.findMany({
      where: { isResolved: false },
      orderBy: { createdAt: 'asc' },
      take: 100 // Process in batches
    });

    let successCount = 0;
    let failCount = 0;

    for (const event of failedEvents) {
      try {
        const payload = event.payload as any;
        const [action, ...entityTypeParts] = event.eventType.split('_');
        const entityType = entityTypeParts.join('_');
        
        await this.executeSideEffects(action as any, entityType, payload);
        
        await prisma.deadLetterQueue.update({
          where: { id: event.id },
          data: { isResolved: true }
        });
        successCount++;
      } catch (e: any) {
        await prisma.deadLetterQueue.update({
          where: { id: event.id },
          data: { 
            retryCount: event.retryCount + 1,
            errorReason: `Replay failed: ${e.message}`
          }
        });
        failCount++;
      }
    }

    return { processed: failedEvents.length, success: successCount, failed: failCount };
  }
}
