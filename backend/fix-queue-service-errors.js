const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Queue Service Errors...');

const queueServicePath = path.join(__dirname, 'src/services/queueService.ts');

try {
  let content = fs.readFileSync(queueServicePath, 'utf8');
  
  console.log('📝 Original file length:', content.length);
  
  // Fix 1: Broken INSERT query on line 56
  content = content.replace(
    /INSERT INTO message_queue \(\s*campaign_id, message_id, queue_type, priority,\s*scheduled_for, status\s*\) EXCLUDED\.\? , , \$3, \$4, \$5, 'Pending'/g,
    `INSERT INTO message_queue (
          campaign_id, message_id, queue_type, priority, 
          scheduled_for, status
        ) VALUES ($1, $2, $3, $4, $5, 'Pending')`
  );
  
  // Fix 2: Broken template literal on line 68
  content = content.replace(
    /console\.log\('📨 Message \$\{messageId\} added to queue with priority ' \+ priority \+ ''\);/g,
    "console.log('📨 Message ' + messageId + ' added to queue with priority ' + priority);"
  );
  
  // Fix 3: MySQL parameter placeholder on line 209 (should be PostgreSQL)
  content = content.replace(
    /WHERE member_id = \? /g,
    'WHERE member_id = $1'
  );
  
  // Fix 4: Broken UPDATE query on line 312
  content = content.replace(
    /SET status = \? , processed_at = , error_message = \$3, updated_at = CURRENT_TIMESTAMP\s*WHERE id = \$1/g,
    'SET status = $1, processed_at = $2, error_message = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4'
  );
  
  // Fix 5: Broken ternary operator on line 316
  content = content.replace(
    /const processedAt = status === 'Completed' \|\| status === 'Failed' \$1 new Date\(\)\.toISOString\(\)\s*: null;/g,
    "const processedAt = status === 'Completed' || status === 'Failed' ? new Date().toISOString() : null;"
  );
  
  // Fix 6: Fix parameter order in executeQuery call on line 317
  content = content.replace(
    /await executeQuery\(query, \[status, processedAt, errorMessage \|\| null, queueId\]\);/g,
    'await executeQuery(query, [status, processedAt, errorMessage || null, queueId]);'
  );
  
  // Fix 7: MySQL parameter placeholder in dynamic query on line 331
  content = content.replace(
    /updateFields\.push\('' \+ key \+ ' = \? '\);/g,
    "updateFields.push(key + ' = $' + (params.length + 1));"
  );
  
  // Fix 8: Fix WHERE clause parameter in dynamic query on line 341
  content = content.replace(
    /const query = 'UPDATE message_queue SET ' \+ updateFields\.join\(', '\) \+ ' WHERE id = \$1';/g,
    "const query = 'UPDATE message_queue SET ' + updateFields.join(', ') + ' WHERE id = $' + (params.length + 1);"
  );
  
  // Fix 9: MySQL DATE_SUB function to PostgreSQL INTERVAL on line 384
  content = content.replace(
    /AND processed_at < DATE_SUB\(CURRENT_TIMESTAMP, INTERVAL \? DAY\);/g,
    "AND processed_at < CURRENT_TIMESTAMP - INTERVAL '$1 days'"
  );
  
  // Fix 10: Missing closing backtick on line 384
  content = content.replace(
    /AND processed_at < CURRENT_TIMESTAMP - INTERVAL '\$1 days'\s*const result/g,
    "AND processed_at < CURRENT_TIMESTAMP - INTERVAL '$1 days'\n      `;\n\n      const result"
  );
  
  // Fix 11: Broken template literals in console.log statements
  content = content.replace(
    /console\.log\('🔄 Message \$\{queueItem\.message_id\} scheduled for retry \$\{currentRetries \+ 1\}\/\$\{maxRetries\} in ' \+ delayMinutes \+ ' minutes'\);/g,
    "console.log('🔄 Message ' + queueItem.message_id + ' scheduled for retry ' + (currentRetries + 1) + '/' + maxRetries + ' in ' + delayMinutes + ' minutes');"
  );
  
  content = content.replace(
    /console\.log\('❌ Message \$\{queueItem\.message_id\} failed after ' \+ maxRetries \+ ' retries'\);/g,
    "console.log('❌ Message ' + queueItem.message_id + ' failed after ' + maxRetries + ' retries');"
  );
  
  // Fix 12: Broken template literal in console.warn on line 176
  content = content.replace(
    /console\.warn\('No recipient details found for message ' \+ message\.id \+ ''\);/g,
    "console.warn('No recipient details found for message ' + message.id);"
  );
  
  // Fix 13: Broken template literal in console.error on line 188
  content = content.replace(
    /console\.error\('Failed to send message \$\{message\.id\} via ' \+ channel \+ ':', error\);/g,
    "console.error('Failed to send message ' + message.id + ' via ' + channel + ':', error);"
  );
  
  // Fix 14: Broken template literals in console.warn statements
  content = content.replace(
    /console\.warn\('No email address for recipient ' \+ recipient\.member_id \+ ''\);/g,
    "console.warn('No email address for recipient ' + recipient.member_id);"
  );
  
  content = content.replace(
    /console\.warn\('No phone number for recipient ' \+ recipient\.member_id \+ ''\);/g,
    "console.warn('No phone number for recipient ' + recipient.member_id);"
  );
  
  content = content.replace(
    /console\.warn\('Unsupported delivery channel: ' \+ channel \+ ''\);/g,
    "console.warn('Unsupported delivery channel: ' + channel);"
  );
  
  // Write the fixed content back to the file
  fs.writeFileSync(queueServicePath, content, 'utf8');
  
  console.log('✅ Queue Service fixes applied successfully!');
  console.log('📝 Updated file length:', content.length);
  
} catch (error) {
  console.error('❌ Error fixing queue service:', error);
  process.exit(1);
}
