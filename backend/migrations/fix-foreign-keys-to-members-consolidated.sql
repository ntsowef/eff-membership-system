-- Fix all foreign key constraints to reference members_consolidated instead of members
-- This is critical because the old members table is stale and missing newer members

-- 1. birthday_messages_sent
ALTER TABLE birthday_messages_sent DROP CONSTRAINT IF EXISTS birthday_messages_sent_member_id_fkey;
ALTER TABLE birthday_messages_sent ADD CONSTRAINT birthday_messages_sent_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 2. bulk_notification_recipients
ALTER TABLE bulk_notification_recipients DROP CONSTRAINT IF EXISTS bulk_notification_recipients_member_id_fkey;
ALTER TABLE bulk_notification_recipients ADD CONSTRAINT bulk_notification_recipients_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 3. documents
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_member_id_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 4. election_candidates
ALTER TABLE election_candidates DROP CONSTRAINT IF EXISTS election_candidates_member_id_fkey;
ALTER TABLE election_candidates ADD CONSTRAINT election_candidates_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 5. election_votes
ALTER TABLE election_votes DROP CONSTRAINT IF EXISTS election_votes_voter_member_id_fkey;
ALTER TABLE election_votes ADD CONSTRAINT election_votes_voter_member_id_fkey 
  FOREIGN KEY (voter_member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 6. financial_operations_audit
ALTER TABLE financial_operations_audit DROP CONSTRAINT IF EXISTS financial_operations_audit_member_id_fkey;
ALTER TABLE financial_operations_audit ADD CONSTRAINT financial_operations_audit_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 7-9. leadership_appointments (3 foreign keys)
ALTER TABLE leadership_appointments DROP CONSTRAINT IF EXISTS leadership_appointments_member_id_fkey;
ALTER TABLE leadership_appointments ADD CONSTRAINT leadership_appointments_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

ALTER TABLE leadership_appointments DROP CONSTRAINT IF EXISTS leadership_appointments_appointed_by_fkey;
ALTER TABLE leadership_appointments ADD CONSTRAINT leadership_appointments_appointed_by_fkey 
  FOREIGN KEY (appointed_by) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

ALTER TABLE leadership_appointments DROP CONSTRAINT IF EXISTS leadership_appointments_terminated_by_fkey;
ALTER TABLE leadership_appointments ADD CONSTRAINT leadership_appointments_terminated_by_fkey 
  FOREIGN KEY (terminated_by) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 10-12. leadership_election_candidates (3 foreign keys)
ALTER TABLE leadership_election_candidates DROP CONSTRAINT IF EXISTS leadership_election_candidates_member_id_fkey;
ALTER TABLE leadership_election_candidates ADD CONSTRAINT leadership_election_candidates_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

ALTER TABLE leadership_election_candidates DROP CONSTRAINT IF EXISTS leadership_election_candidates_nominated_by_fkey;
ALTER TABLE leadership_election_candidates ADD CONSTRAINT leadership_election_candidates_nominated_by_fkey 
  FOREIGN KEY (nominated_by) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

ALTER TABLE leadership_election_candidates DROP CONSTRAINT IF EXISTS leadership_election_candidates_seconded_by_fkey;
ALTER TABLE leadership_election_candidates ADD CONSTRAINT leadership_election_candidates_seconded_by_fkey 
  FOREIGN KEY (seconded_by) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 13. leadership_election_votes
ALTER TABLE leadership_election_votes DROP CONSTRAINT IF EXISTS leadership_election_votes_voter_id_fkey;
ALTER TABLE leadership_election_votes ADD CONSTRAINT leadership_election_votes_voter_id_fkey 
  FOREIGN KEY (voter_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 14. leadership_meeting_attendees
ALTER TABLE leadership_meeting_attendees DROP CONSTRAINT IF EXISTS leadership_meeting_attendees_member_id_fkey;
ALTER TABLE leadership_meeting_attendees ADD CONSTRAINT leadership_meeting_attendees_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 15. leadership_succession_plans
ALTER TABLE leadership_succession_plans DROP CONSTRAINT IF EXISTS leadership_succession_plans_successor_member_id_fkey;
ALTER TABLE leadership_succession_plans ADD CONSTRAINT leadership_succession_plans_successor_member_id_fkey 
  FOREIGN KEY (successor_member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 16. leadership_terms
ALTER TABLE leadership_terms DROP CONSTRAINT IF EXISTS leadership_terms_member_id_fkey;
ALTER TABLE leadership_terms ADD CONSTRAINT leadership_terms_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 17. meeting_action_items
ALTER TABLE meeting_action_items DROP CONSTRAINT IF EXISTS meeting_action_items_assigned_to_fkey;
ALTER TABLE meeting_action_items ADD CONSTRAINT meeting_action_items_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 18. meeting_agenda_items
ALTER TABLE meeting_agenda_items DROP CONSTRAINT IF EXISTS meeting_agenda_items_presenter_id_fkey;
ALTER TABLE meeting_agenda_items ADD CONSTRAINT meeting_agenda_items_presenter_id_fkey 
  FOREIGN KEY (presenter_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 19. meeting_attendance
ALTER TABLE meeting_attendance DROP CONSTRAINT IF EXISTS meeting_attendance_member_id_fkey;
ALTER TABLE meeting_attendance ADD CONSTRAINT meeting_attendance_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 20-21. meeting_decisions (2 foreign keys)
ALTER TABLE meeting_decisions DROP CONSTRAINT IF EXISTS meeting_decisions_proposed_by_fkey;
ALTER TABLE meeting_decisions ADD CONSTRAINT meeting_decisions_proposed_by_fkey 
  FOREIGN KEY (proposed_by) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

ALTER TABLE meeting_decisions DROP CONSTRAINT IF EXISTS meeting_decisions_seconded_by_fkey;
ALTER TABLE meeting_decisions ADD CONSTRAINT meeting_decisions_seconded_by_fkey 
  FOREIGN KEY (seconded_by) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 22-23. meetings (2 foreign keys)
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_chair_id_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_meeting_chair_id_fkey 
  FOREIGN KEY (meeting_chair_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_meeting_secretary_id_fkey;
ALTER TABLE meetings ADD CONSTRAINT meetings_meeting_secretary_id_fkey 
  FOREIGN KEY (meeting_secretary_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 24. member_cache_summary
ALTER TABLE member_cache_summary DROP CONSTRAINT IF EXISTS member_cache_summary_member_id_fkey;
ALTER TABLE member_cache_summary ADD CONSTRAINT member_cache_summary_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 25. member_notes
ALTER TABLE member_notes DROP CONSTRAINT IF EXISTS member_notes_member_id_fkey;
ALTER TABLE member_notes ADD CONSTRAINT member_notes_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 26. member_transfers
ALTER TABLE member_transfers DROP CONSTRAINT IF EXISTS member_transfers_member_id_fkey;
ALTER TABLE member_transfers ADD CONSTRAINT member_transfers_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 27. membership_history
ALTER TABLE membership_history DROP CONSTRAINT IF EXISTS memberships_member_id_fkey;
ALTER TABLE membership_history ADD CONSTRAINT memberships_member_id_fkey 
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 28. membership_renewals
ALTER TABLE membership_renewals DROP CONSTRAINT IF EXISTS membership_renewals_member_id_fkey;
ALTER TABLE membership_renewals ADD CONSTRAINT membership_renewals_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 29. notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_member_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 30. payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
ALTER TABLE payments ADD CONSTRAINT payments_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 31. renewal_approvals
ALTER TABLE renewal_approvals DROP CONSTRAINT IF EXISTS renewal_approvals_member_id_fkey;
ALTER TABLE renewal_approvals ADD CONSTRAINT renewal_approvals_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 32. renewal_audit_trail
ALTER TABLE renewal_audit_trail DROP CONSTRAINT IF EXISTS renewal_audit_trail_member_id_fkey;
ALTER TABLE renewal_audit_trail ADD CONSTRAINT renewal_audit_trail_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 33. renewal_bulk_operation_items
ALTER TABLE renewal_bulk_operation_items DROP CONSTRAINT IF EXISTS renewal_bulk_operation_items_member_id_fkey;
ALTER TABLE renewal_bulk_operation_items ADD CONSTRAINT renewal_bulk_operation_items_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 34. renewal_financial_audit_trail
ALTER TABLE renewal_financial_audit_trail DROP CONSTRAINT IF EXISTS renewal_financial_audit_trail_member_id_fkey;
ALTER TABLE renewal_financial_audit_trail ADD CONSTRAINT renewal_financial_audit_trail_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 35. renewal_manual_notes
ALTER TABLE renewal_manual_notes DROP CONSTRAINT IF EXISTS renewal_manual_notes_member_id_fkey;
ALTER TABLE renewal_manual_notes ADD CONSTRAINT renewal_manual_notes_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 36. renewal_pricing_overrides
ALTER TABLE renewal_pricing_overrides DROP CONSTRAINT IF EXISTS renewal_pricing_overrides_member_id_fkey;
ALTER TABLE renewal_pricing_overrides ADD CONSTRAINT renewal_pricing_overrides_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 37. sms_contact_list_members
ALTER TABLE sms_contact_list_members DROP CONSTRAINT IF EXISTS sms_contact_list_members_member_id_fkey;
ALTER TABLE sms_contact_list_members ADD CONSTRAINT sms_contact_list_members_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 38. sms_messages
ALTER TABLE sms_messages DROP CONSTRAINT IF EXISTS sms_messages_member_id_fkey;
ALTER TABLE sms_messages ADD CONSTRAINT sms_messages_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 39. users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_member_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 40. ward_compliance_audit_log
ALTER TABLE ward_compliance_audit_log DROP CONSTRAINT IF EXISTS fk_ward_audit_presiding_officer;
ALTER TABLE ward_compliance_audit_log ADD CONSTRAINT fk_ward_audit_presiding_officer
  FOREIGN KEY (presiding_officer_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 41. ward_delegates
ALTER TABLE ward_delegates DROP CONSTRAINT IF EXISTS fk_ward_delegates_member;
ALTER TABLE ward_delegates ADD CONSTRAINT fk_ward_delegates_member
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE CASCADE;

-- 42-43. ward_meeting_records (2 foreign keys)
ALTER TABLE ward_meeting_records DROP CONSTRAINT IF EXISTS fk_ward_meeting_presiding_officer;
ALTER TABLE ward_meeting_records ADD CONSTRAINT fk_ward_meeting_presiding_officer
  FOREIGN KEY (presiding_officer_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

ALTER TABLE ward_meeting_records DROP CONSTRAINT IF EXISTS fk_ward_meeting_secretary;
ALTER TABLE ward_meeting_records ADD CONSTRAINT fk_ward_meeting_secretary
  FOREIGN KEY (secretary_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- 44. application_approval_history
ALTER TABLE application_approval_history DROP CONSTRAINT IF EXISTS application_approval_history_member_id_fkey;
ALTER TABLE application_approval_history ADD CONSTRAINT application_approval_history_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES members_consolidated(member_id) ON DELETE SET NULL;

-- Add comment
COMMENT ON TABLE members_consolidated IS 'Single source of truth for all member data. All foreign keys should reference this table, not the old members table.';


