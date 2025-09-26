-- Renewal Pricing System Migration
-- This migration creates comprehensive renewal pricing tiers and configuration

START TRANSACTION;

-- 1. Create renewal_pricing_tiers table
CREATE TABLE IF NOT EXISTS renewal_pricing_tiers (
  tier_id INT AUTO_INCREMENT PRIMARY KEY,
  tier_name VARCHAR(100) NOT NULL UNIQUE,
  tier_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NULL,
  
  -- Pricing configuration
  base_renewal_fee DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  early_bird_discount_percent DECIMAL(5,2) DEFAULT 15.00,
  early_bird_days INT DEFAULT 60,
  late_fee_percent DECIMAL(5,2) DEFAULT 20.00,
  grace_period_days INT DEFAULT 30,
  
  -- Eligibility criteria
  min_age INT NULL,
  max_age INT NULL,
  requires_verification BOOLEAN DEFAULT FALSE,
  membership_duration_months INT DEFAULT 12,
  
  -- Administrative
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_pricing_tier_code (tier_code),
  INDEX idx_pricing_tier_active (is_active),
  INDEX idx_pricing_tier_order (display_order)
);

-- 2. Insert default renewal pricing tiers
INSERT INTO renewal_pricing_tiers (
  tier_name, tier_code, description, base_renewal_fee, 
  early_bird_discount_percent, early_bird_days, late_fee_percent, 
  grace_period_days, min_age, max_age, display_order
) VALUES
('Standard Membership', 'standard', 'Regular membership renewal for adult members', 500.00, 15.00, 60, 20.00, 30, 18, 64, 1),
('Student Membership', 'student', 'Discounted renewal for students and young adults', 250.00, 20.00, 60, 15.00, 45, 16, 25, 2),
('Senior Membership', 'senior', 'Special pricing for senior citizens', 300.00, 25.00, 90, 10.00, 60, 65, NULL, 3),
('Premium Membership', 'premium', 'Enhanced membership with additional benefits', 800.00, 10.00, 45, 25.00, 21, 18, NULL, 4),
('Complimentary Membership', 'complimentary', 'Free renewal for special cases', 0.00, 0.00, 0, 0.00, 90, NULL, NULL, 5);

-- 3. Create renewal_pricing_rules table for complex pricing logic
CREATE TABLE IF NOT EXISTS renewal_pricing_rules (
  rule_id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(100) NOT NULL,
  rule_type ENUM('discount', 'surcharge', 'override') NOT NULL,
  
  -- Rule conditions
  condition_type ENUM('age_range', 'province', 'membership_duration', 'payment_history', 'custom') NOT NULL,
  condition_value JSON NULL,
  
  -- Rule effects
  adjustment_type ENUM('percentage', 'fixed_amount') NOT NULL,
  adjustment_value DECIMAL(10,2) NOT NULL,
  max_adjustment DECIMAL(10,2) NULL,
  
  -- Rule metadata
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  valid_from DATE NULL,
  valid_until DATE NULL,
  
  -- Administrative
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_pricing_rule_type (rule_type),
  INDEX idx_pricing_rule_active (is_active),
  INDEX idx_pricing_rule_priority (priority)
);

-- 4. Insert default pricing rules
INSERT INTO renewal_pricing_rules (
  rule_name, rule_type, condition_type, condition_value, 
  adjustment_type, adjustment_value, description, priority
) VALUES
('Long-term Member Discount', 'discount', 'membership_duration', '{"min_years": 5}', 'percentage', 10.00, 'Additional 10% discount for members with 5+ years', 1),
('Rural Province Discount', 'discount', 'province', '{"provinces": ["Limpopo", "Northern Cape", "Eastern Cape"]}', 'percentage', 15.00, 'Additional discount for rural provinces', 2),
('Bulk Family Discount', 'discount', 'custom', '{"family_members": 3}', 'percentage', 20.00, 'Discount for families with 3+ members', 3),
('Payment History Bonus', 'discount', 'payment_history', '{"on_time_payments": 3}', 'percentage', 5.00, 'Bonus for consistent on-time payments', 4);

