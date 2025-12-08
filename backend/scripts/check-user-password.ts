import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function checkUser() {
  // Find ALL users with this email
  const users = await prisma.users.findMany({
    where: {
      OR: [
        { email: 'ntsowef@gmail.com' },
        { email: { contains: 'ntsowe' } }
      ]
    },
    select: {
      user_id: true,
      id: true,
      name: true,
      email: true,
      password: true,
      is_active: true,
      admin_level: true
    }
  });

  console.log('Found', users.length, 'user(s):\n');

  for (const user of users) {
    console.log('---');
    console.log('  user_id:', user.user_id);
    console.log('  id:', user.id);
    console.log('  name:', user.name);
    console.log('  email:', user.email);
    console.log('  is_active:', user.is_active);
    console.log('  admin_level:', user.admin_level);

    // Test password
    const match = await bcrypt.compare('Frames@1234', user.password!);
    console.log('  Frames@1234:', match ? '✅ MATCH' : '❌ no match');
  }

  await prisma.$disconnect();
}

checkUser();

