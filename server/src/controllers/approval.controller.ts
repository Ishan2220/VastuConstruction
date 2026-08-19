import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../utils/ApiResponse.js';

const prisma = new PrismaClient();

export const getApprovalRequests = async (req: Request, res: Response) => {
  const { status, entityType } = req.query;

  const whereClause: any = {};
  if (status) whereClause.status = status;
  if (entityType) whereClause.entityType = entityType;

  const requests = await prisma.approvalRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true } },
      steps: {
        include: {
          approver: { select: { id: true, name: true } }
        },
        orderBy: { stepOrder: 'asc' }
      }
    }
  });

  res.json(new ApiResponse(200, requests, 'Approval requests retrieved successfully'));
};

export const createApprovalRequest = async (req: Request, res: Response) => {
  const { entityType, entityId, amount, description, approverIds } = req.body;
  const userId = (req as any).user.id;

  const request = await prisma.approvalRequest.create({
    data: {
      entityType,
      entityId,
      requesterId: userId,
      amount,
      description,
      status: 'SUBMITTED',
      steps: {
        create: approverIds.map((approverId: string, index: number) => ({
          approverId,
          stepOrder: index + 1,
          status: 'PENDING'
        }))
      }
    }
  });

  res.status(201).json(new ApiResponse(201, request, 'Approval request submitted successfully'));
};

export const actionApprovalStep = async (req: Request, res: Response) => {
  const { stepId } = req.params;
  const { status, remarks } = req.body; // APPROVED or REJECTED
  const userId = (req as any).user.id;

  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId as string },
    include: { approvalRequest: true }
  });

  if (!step) {
    return res.status(404).json(new ApiResponse(404, null, 'Approval step not found'));
  }

  if (step.approverId !== userId) {
    return res.status(403).json(new ApiResponse(403, null, 'Not authorized to action this step'));
  }

  // Update this step
  await prisma.approvalStep.update({
    where: { id: stepId as string },
    data: {
      status,
      remarks,
      actionDate: new Date()
    }
  });

  // Evaluate overall request status
  const allSteps = await prisma.approvalStep.findMany({
    where: { approvalRequestId: step.approvalRequestId }
  });

  const anyRejected = allSteps.some(s => s.id === stepId ? status === 'REJECTED' : s.status === 'REJECTED');
  const allApproved = allSteps.every(s => s.id === stepId ? status === 'APPROVED' : s.status === 'APPROVED');

  let overallStatus = step.approvalRequest.status;
  if (anyRejected) {
    overallStatus = 'REJECTED';
  } else if (allApproved) {
    overallStatus = 'APPROVED';
  }

  if (overallStatus !== step.approvalRequest.status) {
    await prisma.approvalRequest.update({
      where: { id: step.approvalRequestId },
      data: { status: overallStatus }
    });
    
    // Post to Activity Feed
    await prisma.businessActivity.create({
      data: {
        action: overallStatus,
        module: 'OTHER',
        description: `Approval Request for ${step.approvalRequest.entityType} was ${overallStatus}`,
        userId: (req as any).user?.userId || '',
        referenceNo: step.approvalRequest.entityId
      }
    });
  }

  res.json(new ApiResponse(200, null, 'Approval step actioned successfully'));
};