-- 5. Create renewal_pricing_overrides table for manual adjustments
CREATE TABLE IF NOT EXISTS renewal_pricing_overrides (
  override_id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  renewal_year YEAR NOT NULL,
  
  -- Override details
  original_amount DECIMAL(10,2) NOT NULL,
  override_amount DECIMAL(10,2) NOT NULL,
  override_reason TEXT NOT NULL,
  override_type ENUM('discount', 'waiver', 'adjustment', 'special_rate') NOT NULL,
  
  -- Approval workflow
  requested_by INT NOT NULL,
  approved_by INT NULL,
  approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  approval_date TIMESTAMP NULL,
  approval_notes TEXT NULL,
  
  -- Administrative
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_override_member (member_id),
  INDEX idx_override_year (renewal_year),
  INDEX idx_override_status (approval_status),
  INDEX idx_override_requested_by (requested_by),
  
  -- Unique constraint
  UNIQUE KEY uk_member_year_override (member_id, renewal_year)
);

-- 6. Update renewal_settings with new pricing configuration
INSERT INTO renewal_settings (setting_key, setting_value, setting_type, description) VALUES
('enable_dynamic_pricing', 'true', 'boolean', 'Enable dynamic pricing based on member characteristics'),
('default_pricing_tier', 'standard', 'string', 'Default pricing tier for new members'),
('enable_early_bird_discounts', 'true', 'boolean', 'Enable early bird discount system'),
('enable_late_fees', 'true', 'boolean', 'Enable late fee system'),
('enable_pricing_rules', 'true', 'boolean', 'Enable complex pricing rules'),
('require_override_approval', 'true', 'boolean', 'Require approval for pricing overrides'),
('max_discount_percent', '50.00', 'number', 'Maximum discount percentage allowed'),
('min_renewal_amount', '50.00', 'number', 'Minimum renewal amount (after all discounts)')
ON DUPLICATE KEY UPDATE 
  setting_value = VALUES(setting_value),
  updated_at = CURRENT_TIMESTAMP;

-- 7. Create view for renewal pricing calculations
CREATE OR REPLACE VIEW vw_member_renewal_pricing AS
SELECT 
  m.member_id,
  CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
  m.id_number,
  m.province_name,
  TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) as member_age,
  
  -- Determine pricing tier
  CASE 
    WHEN TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) < 25 THEN 'student'
    WHEN TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) >= 65 THEN 'senior'
    WHEN COALESCE(ms.membership_amount, 500) > 600 THEN 'premium'
    ELSE 'standard'
  END as suggested_pricing_tier,
  
  -- Current membership details
  COALESCE(ms.membership_amount, 500.00) as current_membership_amount,
  CASE 
    WHEN m.member_created_at IS NOT NULL THEN 
      DATE_ADD(m.member_created_at, INTERVAL 365 DAY)
    ELSE DATE_ADD(CURDATE(), INTERVAL 30 DAY)
  END as membership_expiry_date,
  
  CASE 
    WHEN m.member_created_at IS NOT NULL THEN 
      DATEDIFF(DATE_ADD(m.member_created_at, INTERVAL 365 DAY), CURDATE())
    ELSE 30
  END as days_until_expiry,
  
  -- Pricing tier details
  rpt.base_renewal_fee,
  rpt.early_bird_discount_percent,
  rpt.early_bird_days,
  rpt.late_fee_percent,
  rpt.grace_period_days

FROM vw_member_details m
LEFT JOIN memberships ms ON m.member_id = ms.member_id
LEFT JOIN renewal_pricing_tiers rpt ON rpt.tier_code = (
  CASE 
    WHEN TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) < 25 THEN 'student'
    WHEN TIMESTAMPDIFF(YEAR, m.date_of_birth, CURDATE()) >= 65 THEN 'senior'
    WHEN COALESCE(ms.membership_amount, 500) > 600 THEN 'premium'
    ELSE 'standard'
  END
)
WHERE rpt.is_active = TRUE;

-- 8. Create indexes for performance
CREATE INDEX idx_members_age ON members(date_of_birth);
CREATE INDEX idx_memberships_amount ON memberships(membership_amount);

COMMIT;
