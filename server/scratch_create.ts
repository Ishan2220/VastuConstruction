import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@vastuconstruction.in';
  const password = 'superadmin123';
  const name = 'Super Admin';

  const hashedPassword = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Super Admin already exists.');
    process.exit(0);
  }

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('SUPER_ADMIN created successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
