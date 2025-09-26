const mysql = require('mysql2/promise');

async function testDocumentAPI() {
  console.log('🧪 Testing Meeting Document API...\n');
  
  try {
    // Test 1: Get document templates
    console.log('📋 Test 1: Getting document templates...');
    const templatesResponse = await fetch('http://localhost:5000/api/v1/meeting-documents/templates');
    
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('✅ Templates retrieved successfully!');
      console.log(`   Found ${templatesData.data.total} templates`);
      
      if (templatesData.data.templates.length > 0) {
        console.log('   Template types:');
        templatesData.data.templates.forEach(template => {
          console.log(`   - ${template.template_name} (${template.template_type}, ${template.hierarchy_level})`);
        });
      }
    } else {
      console.log('❌ Failed to get templates:', templatesResponse.status);
    }
    
    // Test 2: Get templates by type
    console.log('\n📋 Test 2: Getting agenda templates...');
    const agendaResponse = await fetch('http://localhost:5000/api/v1/meeting-documents/templates?template_type=agenda');
    
    if (agendaResponse.ok) {
      const agendaData = await agendaResponse.json();
      console.log('✅ Agenda templates retrieved successfully!');
      console.log(`   Found ${agendaData.data.total} agenda templates`);
    } else {
      console.log('❌ Failed to get agenda templates:', agendaResponse.status);
    }
    
    // Test 3: Create a meeting document (agenda)
    console.log('\n📝 Test 3: Creating meeting document...');
    
    // First, let's get a meeting ID to use
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'membership_new'
    });
    
    const [meetings] = await connection.execute('SELECT id FROM meetings ORDER BY id DESC LIMIT 1');
    await connection.end();
    
    if (meetings.length === 0) {
      console.log('❌ No meetings found in database. Please create a meeting first.');
      return;
    }
    
    const meetingId = meetings[0].id;
    console.log(`   Using meeting ID: ${meetingId}`);
    
    const documentData = {
      meeting_id: meetingId,
      document_type: 'agenda',
      document_title: 'Test Meeting Agenda',
      document_content: {
        header: {
          organization: 'Economic Freedom Fighters',
          meeting_type: 'Test Meeting',
          date: '2025-09-20',
          time: '10:00',
          venue: 'Test Venue'
        },
        sections: [
          {
            section_id: 'opening',
            title: '1. OPENING AND WELCOME',
            items: [
              'Call to order',
              'Welcome and introductions'
            ]
          },
          {
            section_id: 'reports',
            title: '2. REPORTS',
            items: [
              'Chairperson\'s Report',
              'Secretary\'s Report'
            ]
          }
        ]
      },
      document_status: 'draft'
    };
    
    const createResponse = await fetch('http://localhost:5000/api/v1/meeting-documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(documentData)
    });
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Meeting document created successfully!');
      console.log(`   Document ID: ${createData.data.document_id}`);
      console.log(`   Document Title: ${createData.data.document_title}`);
      
      // Test 4: Get documents by meeting ID
      console.log('\n📄 Test 4: Getting documents by meeting ID...');
      const documentsResponse = await fetch(`http://localhost:5000/api/v1/meeting-documents/meeting/${meetingId}`);
      
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        console.log('✅ Meeting documents retrieved successfully!');
        console.log(`   Found ${documentsData.data.total} documents for meeting ${meetingId}`);
        
        if (documentsData.data.documents.length > 0) {
          console.log('   Documents:');
          documentsData.data.documents.forEach(doc => {
            console.log(`   - ${doc.document_title} (${doc.document_type}, ${doc.document_status})`);
          });
        }
      } else {
        console.log('❌ Failed to get meeting documents:', documentsResponse.status);
      }
      
      // Test 5: Create action item
      console.log('\n✅ Test 5: Creating action item...');
      const actionItemData = {
        meeting_id: meetingId,
        document_id: createData.data.document_id,
        action_title: 'Test Action Item',
        action_description: 'This is a test action item for the meeting',
        assigned_role: 'Secretary',
        due_date: '2025-09-25',
        priority: 'high'
      };
      
      const actionResponse = await fetch('http://localhost:5000/api/v1/meeting-documents/action-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(actionItemData)
      });
      
      if (actionResponse.ok) {
        const actionData = await actionResponse.json();
        console.log('✅ Action item created successfully!');
        console.log(`   Action ID: ${actionData.data.action_id}`);
        console.log(`   Action Title: ${actionData.data.action_title}`);
        
        // Test 6: Get action items by meeting ID
        console.log('\n📋 Test 6: Getting action items by meeting ID...');
        const actionsResponse = await fetch(`http://localhost:5000/api/v1/meeting-documents/action-items/meeting/${meetingId}`);
        
        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json();
          console.log('✅ Action items retrieved successfully!');
          console.log(`   Found ${actionsData.data.total} action items for meeting ${meetingId}`);
          
          if (actionsData.data.action_items.length > 0) {
            console.log('   Action Items:');
            actionsData.data.action_items.forEach(action => {
              console.log(`   - ${action.action_title} (${action.priority}, ${action.status})`);
            });
          }
        } else {
          console.log('❌ Failed to get action items:', actionsResponse.status);
        }
      } else {
        const errorText = await actionResponse.text();
        console.log('❌ Failed to create action item:', actionResponse.status);
        console.log('   Error:', errorText);
      }
      
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Failed to create meeting document:', createResponse.status);
      console.log('   Error:', errorText);
    }
    
    console.log('\n🎉 Meeting Document API testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDocumentAPI().catch(console.error);
