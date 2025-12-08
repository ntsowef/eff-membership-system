const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testDeleteUploadHistory() {
  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating...\n');
    const authResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test.national.admin1@eff.test.local',
      password: 'TestAdmin@123'
    });

    const token = authResponse.data.data.token;
    console.log('✅ Authentication successful\n');

    // Step 2: Get upload history
    console.log('📋 Fetching upload history...\n');
    const historyResponse = await axios.get(`${API_URL}/self-data-management/bulk-upload/history?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const files = historyResponse.data.data.files;
    console.log(`Found ${files.length} upload history records\n`);

    if (files.length === 0) {
      console.log('❌ No upload history records found to delete');
      return;
    }

    // Display files
    console.log('Upload history records:');
    files.forEach((file, i) => {
      console.log(`  ${i+1}. ID: ${file.file_id}, File: ${file.original_filename}, Status: ${file.status}`);
    });

    // Step 3: Delete the first file
    const fileToDelete = files[0];
    console.log(`\n🗑️  Deleting file ID ${fileToDelete.file_id} (${fileToDelete.original_filename})...\n`);

    const deleteResponse = await axios.delete(
      `${API_URL}/self-data-management/bulk-upload/history/${fileToDelete.file_id}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    console.log('✅ Delete response:', deleteResponse.data);

    // Step 4: Verify deletion
    console.log('\n📋 Verifying deletion...\n');
    const verifyResponse = await axios.get(`${API_URL}/self-data-management/bulk-upload/history?limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const remainingFiles = verifyResponse.data.data.files;
    console.log(`Remaining upload history records: ${remainingFiles.length}`);

    const deletedFileStillExists = remainingFiles.find(f => f.file_id === fileToDelete.file_id);
    if (deletedFileStillExists) {
      console.log('❌ ERROR: Deleted file still exists in history!');
    } else {
      console.log('✅ File successfully deleted from history');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testDeleteUploadHistory();

