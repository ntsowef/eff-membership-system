/**
 * Reset password for national admin to enable testing
 */

const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

async function resetNationalAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Resetting password for national admin...');
    
    // Find the national administrator
    const user = await prisma.user.findFirst({
      where: {
        email: 'national.admin@eff.org.za'
      }
    });
    
    if (!user) {
      console.log('❌ User national.admin@eff.org.za not found');
      return;
    }
    
    console.log('👤 Found user:', user.name);
    console.log('📧 Email:', user.email);
    
    // Hash new password
    const newPassword = 'admin123';
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
    console.log('📧 Email: national.admin@eff.org.za');
    console.log('🔑 New Password: admin123');
    console.log('\n🧪 You can now test the hierarchical dashboard with these credentials!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetNationalAdminPassword();
