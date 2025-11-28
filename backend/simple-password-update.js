const bcrypt = require('bcryptjs');

async function main() {
  try {
    // Create hash for Admin@123
    const password = 'Admin@123';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('=== PASSWORD RESTORATION ===');
    console.log('Email: national.admin@eff.org.za');
    console.log('Password:', password);
    console.log('Generated Hash:', hash);
    
    // Test the hash
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash Validation:', isValid ? '✅ Valid' : '❌ Invalid');
    
    console.log('\n=== MANUAL UPDATE COMMAND ===');
    console.log('Run this command to update the password:');
    console.log(`docker exec -it eff-membership-postgres psql -U eff_admin -d eff_membership_db -c "UPDATE users SET password = '${hash}' WHERE email = 'national.admin@eff.org.za';"`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
