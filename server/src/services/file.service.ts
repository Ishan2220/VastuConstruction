import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { storageService } from './storage.service.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class FileService {
  /**
   * Main synchronous upload pipeline
   */
  static async uploadFile({
    filePath,
    originalFileName,
    mimeType,
    category,
    projectId,
    uploadedById,
    ipAddress,
    userAgent,
  }: {
    filePath: string;
    originalFileName: string;
    mimeType: string;
    category: any;
    projectId?: string;
    uploadedById: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const startTime = Date.now();
    let processingTime = 0;
    
    // 1. Calculate File Size & Validate Limits
    const stat = await fs.promises.stat(filePath);
    const originalSize = stat.size;
    if (originalSize > env.FMS_MAX_UPLOAD_SIZE) {
      throw new ApiError(400, `File size exceeds the maximum limit of ${env.FMS_MAX_UPLOAD_SIZE / (1024 * 1024)}MB`);
    }

    // 2. Generate Checksum (SHA-256)
    const checksum = await this.generateChecksum(filePath);

    // 3. Deduplication Check
    if (env.FMS_DUPLICATE_DETECTION) {
      const existingFile = await prisma.file.findFirst({
        where: { checksum, status: 'UPLOADED', deletedAt: null }
      });
      if (existingFile) {
        logger.info(`Duplicate file detected by checksum ${checksum}, reusing storage object.`);
        
        // Transaction: Increment reference count and create new metadata
        return await prisma.$transaction(async (tx) => {
          await tx.file.update({
            where: { id: existingFile.id },
            data: { referenceCount: { increment: 1 } }
          });
          
          const newFile = await tx.file.create({
            data: {
              ...existingFile,
              id: undefined,
              originalFileName,
              category,
              projectId,
              uploadedById,
              referenceCount: 1, // New metadata row has its own reference counting for future logic if needed, or we just map it. Wait, the prompt says "Increase referenceCount. Create new metadata record. Reuse storage object."
              uploadedAt: new Date(),
              lastAccessedAt: new Date(),
              ipAddress,
              device: userAgent,
              versionNumber: 1,
              isLatestVersion: true,
              previousVersionId: null,
            }
          });
          
          await this.logAudit(tx, uploadedById, newFile, 'DUPLICATE_REUSED', originalSize, originalSize, ipAddress);
          return newFile;
        });
      }
    }

    // 4. File Type Detection & Processing
    const isImage = mimeType.startsWith('image/');
    const isPDF = mimeType === 'application/pdf';
    
    let processedFilePath = filePath;
    let storedFileName = crypto.randomUUID() + path.extname(originalFileName);
    let finalMimeType = mimeType;
    let finalExtension = path.extname(originalFileName).toLowerCase();
    
    let originalWidth = null;
    let originalHeight = null;
    let compressedWidth = null;
    let compressedHeight = null;
    let compressedSize = originalSize;
    let compressionRatio = new Prisma.Decimal(0);
    
    const processingStart = Date.now();

    if (isImage && env.FMS_COMPRESSION_ENABLED) {
      try {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        originalWidth = metadata.width || null;
        originalHeight = metadata.height || null;
        
        let sharpInstance = image.rotate(); // Auto EXIF rotate
        
        // Resize if exceeding max dimensions
        if (originalWidth && originalHeight) {
          const maxDim = env.FMS_MAX_DIMENSION;
          if (originalWidth > maxDim || originalHeight > maxDim) {
            sharpInstance = sharpInstance.resize({
              width: maxDim,
              height: maxDim,
              fit: 'inside',
              withoutEnlargement: true,
            });
          }
        }

        // Determine Adaptive Quality
        const sizeMB = originalSize / (1024 * 1024);
        let quality = 85;
        if (sizeMB > 8) quality = 60;
        else if (sizeMB > 5) quality = 70;
        else if (sizeMB > 2) quality = 80;

        // Selective WebP Conversion
        const convertToWebP = category === 'SITE_PHOTO' || category === 'DAILY_REPORT';
        
        if (convertToWebP) {
          sharpInstance = sharpInstance.webp({ quality });
          storedFileName = storedFileName.replace(finalExtension, '.webp');
          finalMimeType = 'image/webp';
          finalExtension = '.webp';
        } else if (metadata.format === 'jpeg') {
          sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
        } else if (metadata.format === 'png') {
          sharpInstance = sharpInstance.png({ quality, compressionLevel: 8 });
        } else if (metadata.format === 'heif') {
          // Sharp supports HEIF depending on libvips, fallback to JPEG if needed
          sharpInstance = sharpInstance.jpeg({ quality });
          storedFileName = storedFileName.replace(finalExtension, '.jpg');
          finalMimeType = 'image/jpeg';
          finalExtension = '.jpg';
        }

        const outPath = path.join(process.cwd(), 'uploads', `processed_${storedFileName}`);
        const info = await sharpInstance.toFile(outPath);
        
        processedFilePath = outPath;
        compressedSize = info.size;
        compressedWidth = info.width;
        compressedHeight = info.height;
        compressionRatio = new Prisma.Decimal(Number(((originalSize - compressedSize) / originalSize * 100).toFixed(2)));
        
      } catch (err) {
        logger.error('Error during image processing, falling back to original', err);
        processedFilePath = filePath;
      }
    }
    
    processingTime = Date.now() - processingStart;
    
    // Generate Thumbnail if image
    let thumbnailUrl = null;
    let thumbnailGenerationTime = 0;
    const thumbStart = Date.now();
    if (isImage) {
      try {
        const thumbName = `thumb_${storedFileName}`;
        const thumbOutPath = path.join(process.cwd(), 'uploads', thumbName);
        await sharp(processedFilePath)
          .resize(env.FMS_THUMBNAIL_SIZE, env.FMS_THUMBNAIL_SIZE, { fit: 'inside' })
          .toFormat('webp', { quality: 80 })
          .toFile(thumbOutPath);
          
        thumbnailUrl = await storageService.upload(thumbOutPath, thumbName, 'image/webp');
        if (fs.existsSync(thumbOutPath)) fs.unlinkSync(thumbOutPath);
      } catch (err) {
        logger.warn('Failed to generate thumbnail', err);
      }
    }
    thumbnailGenerationTime = Date.now() - thumbStart;

    // 5. Upload Original/Processed to Storage
    let storagePath = '';
    let publicUrl = '';
    try {
      storagePath = await storageService.upload(processedFilePath, storedFileName, finalMimeType);
      publicUrl = env.STORAGE_PROVIDER === 'LOCAL' 
        ? `${env.CLIENT_URL}${storagePath}`
        : `https://${env.S3_BUCKET_NAME}.s3.${env.S3_REGION}.amazonaws.com/${storedFileName}`; 
        // Better to use a configurable CDN domain here in future, or S3 URL.
    } catch (err) {
      logger.error('Storage Upload Failed', err);
      if (processedFilePath !== filePath && fs.existsSync(processedFilePath)) fs.unlinkSync(processedFilePath);
      throw new ApiError(500, 'Failed to upload file to storage provider');
    }

    const uploadDuration = Date.now() - startTime;

    // 6. Database Transaction
    let fileRecord;
    try {
      fileRecord = await prisma.$transaction(async (tx) => {
        const newFile = await tx.file.create({
          data: {
            originalFileName,
            storedFileName,
            mimeType: finalMimeType,
            extension: finalExtension,
            category,
            projectId,
            uploadedById,
            fileSizeOriginal: originalSize,
            fileSizeCompressed: compressedSize !== originalSize ? compressedSize : null,
            compressionRatio,
            originalWidth,
            originalHeight,
            compressedWidth,
            compressedHeight,
            storageProvider: env.STORAGE_PROVIDER,
            storagePath,
            publicUrl,
            thumbnailUrl,
            checksum,
            referenceCount: 1,
            ipAddress,
            device: userAgent,
            uploadDuration,
            compressionTime: processingTime,
            thumbnailGenerationTime,
            status: 'UPLOADED',
          }
        });

        await this.logAudit(tx, uploadedById, newFile, 'UPLOAD', originalSize, compressedSize, ipAddress);
        return newFile;
      });
    } catch (err) {
      // Transaction failed, rollback storage!
      logger.error('Database transaction failed, rolling back storage object', err);
      await storageService.delete(storedFileName);
      if (thumbnailUrl && thumbnailUrl.includes(storedFileName)) {
        await storageService.delete(`thumb_${storedFileName}`);
      }
      throw new ApiError(500, 'Failed to save file metadata. Upload rolled back.');
    } finally {
      // Cleanup local temp processed file
      if (processedFilePath !== filePath && fs.existsSync(processedFilePath)) {
        fs.unlinkSync(processedFilePath);
      }
    }

    return fileRecord;
  }

  static async generateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', err => reject(err));
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  static async logAudit(tx: Prisma.TransactionClient, userId: string, file: any, action: string, originalSize: number, compressedSize: number, ip?: string) {
    await tx.auditLog.create({
      data: {
        userId,
        action,
        entity: 'File',
        entityId: file.id,
        newData: {
          originalSize,
          compressedSize,
          compressionRatio: file.compressionRatio,
          storageProvider: file.storageProvider,
          checksum: file.checksum,
          category: file.category
        },
        ipAddress: ip,
      }
    });
  }

  /**
   * Handle File Download / Signed URLs
   */
  static async getDownloadUrl(fileId: string): Promise<string> {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status === 'DELETED') throw new ApiError(404, 'File not found');

    // Update last accessed
    await prisma.file.update({ where: { id: fileId }, data: { lastAccessedAt: new Date() } });

    // Financial documents require short-lived signed URLs for security
    const secureCategories = ['INVOICE', 'GST_BILL', 'PURCHASE_ORDER', 'VENDOR_RECEIPT', 'CONTRACT'];
    if (secureCategories.includes(file.category) && env.STORAGE_PROVIDER === 'S3') {
      return await storageService.getSignedUrl(file.storedFileName);
    }
    
    return file.publicUrl;
  }
}
