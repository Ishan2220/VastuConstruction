import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { FileService } from '../services/file.service.js';
import { prisma } from '../config/database.js';

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }

  const category = req.body.category || 'OTHER';
  const projectId = req.body.projectId;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const fileRecord = await FileService.uploadFile({
    filePath: req.file.path,
    originalFileName: req.file.originalname,
    mimeType: req.file.mimetype,
    category,
    projectId,
    uploadedById: req.user!.userId,
    ipAddress,
    userAgent,
  });

  res.status(201).json(
    new ApiResponse(201, fileRecord, 'File uploaded and processed successfully')
  );
});

export const getFiles = asyncHandler(async (req: Request, res: Response) => {
  const { category, projectId, search } = req.query;
  const user = req.user as any;
  const where: any = { deletedAt: null };
  
  if (category) where.category = category as string;
  if (projectId) where.projectId = projectId as string;
  if (search) {
    where.originalFileName = { contains: search as string, mode: 'insensitive' };
  }
  
  if (user && user.role !== 'ADMIN') {
    where.uploadedById = user.userId;
  }

  const files = await prisma.file.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      project: { select: { name: true } }
    },
    take: 100,
  });
  res.status(200).json(new ApiResponse(200, files, 'Files retrieved successfully'));
});

export const getFileDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const file = await prisma.file.findUnique({ where: { id } });
  
  if (!file) throw new ApiError(404, 'File not found');
  
  const user = req.user as any;
  if (user && file.uploadedById !== user.userId && user.role !== 'ADMIN') {
      throw new ApiError(403, 'Unauthorized access to file');
  }

  const url = await FileService.getDownloadUrl(id);
  res.status(200).json(new ApiResponse(200, { downloadUrl: url }, 'URL generated successfully'));
});

export const softDeleteFile = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new ApiError(404, 'File not found');

  const user = req.user as any;
  if (user && file.uploadedById !== user.userId && user.role !== 'ADMIN') {
    throw new ApiError(403, 'You do not have permission to delete this file');
  }

  await prisma.file.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'DELETED' }
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'DELETE',
      entity: 'File',
      entityId: id,
      ipAddress: req.ip,
    }
  });

  res.status(200).json(new ApiResponse(200, null, 'File deleted successfully'));
});

export const getStorageDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const files = await prisma.file.findMany({ where: { deletedAt: null } });
  
  const totalFiles = files.length;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  let images = 0;
  let pdfs = 0;
  let office = 0;
  let other = 0;
  
  let duplicateFilesPrevented = 0;
  const uniquePhysicalFiles = new Set<string>();

  files.forEach(f => {
    totalOriginalSize += f.fileSizeOriginal;
    
    if (!uniquePhysicalFiles.has(f.checksum)) {
      totalCompressedSize += (f.fileSizeCompressed || f.fileSizeOriginal);
      uniquePhysicalFiles.add(f.checksum);
    }
    
    if (f.referenceCount > 1) {
      // For every reference > 1, we saved original size
      duplicateFilesPrevented += (f.referenceCount - 1);
    }

    if (f.mimeType.startsWith('image/')) images++;
    else if (f.mimeType === 'application/pdf') pdfs++;
    else if (f.mimeType.includes('officedocument') || f.mimeType.includes('msword') || f.mimeType.includes('excel')) office++;
    else other++;
  });

  const storageSavedByCompression = totalOriginalSize - totalCompressedSize;
  const storageSavedByDeduplication = files.reduce((acc, f) => acc + (f.fileSizeOriginal * (f.referenceCount - 1)), 0);
  const totalStorageSaved = storageSavedByCompression + storageSavedByDeduplication;
  
  const overallCompressionRatio = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
    : 0;

  res.status(200).json(new ApiResponse(200, {
    totalFiles,
    images,
    pdfs,
    office,
    other,
    storageUsed: totalCompressedSize,
    storageSaved: totalStorageSaved,
    overallCompressionRatio: overallCompressionRatio.toFixed(2),
    duplicateFilesPrevented,
  }, 'Dashboard stats retrieved'));
});
