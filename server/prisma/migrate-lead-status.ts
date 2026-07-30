import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting LeadStatus data migration...');

  try {
    // 1. Add new enum values to the database to allow the update
    console.log('Adding new enum values to LeadStatus...');
    await prisma.$executeRawUnsafe(`ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'SITE_VISIT';`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP';`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'PROPOSAL_SENT';`);
    
    // 2. Remap existing records using raw SQL
    console.log('Remapping existing records...');
    const res1 = await prisma.$executeRawUnsafe(`UPDATE "leads" SET "status" = 'SITE_VISIT' WHERE "status" = 'QUALIFIED';`);
    console.log(`Updated records from QUALIFIED to SITE_VISIT: ${res1}`);

    const res2 = await prisma.$executeRawUnsafe(`UPDATE "leads" SET "status" = 'PROPOSAL_SENT' WHERE "status" = 'PROPOSAL';`);
    console.log(`Updated records from PROPOSAL to PROPOSAL_SENT: ${res2}`);

    console.log('Data migration completed successfully. You can now run `npx prisma db push`.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
