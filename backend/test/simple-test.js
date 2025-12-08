console.log('Test starting...');

const axios = require('axios');

async function test() {
  try {
    console.log('Making request...');
    const response = await axios.get('http://localhost:5000/api/v1/health');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test().then(() => {
  console.log('Test complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

