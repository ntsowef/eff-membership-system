const bcrypt = require('bcryptjs');

async function restoreAdminPassword() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log('Hash validation:', isValid);
}

restoreAdminPassword();
