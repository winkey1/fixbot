/**
 * Seed awal: tiga akun statis.
 * Jalankan: npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordPlain = 'password123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(passwordPlain, saltRounds);

  const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

  for (const email of emails) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (!exists) {
      await prisma.user.create({
        data: {
          email,
          passwordHash: hash,
          name: email.split('@')[0]
        }
      });
      console.log('Created user', email, 'password:', passwordPlain);
    } else {
      console.log('User exists', email);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
