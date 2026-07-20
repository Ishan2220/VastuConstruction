import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { FileService } from '../services/file.service.js';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('Starting FMS Migration...');
  const uploadDir = path.join(process.cwd(), 'uploads');
  
  if (!fs.existsSync(uploadDir)) {
    console.log('No uploads directory found. Exiting.');
    process.exit(0);
  }

  const files = fs.readdirSync(uploadDir);
  
  // Find a generic admin user for uploadedById if not known
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('No admin user found to assign legacy files. Exiting.');
    process.exit(1);
  }

  let migratedCount = 0;

  for (const file of files) {
    if (file.startsWith('processed_') || file.startsWith('thumb_')) continue;
    
    // Check if already migrated
    const existing = await prisma.file.findFirst({ where: { storedFileName: file } });
    if (existing) continue;

    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    let mime = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.png') mime = 'image/png';
    else if (ext === '.webp') mime = 'image/webp';
    else if (ext === '.pdf') mime = 'application/pdf';

    try {
      console.log(`Migrating ${file}...`);
      
      // We simulate an upload, but the original file is already in `/uploads/`
      // To prevent FileService from creating duplicate random names and abandoning the old ones,
      // we just inject it into the DB directly as a "LOCAL" file.
      const checksum = await FileService.generateChecksum(filePath);
      
      const newFile = await prisma.file.create({
        data: {
          originalFileName: file,
          storedFileName: file,
          mimeType: mime,
          extension: ext,
          category: 'OTHER',
          uploadedById: admin.id,
          fileSizeOriginal: stats.size,
          fileSizeCompressed: stats.size,
          compressionRatio: 0,
          storageProvider: 'LOCAL',
          storagePath: `/uploads/${file}`,
          publicUrl: `${env.CLIENT_URL}/uploads/${file}`,
          checksum,
          referenceCount: 1,
        }
      });
      migratedCount++;
      
    } catch (err) {
      console.error(`Failed to migrate ${file}:`, err);
    }
  }

  console.log(`FMS Migration Complete. Migrated ${migratedCount} files.`);
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
