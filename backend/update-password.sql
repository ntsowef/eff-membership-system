-- Update national admin password back to Admin@123
UPDATE users 
SET password = '$2a$10$tccrgtvB1IKh5kDN3w7DL.01Et0z3pKk2YRvprLfmXLpHI6KsPwYO', 
    updated_at = NOW() 
WHERE email = 'national.admin@eff.org.za';

-- Verify the update
SELECT email, 'Password updated successfully' as status 
FROM users 
WHERE email = 'national.admin@eff.org.za';
