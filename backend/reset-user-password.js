/**
 * Reset password for existing user to enable testing
 */

const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

async function resetUserPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Resetting password for test user...');
    
    // Find the system administrator
    const user = await prisma.user.findFirst({
      where: {
        email: 'admin@eff.local'
      }
    });
    
    if (!user) {
      console.log('❌ User admin@eff.local not found');
      return;
    }
    
    console.log('👤 Found user:', user.name);
    console.log('📧 Email:', user.email);
    
    // Hash new password
    const newPassword = 'test123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: {
        email: user.email
      },
      data: {
        password: hashedPassword,
        updated_at: new Date()
      }
    });
    
    console.log('\n✅ Password reset successfully!');
    console.log('📧 Email: admin@eff.local');
    console.log('🔑 New Password: test123');
    console.log('\n🧪 You can now test the membership directory with these credentials!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserPassword();
