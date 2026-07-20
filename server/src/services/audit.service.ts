import { prisma } from '../config/database.js';

export const createAuditLog = async (
  userId: string | null,
  action: string,
  entity: string,
  entityId: string,
  oldData?: unknown,
  newData?: unknown,
  ipAddress?: string
) => {
  // Compute changed fields by comparing old and new data
  const changedFields: string[] = [];
  if (oldData && newData && typeof oldData === 'object' && typeof newData === 'object') {
    const oldObj = oldData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;
    for (const key of Object.keys(newObj)) {
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changedFields.push(key);
      }
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldData: oldData ? (oldData as object) : undefined,
        newData: newData ? (newData as object) : undefined,
        changedFields,
        ipAddress,
      },
    });
  } catch (error) {
    // Don't throw - audit log failure shouldn't break the main operation
    console.error('Failed to create audit log:', error);
  }
};
