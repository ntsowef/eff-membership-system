-- Add hierarchical fields to meeting_types table
-- This migration adds the required fields for hierarchical meeting management

BEGIN;

-- Add new columns to meeting_types table
ALTER TABLE meeting_types 
ADD COLUMN IF NOT EXISTS hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Provincial', 'Municipal', 'Branch')),
ADD COLUMN IF NOT EXISTS meeting_category VARCHAR(50) DEFAULT 'Regular' CHECK (meeting_category IN ('Regular', 'Assembly', 'Conference', 'Special', 'Emergency')),
ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(20) DEFAULT 'Ad-hoc' CHECK (frequency_type IN ('Weekly', 'Bi-weekly', 'Monthly', 'Bi-monthly', 'Quarterly', 'Semi-annually', 'Annually', 'Ad-hoc')),
ADD COLUMN IF NOT EXISTS auto_invite_rules JSONB,
ADD COLUMN IF NOT EXISTS max_notice_days INTEGER DEFAULT 30;

-- Clear existing meeting types to replace with hierarchical ones
DELETE FROM meeting_types;

-- Insert hierarchical meeting types with automatic invitation rules
INSERT INTO meeting_types (
  type_name, 
  type_code, 
  description, 
  hierarchy_level, 
  meeting_category, 
  default_duration_minutes, 
  requires_quorum, 
  min_notice_days, 
  max_notice_days,
  frequency_type,
  auto_invite_rules,
  is_active
) VALUES

-- NATIONAL LEVEL MEETINGS
(
  'CCT Meeting (Central Command Team)', 
  'cct_national', 
  'Quarterly Central Command Team meetings for national strategic planning and coordination', 
  'National', 
  'Regular', 
  240, 
  true, 
  14, 
  30,
  'Quarterly',
  '{
    "invitation_rules": [
      {
        "type": "position_based",
        "positions": [
          "President", "Deputy President", "Secretary General", "Deputy Secretary General", 
          "National Chairperson", "Treasurer General", "Youth President", "Youth Secretary General",
          "Women President", "Women Secretary General"
        ],
        "hierarchy_level": "National"
      },
      {
        "type": "position_based",
        "positions": ["Provincial Chairperson", "Provincial Secretary"],
        "hierarchy_level": "Provincial",
        "all_entities": true
      }
    ]
  }'::jsonb,
  true
),

(
  'War Council Meeting', 
  'war_council', 
  'Weekly War Council meetings for strategic decision making', 
  'National', 
  'Regular', 
  180, 
  true, 
  3, 
  7,
  'Weekly',
  '{
    "invitation_rules": [
      {
        "type": "war_council_members",
        "description": "All War Council members as defined in leadership structure"
      }
    ]
  }'::jsonb,
  true
),

-- PROVINCIAL LEVEL MEETINGS
(
  'PCT Meeting (Provincial Command Team)', 
  'pct_provincial', 
  'Bi-monthly Provincial Command Team meetings for provincial coordination', 
  'Provincial', 
  'Regular', 
  180, 
  true, 
  10, 
  21,
  'Bi-monthly',
  '{
    "invitation_rules": [
      {
        "type": "position_based",
        "positions": [
          "Provincial Chairperson", "Provincial Secretary", "Provincial Treasurer",
          "Provincial Youth Leader", "Provincial Women Leader"
        ],
        "hierarchy_level": "Provincial",
        "entity_specific": true
      }
    ]
  }'::jsonb,
  true
),

(
  'Provincial AGM', 
  'provincial_agm', 
  'Semi-annual Provincial Annual General Meeting for all provincial members', 
  'Provincial', 
  'Assembly', 
  360, 
  true, 
  30, 
  60,
  'Semi-annually',
  '{
    "invitation_rules": [
      {
        "type": "all_members",
        "hierarchy_level": "Provincial",
        "entity_specific": true,
        "description": "All members within the specific province"
      }
    ]
  }'::jsonb,
  true
),

-- MUNICIPAL/SUB-REGIONAL LEVEL MEETINGS
(
  'Sub-Regional Command Team Meeting', 
  'srct_municipal', 
  'Monthly Sub-Regional Command Team meetings for municipal leadership coordination', 
  'Municipal', 
  'Regular', 
  150, 
  true, 
  7, 
  14,
  'Monthly',
  '{
    "invitation_rules": [
      {
        "type": "position_based",
        "positions": [
          "Municipal Chairperson", "Municipal Secretary", "Municipal Treasurer",
          "Municipal Youth Leader", "Municipal Women Leader"
        ],
        "hierarchy_level": "Municipal",
        "entity_specific": true
      }
    ]
  }'::jsonb,
  true
),

-- BRANCH LEVEL MEETINGS
(
  'BCT Meeting (Branch Command Team)', 
  'bct_branch', 
  'Monthly Branch Command Team meetings for branch leadership coordination', 
  'Branch', 
  'Regular', 
  120, 
  true, 
  7, 
  14,
  'Monthly',
  '{
    "invitation_rules": [
      {
        "type": "position_based",
        "positions": [
          "Branch Chairperson", "Branch Secretary", "Branch Treasurer",
          "Branch Youth Leader", "Branch Women Leader"
        ],
        "hierarchy_level": "Branch",
        "entity_specific": true
      }
    ]
  }'::jsonb,
  true
),

(
  'BGA Meeting (Branch General Assembly)', 
  'bga_branch', 
  'Annual Branch General Assembly for all branch members', 
  'Branch', 
  'Assembly', 
  240, 
  true, 
  21, 
  45,
  'Annually',
  '{
    "invitation_rules": [
      {
        "type": "all_members",
        "hierarchy_level": "Branch",
        "entity_specific": true,
        "description": "All branch members"
      }
    ]
  }'::jsonb,
  true
),

(
  'BPA Meeting (Branch People\'s Assembly)', 
  'bpa_branch', 
  'Bi-annual Branch People\'s Assembly - Branch leadership conference', 
  'Branch', 
  'Conference', 
  300, 
  true, 
  30, 
  60,
  'Bi-annually',
  '{
    "invitation_rules": [
      {
        "type": "position_based",
        "positions": [
          "Branch Chairperson", "Branch Secretary", "Branch Treasurer",
          "Branch Youth Leader", "Branch Women Leader", "Branch Committee Member"
        ],
        "hierarchy_level": "Branch",
        "entity_specific": true,
        "description": "Branch leadership positions"
      }
    ]
  }'::jsonb,
  true
);

COMMIT;
