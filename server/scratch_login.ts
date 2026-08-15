import bcrypt from 'bcryptjs';
import { prisma } from './src/config/database.js';

async function main() {
  const email = 'superadmin@vastuconstruction.in';
  const password = 'superadmin123';

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      password: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    console.error('Invalid email or password (user not found)');
    return;
  }

  if (!user.isActive) {
    console.error('Account deactivated');
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    console.error('Invalid password');
    return;
  }

  console.log('Login successful!', user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
