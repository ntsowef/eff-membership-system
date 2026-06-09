import { PrismaClient } from '@prisma/client';

// Connect to the production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://eff_admin:Frames!123@69.164.245.173:5432/eff_membership_database?schema=public',
    },
  },
});

async function main() {
  const emailsToDelete = [
    'kwazulunatalaudit@gmail.com',
    'kwazulunatal.audit@effonline.org',
  ];

  // First, find and display the users
  const users = await prisma.users.findMany({
    where: { email: { in: emailsToDelete } },
    select: { user_id: true, email: true, name: true, role_id: true, admin_level: true, is_active: true },
  });

  console.log('=== Users found ===');
  console.log(JSON.stringify(users, null, 2));

  if (users.length === 0) {
    console.log('No users found with those email addresses.');
    return;
  }

  // Delete the users
  const result = await prisma.users.deleteMany({
    where: { email: { in: emailsToDelete } },
  });

  console.log(`\n=== Deleted ${result.count} user(s) ===`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
