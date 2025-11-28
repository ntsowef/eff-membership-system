/**
 * Create a test user for testing membership directory endpoints
 */

const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking existing users...');
    
    // Check if any users exist
    const existingUsers = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        admin_level: true,
        is_active: true
      }
    });
    
    console.log(`Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.admin_level} - ${user.is_active ? 'Active' : 'Inactive'}`);
    });
    
    if (existingUsers.length > 0) {
      console.log('\n✅ Users already exist. You can use existing credentials.');
      console.log('Try logging in with one of the existing user emails and their password.');
      return;
    }
    
    console.log('\n🔧 No users found. Creating test user...');
    
    // Check if roles exist
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    console.log(`Found ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`  - ${role.name} (ID: ${role.id})`);
    });
    
    // Find admin role or use first available role
    let roleId = roles.find(r => r.name.toLowerCase().includes('admin'))?.id || roles[0]?.id;
    
    if (!roleId) {
      console.log('❌ No roles found. Creating default admin role...');
      const newRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'System Administrator'
        }
      });
      roleId = newRole.id;
      console.log(`✅ Created admin role with ID: ${roleId}`);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        role_id: roleId,
        admin_level: 'National',
        is_active: true,
        email_verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    console.log('\n✅ Test user created successfully!');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Name:', testUser.name);
    console.log('🆔 User ID:', testUser.id);
    console.log('🎭 Role ID:', testUser.role_id);
    console.log('📊 Admin Level:', testUser.admin_level);
    
    console.log('\n🧪 You can now test the membership directory with these credentials!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2002') {
      console.log('User with this email already exists.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
