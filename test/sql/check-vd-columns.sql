SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'voting_districts'
ORDER BY ordinal_position;
