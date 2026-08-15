import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('--- Create SUPER_ADMIN ---');

  const email = await question('Email: ');
  if (!email || !email.includes('@')) {
    console.error('Invalid email.');
    process.exit(1);
  }

  console.log('Enter password (characters will be visible, clear console after): ');
  const password = await question('Password: ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  const name = await question('Name: ');

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error('User with this email already exists.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('SUPER_ADMIN created successfully!');
  console.log('Please clear your terminal to hide the password.');
  
  rl.close();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
