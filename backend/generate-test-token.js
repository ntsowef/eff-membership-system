const jwt = require('jsonwebtoken');

const payload = {
  userId: 1,
  email: 'test@example.com',
  permissions: ['members.read', 'members.write', 'members.create']
};

const secret = 'be6bf07fbef553bf6e00bdcf4d3e113b6b4a99157e1aadc7c51d401f4575bf52';
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('Test JWT Token:');
console.log(token);
