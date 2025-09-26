const mysql = require('mysql2/promise');

async function seedMeetingDocumentTemplates() {
  console.log('🚀 Seeding Meeting Document Templates...\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'membership_new'
  });

  try {
    // Get meeting types to link templates
    const [meetingTypes] = await connection.execute(`
      SELECT type_id, type_name, hierarchy_level 
      FROM meeting_types 
      WHERE is_active = 1
    `);
    
    console.log('📋 Available meeting types:');
    console.table(meetingTypes);
    
    // Document templates for different meeting types
    const templates = [
      // National CCT Meeting Templates
      {
        template_name: 'CCT Meeting Agenda',
        template_type: 'agenda',
        meeting_type_id: meetingTypes.find(t => t.type_name.includes('CCT'))?.type_id || null,
        hierarchy_level: 'National',
        template_content: {
          header: {
            organization: 'Economic Freedom Fighters',
            meeting_type: 'Central Command Team Meeting',
            logo_url: '/assets/eff-logo.png'
          },
          sections: [
            {
              section_id: 'opening',
              title: '1. OPENING AND WELCOME',
              items: [
                'Call to order',
                'Welcome and introductions',
                'Acknowledgment of traditional owners'
              ]
            },
            {
              section_id: 'attendance',
              title: '2. ATTENDANCE AND APOLOGIES',
              items: [
                'Roll call of CCT members',
                'Apologies received',
                'Quorum confirmation'
              ]
            },
            {
              section_id: 'previous_minutes',
              title: '3. CONFIRMATION OF PREVIOUS MINUTES',
              items: [
                'Review of previous meeting minutes',
                'Matters arising from previous minutes'
              ]
            },
            {
              section_id: 'reports',
              title: '4. REPORTS',
              items: [
                'President\'s Report',
                'Secretary General\'s Report',
                'Treasurer General\'s Report',
                'Provincial Reports'
              ]
            },
            {
              section_id: 'strategic_matters',
              title: '5. STRATEGIC MATTERS',
              items: [
                'Policy discussions',
                'Strategic planning updates',
                'Organizational development'
              ]
            },
            {
              section_id: 'new_business',
              title: '6. NEW BUSINESS',
              items: [
                'New agenda items',
                'Motions and resolutions'
              ]
            },
            {
              section_id: 'closing',
              title: '7. CLOSING',
              items: [
                'Next meeting date',
                'Closing remarks',
                'Adjournment'
              ]
            }
          ],
          footer: {
            prepared_by: 'Secretary General\'s Office',
            contact: 'secretary@effighters.org.za'
          }
        },
        is_default: true
      },
      
      // Provincial PCT Meeting Templates
      {
        template_name: 'PCT Meeting Agenda',
        template_type: 'agenda',
        meeting_type_id: meetingTypes.find(t => t.type_name.includes('PCT'))?.type_id || null,
        hierarchy_level: 'Provincial',
        template_content: {
          header: {
            organization: 'Economic Freedom Fighters',
            meeting_type: 'Provincial Command Team Meeting',
            logo_url: '/assets/eff-logo.png'
          },
          sections: [
            {
              section_id: 'opening',
              title: '1. OPENING AND WELCOME',
              items: [
                'Call to order by Provincial Chairperson',
                'Welcome and introductions',
                'Opening prayer/moment of silence'
              ]
            },
            {
              section_id: 'attendance',
              title: '2. ATTENDANCE AND APOLOGIES',
              items: [
                'Roll call of PCT members',
                'Apologies received',
                'Quorum confirmation'
              ]
            },
            {
              section_id: 'previous_minutes',
              title: '3. CONFIRMATION OF PREVIOUS MINUTES',
              items: [
                'Review of previous PCT meeting minutes',
                'Action items follow-up'
              ]
            },
            {
              section_id: 'reports',
              title: '4. REPORTS',
              items: [
                'Provincial Chairperson\'s Report',
                'Provincial Secretary\'s Report',
                'Provincial Treasurer\'s Report',
                'Regional Reports',
                'Municipal Reports'
              ]
            },
            {
              section_id: 'organizational_matters',
              title: '5. ORGANIZATIONAL MATTERS',
              items: [
                'Membership recruitment and retention',
                'Branch development',
                'Leadership development'
              ]
            },
            {
              section_id: 'political_matters',
              title: '6. POLITICAL MATTERS',
              items: [
                'Provincial political developments',
                'Electoral matters',
                'Policy implementation'
              ]
            },
            {
              section_id: 'new_business',
              title: '7. NEW BUSINESS',
              items: [
                'New agenda items',
                'Motions and resolutions'
              ]
            },
            {
              section_id: 'closing',
              title: '8. CLOSING',
              items: [
                'Next meeting date and venue',
                'Closing remarks',
                'Revolutionary salute'
              ]
            }
          ],
          footer: {
            prepared_by: 'Provincial Secretary\'s Office',
            contact: 'provincial.secretary@effighters.org.za'
          }
        },
        is_default: true
      },

      // Ward BCT Meeting Templates
      {
        template_name: 'BCT Meeting Agenda',
        template_type: 'agenda',
        meeting_type_id: meetingTypes.find(t => t.type_name.includes('BCT'))?.type_id || null,
        hierarchy_level: 'Ward',
        template_content: {
          header: {
            organization: 'Economic Freedom Fighters',
            meeting_type: 'Branch Command Team Meeting',
            logo_url: '/assets/eff-logo.png'
          },
          sections: [
            {
              section_id: 'opening',
              title: '1. OPENING AND WELCOME',
              items: [
                'Call to order by Branch Chairperson',
                'Welcome and introductions',
                'Opening prayer/moment of silence'
              ]
            },
            {
              section_id: 'attendance',
              title: '2. ATTENDANCE AND APOLOGIES',
              items: [
                'Roll call of BCT members',
                'Apologies received',
                'Quorum confirmation'
              ]
            },
            {
              section_id: 'previous_minutes',
              title: '3. CONFIRMATION OF PREVIOUS MINUTES',
              items: [
                'Review of previous BCT meeting minutes',
                'Action items follow-up'
              ]
            },
            {
              section_id: 'reports',
              title: '4. REPORTS',
              items: [
                'Branch Chairperson\'s Report',
                'Branch Secretary\'s Report',
                'Branch Treasurer\'s Report',
                'Committee Reports'
              ]
            },
            {
              section_id: 'community_matters',
              title: '5. COMMUNITY MATTERS',
              items: [
                'Local community issues',
                'Service delivery matters',
                'Community engagement activities'
              ]
            },
            {
              section_id: 'organizational_matters',
              title: '6. ORGANIZATIONAL MATTERS',
              items: [
                'Membership recruitment',
                'Branch activities planning',
                'Training and development'
              ]
            },
            {
              section_id: 'new_business',
              title: '7. NEW BUSINESS',
              items: [
                'New agenda items',
                'Motions and resolutions'
              ]
            },
            {
              section_id: 'closing',
              title: '8. CLOSING',
              items: [
                'Next meeting date and venue',
                'Closing remarks',
                'Revolutionary salute'
              ]
            }
          ],
          footer: {
            prepared_by: 'Branch Secretary\'s Office',
            contact: 'branch.secretary@effighters.org.za'
          }
        },
        is_default: true
      },

      // Minutes Templates
      {
        template_name: 'CCT Meeting Minutes',
        template_type: 'minutes',
        meeting_type_id: meetingTypes.find(t => t.type_name.includes('CCT'))?.type_id || null,
        hierarchy_level: 'National',
        template_content: {
          header: {
            organization: 'Economic Freedom Fighters',
            document_type: 'Meeting Minutes',
            meeting_type: 'Central Command Team Meeting',
            logo_url: '/assets/eff-logo.png'
          },
          meeting_details: {
            fields: ['date', 'time', 'venue', 'chairperson', 'secretary']
          },
          sections: [
            {
              section_id: 'attendance',
              title: 'ATTENDANCE',
              type: 'attendance_list',
              fields: ['present', 'apologies', 'absent']
            },
            {
              section_id: 'opening',
              title: 'OPENING',
              type: 'narrative',
              content: 'Meeting called to order at [TIME] by [CHAIRPERSON]'
            },
            {
              section_id: 'previous_minutes',
              title: 'CONFIRMATION OF PREVIOUS MINUTES',
              type: 'decision',
              fields: ['motion', 'seconder', 'decision']
            },
            {
              section_id: 'matters_arising',
              title: 'MATTERS ARISING',
              type: 'action_items',
              fields: ['item', 'responsible', 'status', 'due_date']
            },
            {
              section_id: 'reports',
              title: 'REPORTS PRESENTED',
              type: 'reports',
              subsections: [
                'President\'s Report',
                'Secretary General\'s Report',
                'Treasurer General\'s Report'
              ]
            },
            {
              section_id: 'decisions',
              title: 'DECISIONS MADE',
              type: 'decisions',
              fields: ['decision', 'rationale', 'vote_result']
            },
            {
              section_id: 'action_items',
              title: 'ACTION ITEMS',
              type: 'action_items',
              fields: ['action', 'responsible', 'due_date', 'priority']
            },
            {
              section_id: 'next_meeting',
              title: 'NEXT MEETING',
              type: 'info',
              fields: ['date', 'time', 'venue']
            },
            {
              section_id: 'closing',
              title: 'CLOSING',
              type: 'narrative',
              content: 'Meeting adjourned at [TIME]'
            }
          ],
          signatures: {
            chairperson: 'Meeting Chairperson',
            secretary: 'Meeting Secretary',
            date_approved: 'Date Approved'
          },
          footer: {
            prepared_by: 'Secretary General\'s Office',
            contact: 'secretary@effighters.org.za'
          }
        },
        is_default: true
      }
    ];
    
    // Insert templates
    console.log('\n📝 Inserting document templates...');
    for (const template of templates) {
      const [result] = await connection.execute(`
        INSERT INTO meeting_document_templates (
          template_name, template_type, meeting_type_id, hierarchy_level,
          template_content, is_default, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        template.template_name,
        template.template_type,
        template.meeting_type_id,
        template.hierarchy_level,
        JSON.stringify(template.template_content),
        template.is_default,
        true,
        1 // Default admin user
      ]);
      
      console.log(`   ✅ Created: ${template.template_name} (ID: ${result.insertId})`);
    }
    
    console.log('\n✅ Meeting document templates seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

seedMeetingDocumentTemplates().catch(console.error);
