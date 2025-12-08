const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Get token from command line argument
const token = process.argv[2];

if (!token) {
  console.log('❌ Usage: node verify-token.js <JWT_TOKEN>');
  console.log('\nExample:');
  console.log('node verify-token.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.log('❌ JWT_SECRET not found in environment variables!');
  process.exit(1);
}

console.log('🔐 Verifying JWT Token...\n');
console.log('🔑 Using JWT_SECRET from .env file\n');
console.log('📋 Token (first 50 chars):', token.substring(0, 50) + '...\n');

try {
  // First decode without verification to see the payload
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded) {
    console.log('❌ Failed to decode token - invalid format');
    process.exit(1);
  }
  
  console.log('📦 Decoded Token Header:');
  console.log(JSON.stringify(decoded.header, null, 2));
  console.log('\n📦 Decoded Token Payload (unverified):');
  console.log(JSON.stringify(decoded.payload, null, 2));
  console.log('\n');
  
  // Now try to verify with issuer/audience
  try {
    const verified = jwt.verify(token, jwtSecret, {
      issuer: 'geomaps-api',
      audience: 'geomaps-client'
    });
    console.log('✅ Token verified successfully WITH issuer/audience validation!');
    console.log('\n📦 Verified Payload:');
    console.log(JSON.stringify(verified, null, 2));
  } catch (audienceError) {
    console.log('⚠️  Token verification failed with issuer/audience validation');
    console.log('   Error:', audienceError.message);
    console.log('\n🔄 Trying without issuer/audience validation...\n');
    
    // Try without issuer/audience
    try {
      const verified = jwt.verify(token, jwtSecret);
      console.log('✅ Token verified successfully WITHOUT issuer/audience validation!');
      console.log('\n📦 Verified Payload:');
      console.log(JSON.stringify(verified, null, 2));
      console.log('\n⚠️  Note: This token was generated without issuer/audience claims.');
      console.log('   You need to log in again to get a token with the correct claims.');
    } catch (verifyError) {
      console.log('❌ Token verification failed completely!');
      console.log('   Error:', verifyError.message);
      
      if (verifyError.name === 'TokenExpiredError') {
        console.log('\n⏰ Token has expired. Please log in again.');
      } else if (verifyError.name === 'JsonWebTokenError') {
        console.log('\n🔑 Token signature is invalid. This could mean:');
        console.log('   1. The token was signed with a different JWT_SECRET');
        console.log('   2. The token has been tampered with');
        console.log('   3. The token format is incorrect');
      }
    }
  }
} catch (error) {
  console.log('❌ Unexpected error:', error.message);
  process.exit(1);
}

