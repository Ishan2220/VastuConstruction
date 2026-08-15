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
  
  if (user && user.(role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
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
  if (user && file.uploadedById !== user.userId && user.(role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
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
  if (user && file.uploadedById !== user.userId && user.(role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
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
  // Get all non-deleted File records
  const files = await prisma.file.findMany({ where: { deletedAt: null } });

  // Get all Document records to cross-reference which files are actually in use
  const documents = await prisma.document.findMany({
    select: { fileUrl: true, fileSize: true, mimeType: true },
  });
  const documentFileUrls = new Set(documents.map(d => d.fileUrl));

  // Only count files that are actually referenced by a Document record
  const activeFiles = files.filter(f => documentFileUrls.has(f.publicUrl));

  const totalFiles = activeFiles.length;
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  
  let images = 0;
  let pdfs = 0;
  let office = 0;
  let other = 0;
  
  let duplicateFilesPrevented = 0;
  const uniquePhysicalFiles = new Set<string>();

  activeFiles.forEach(f => {
    totalOriginalSize += f.fileSizeOriginal;
    
    if (!uniquePhysicalFiles.has(f.checksum)) {
      totalCompressedSize += (f.fileSizeCompressed || f.fileSizeOriginal);
      uniquePhysicalFiles.add(f.checksum);
    }
    
    if (f.referenceCount > 1) {
      duplicateFilesPrevented += (f.referenceCount - 1);
    }

    if (f.mimeType.startsWith('image/')) images++;
    else if (f.mimeType === 'application/pdf') pdfs++;
    else if (f.mimeType.includes('officedocument') || f.mimeType.includes('msword') || f.mimeType.includes('excel')) office++;
    else other++;
  });

  // Also count Document records that use external links (e.g., Google Drive)
  // and don't have a corresponding File record
  documents.forEach(d => {
    if (!files.some(f => f.publicUrl === d.fileUrl)) {
      if (d.fileSize) totalOriginalSize += d.fileSize;
      if (d.fileSize) totalCompressedSize += d.fileSize;

      const mime = d.mimeType || '';
      if (mime.startsWith('image/')) images++;
      else if (mime === 'application/pdf') pdfs++;
      else if (mime.includes('officedocument') || mime.includes('msword') || mime.includes('excel')) office++;
      else other++;
    }
  });

  // Recalculate totalFiles to include external document links
  const externalDocs = documents.filter(d => !files.some(f => f.publicUrl === d.fileUrl));
  const finalTotalFiles = activeFiles.length + externalDocs.length;

  const storageSavedByCompression = totalOriginalSize - totalCompressedSize;
  const storageSavedByDeduplication = activeFiles.reduce((acc, f) => acc + (f.fileSizeOriginal * (f.referenceCount - 1)), 0);
  const totalStorageSaved = storageSavedByCompression + storageSavedByDeduplication;
  
  const overallCompressionRatio = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
    : 0;

  res.status(200).json(new ApiResponse(200, {
    totalFiles: finalTotalFiles,
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
