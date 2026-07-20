import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'access-secret-dev',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-dev',
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  CLIENT_URL: (process.env.CLIENT_URL || 'http://localhost:5173').trim(),

  // FMS Configuration
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || 'LOCAL') as 'LOCAL' | 'S3',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || '',
  S3_REGION: process.env.S3_REGION || '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '', // For B2, R2, MinIO
  
  FMS_MAX_UPLOAD_SIZE: parseInt(process.env.FMS_MAX_UPLOAD_SIZE || '52428800', 10), // 50MB
  FMS_COMPRESSION_ENABLED: process.env.FMS_COMPRESSION_ENABLED !== 'false',
  FMS_DUPLICATE_DETECTION: process.env.FMS_DUPLICATE_DETECTION !== 'false',
  FMS_SIGNED_URL_EXPIRY: parseInt(process.env.FMS_SIGNED_URL_EXPIRY || '3600', 10),
  FMS_THUMBNAIL_SIZE: parseInt(process.env.FMS_THUMBNAIL_SIZE || '400', 10),
  FMS_MAX_DIMENSION: parseInt(process.env.FMS_MAX_DIMENSION || '2560', 10),
} as const;

export type Env = typeof env;

export const validateConfiguration = () => {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!env.ACCESS_TOKEN_SECRET || env.ACCESS_TOKEN_SECRET === 'access-secret-dev') missing.push('ACCESS_TOKEN_SECRET');
  
  if (missing.length > 0) {
    if (env.NODE_ENV === 'production') {
      console.error(`❌ FATAL: Missing or invalid mandatory environment variables: ${missing.join(', ')}`);
      process.exit(1);
    } else {
      console.warn(`⚠️ WARNING: Missing recommended environment variables: ${missing.join(', ')}`);
    }
  }
};
