SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('messages', 'members', 'message_templates', 'communication_preferences')
ORDER BY table_name, column_name;
