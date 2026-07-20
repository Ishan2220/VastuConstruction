import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class StorageService {
  private s3Client?: S3Client;

  constructor() {
    if (env.STORAGE_PROVIDER === 'S3') {
      const config: any = {
        region: env.S3_REGION,
        credentials: {
          accessKeyId: env.S3_ACCESS_KEY_ID,
          secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        },
      };
      
      if (env.S3_ENDPOINT) {
        config.endpoint = env.S3_ENDPOINT;
        config.forcePathStyle = true; // Important for MinIO/B2
      }
      
      this.s3Client = new S3Client(config);
      logger.info(`StorageService initialized with S3 provider (Bucket: ${env.S3_BUCKET_NAME})`);
    } else {
      logger.info('StorageService initialized with LOCAL provider');
    }
  }

  async upload(filePath: string, storedFileName: string, mimeType: string): Promise<string> {
    if (env.STORAGE_PROVIDER === 'S3') {
      if (!this.s3Client) throw new Error('S3 Client not initialized');
      
      const fileStream = fs.createReadStream(filePath);
      const command = new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: storedFileName,
        Body: fileStream,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      return storedFileName; // For S3, we return the key
    } else {
      // Local Storage
      const destPath = path.join(process.cwd(), 'uploads', storedFileName);
      await fs.promises.copyFile(filePath, destPath);
      return `/uploads/${storedFileName}`;
    }
  }

  async getSignedUrl(storedFileName: string): Promise<string> {
    if (env.STORAGE_PROVIDER === 'S3') {
      if (!this.s3Client) throw new Error('S3 Client not initialized');
      
      const command = new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: storedFileName,
      });
      
      return await getSignedUrl(this.s3Client, command, { expiresIn: env.FMS_SIGNED_URL_EXPIRY });
    } else {
      // Local Storage - assume it's publicly accessible via /uploads/
      return `${env.CLIENT_URL}/uploads/${storedFileName}`;
    }
  }

  async delete(storedFileName: string): Promise<void> {
    try {
      if (env.STORAGE_PROVIDER === 'S3') {
        if (!this.s3Client) throw new Error('S3 Client not initialized');
        
        const command = new DeleteObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: storedFileName,
        });
        await this.s3Client.send(command);
      } else {
        const destPath = path.join(process.cwd(), 'uploads', storedFileName);
        if (fs.existsSync(destPath)) {
          await fs.promises.unlink(destPath);
        }
      }
    } catch (error) {
      logger.error(`StorageService: Error deleting file ${storedFileName}`, error);
      // Soft-fail: We don't want a deletion error to crash the app, but we log it
    }
  }
}

export const storageService = new StorageService();
