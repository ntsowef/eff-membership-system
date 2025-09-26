-- =====================================================================================
-- EFF MEMBERSHIP MANAGEMENT SYSTEM - ADDITIONAL ANALYTICS VIEWS
-- =====================================================================================
-- Version: 1.0
-- Created: 2025-01-23
-- Purpose: Comprehensive analytics and dashboard views for reporting and business intelligence
-- Compatible with: PostgreSQL 12+
-- =====================================================================================

-- Start transaction
BEGIN;

-- =====================================================================================
-- LEADERSHIP MANAGEMENT ANALYTICS VIEWS
-- =====================================================================================

-- Leadership Structure Overview View
CREATE OR REPLACE VIEW vw_leadership_structure_analytics AS
SELECT
    r.role_name,
    r.role_code,
    
    -- Position statistics
    COUNT(u.user_id) as positions_filled,
    COUNT(CASE WHEN u.is_active = TRUE THEN 1 END) as active_positions,
    COUNT(CASE WHEN u.is_active = FALSE THEN 1 END) as inactive_positions,
    
    -- Geographic distribution
    COUNT(DISTINCT u.province_code) as provinces_covered,
    COUNT(DISTINCT u.district_code) as districts_covered,
    COUNT(DISTINCT u.municipal_code) as municipalities_covered,
    COUNT(DISTINCT u.ward_code) as wards_covered,
    
    -- Administrative levels
    COUNT(CASE WHEN u.admin_level = 'national' THEN 1 END) as national_positions,
    COUNT(CASE WHEN u.admin_level = 'province' THEN 1 END) as provincial_positions,
    COUNT(CASE WHEN u.admin_level = 'district' THEN 1 END) as district_positions,
    COUNT(CASE WHEN u.admin_level = 'municipality' THEN 1 END) as municipal_positions,
    COUNT(CASE WHEN u.admin_level = 'ward' THEN 1 END) as ward_positions,
    
    -- Member association
    COUNT(CASE WHEN u.member_id IS NOT NULL THEN 1 END) as positions_with_members,
    COUNT(CASE WHEN u.member_id IS NULL THEN 1 END) as positions_without_members,
    
    -- Activity metrics
    COUNT(CASE WHEN u.last_login_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
    COUNT(CASE WHEN u.last_login_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_last_7_days,
    
    CURRENT_TIMESTAMP as last_updated

FROM roles r
LEFT JOIN users u ON r.role_id = u.role_id
GROUP BY r.role_id, r.role_name, r.role_code
ORDER BY positions_filled DESC;

-- Geographic Leadership Coverage View
CREATE OR REPLACE VIEW vw_geographic_leadership_coverage AS
SELECT
    p.province_code,
    p.province_name,
    
    -- Leadership presence
    COUNT(DISTINCT u.user_id) as total_leaders,
    COUNT(DISTINCT CASE WHEN u.is_active = TRUE THEN u.user_id END) as active_leaders,
    COUNT(DISTINCT u.role_id) as different_roles_present,
    
    -- Administrative coverage
    COUNT(DISTINCT CASE WHEN u.admin_level = 'province' THEN u.user_id END) as provincial_leaders,
    COUNT(DISTINCT CASE WHEN u.admin_level = 'district' THEN u.user_id END) as district_leaders,
    COUNT(DISTINCT CASE WHEN u.admin_level = 'municipality' THEN u.user_id END) as municipal_leaders,
    COUNT(DISTINCT CASE WHEN u.admin_level = 'ward' THEN u.user_id END) as ward_leaders,
    
    -- Coverage ratios
    ROUND(
        COUNT(DISTINCT CASE WHEN u.admin_level = 'district' THEN u.user_id END) * 100.0 /
        NULLIF(COUNT(DISTINCT d.district_code), 0), 2
    ) as district_leadership_coverage_percentage,
    
    ROUND(
        COUNT(DISTINCT CASE WHEN u.admin_level = 'municipality' THEN u.user_id END) * 100.0 /
        NULLIF(COUNT(DISTINCT mu.municipality_code), 0), 2
    ) as municipal_leadership_coverage_percentage,
    
    ROUND(
        COUNT(DISTINCT CASE WHEN u.admin_level = 'ward' THEN u.user_id END) * 100.0 /
        NULLIF(COUNT(DISTINCT w.ward_code), 0), 2
    ) as ward_leadership_coverage_percentage,
    
    -- Member-leader ratio
    ROUND(
        COUNT(DISTINCT m.member_id) * 1.0 /
        NULLIF(COUNT(DISTINCT CASE WHEN u.is_active = TRUE THEN u.user_id END), 0), 2
    ) as members_per_active_leader,
    
    CURRENT_TIMESTAMP as last_updated

FROM provinces p
LEFT JOIN districts d ON p.province_code = d.province_code
LEFT JOIN municipalities mu ON d.district_code = mu.district_code
LEFT JOIN wards w ON mu.municipality_code = w.municipality_code
LEFT JOIN users u ON (
    u.province_code = p.province_code OR
    u.district_code = d.district_code OR
    u.municipal_code = mu.municipality_code OR
    u.ward_code = w.ward_code
)
LEFT JOIN members m ON w.ward_code = m.ward_code
GROUP BY p.province_code, p.province_name
ORDER BY total_leaders DESC;

-- =====================================================================================
-- FINANCIAL AND PAYMENT ANALYTICS VIEWS
-- =====================================================================================

-- Payment Analytics Dashboard View
CREATE OR REPLACE VIEW vw_payment_analytics AS
SELECT
    DATE_TRUNC('month', ms.last_payment_date) as payment_month,
    TO_CHAR(ms.last_payment_date, 'YYYY-MM') as payment_month_label,
    
    -- Payment statistics
    COUNT(ms.membership_id) as total_payments,
    SUM(ms.membership_amount) as total_revenue,
    AVG(ms.membership_amount) as average_payment_amount,
    
    -- Payment methods
    COUNT(CASE WHEN ms.payment_method = 'Cash' THEN 1 END) as cash_payments,
    COUNT(CASE WHEN ms.payment_method = 'Card' THEN 1 END) as card_payments,
    COUNT(CASE WHEN ms.payment_method = 'EFT' THEN 1 END) as eft_payments,
    COUNT(CASE WHEN ms.payment_method = 'Mobile' THEN 1 END) as mobile_payments,
    
    -- Payment status
    COUNT(CASE WHEN ms.payment_status = 'Completed' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN ms.payment_status = 'Pending' THEN 1 END) as pending_payments,
    COUNT(CASE WHEN ms.payment_status = 'Failed' THEN 1 END) as failed_payments,
    
    -- Success rate
    ROUND(
        (COUNT(CASE WHEN ms.payment_status = 'Completed' THEN 1 END) * 100.0) /
        NULLIF(COUNT(ms.membership_id), 0), 2
    ) as payment_success_rate,
    
    -- Subscription type breakdown
    COUNT(CASE WHEN st.subscription_name = 'Annual Membership' THEN 1 END) as annual_payments,
    COUNT(CASE WHEN st.subscription_name = 'Student Membership' THEN 1 END) as student_payments,
    COUNT(CASE WHEN st.subscription_name = 'Senior Membership' THEN 1 END) as senior_payments,
    
    -- Revenue by subscription type
    SUM(CASE WHEN st.subscription_name = 'Annual Membership' THEN ms.membership_amount ELSE 0 END) as annual_revenue,
    SUM(CASE WHEN st.subscription_name = 'Student Membership' THEN ms.membership_amount ELSE 0 END) as student_revenue,
    SUM(CASE WHEN st.subscription_name = 'Senior Membership' THEN ms.membership_amount ELSE 0 END) as senior_revenue,
    
    -- Geographic revenue distribution
    SUM(CASE WHEN p.province_name = 'Gauteng' THEN ms.membership_amount ELSE 0 END) as gauteng_revenue,
    SUM(CASE WHEN p.province_name = 'Western Cape' THEN ms.membership_amount ELSE 0 END) as western_cape_revenue,
    SUM(CASE WHEN p.province_name = 'KwaZulu-Natal' THEN ms.membership_amount ELSE 0 END) as kwazulu_natal_revenue,
    
    CURRENT_TIMESTAMP as last_updated

FROM memberships ms
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id
LEFT JOIN members m ON ms.member_id = m.member_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE ms.last_payment_date IS NOT NULL
  AND ms.last_payment_date >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', ms.last_payment_date), TO_CHAR(ms.last_payment_date, 'YYYY-MM')
ORDER BY payment_month DESC;

-- Revenue Forecasting View
CREATE OR REPLACE VIEW vw_revenue_forecasting AS
SELECT
    DATE_TRUNC('month', ms.expiry_date) as renewal_month,
    TO_CHAR(ms.expiry_date, 'YYYY-MM') as renewal_month_label,
    
    -- Potential revenue from renewals
    COUNT(ms.membership_id) as memberships_expiring,
    SUM(ms.membership_amount) as potential_renewal_revenue,
    AVG(ms.membership_amount) as average_renewal_amount,
    
    -- Historical renewal rates for forecasting
    COUNT(mr.renewal_id) as historical_renewal_attempts,
    COUNT(CASE WHEN mr.renewal_status = 'Completed' THEN 1 END) as historical_successful_renewals,
    
    ROUND(
        (COUNT(CASE WHEN mr.renewal_status = 'Completed' THEN 1 END) * 100.0) /
        NULLIF(COUNT(ms.membership_id), 0), 2
    ) as historical_renewal_rate,
    
    -- Forecasted revenue based on historical rates
    ROUND(
        SUM(ms.membership_amount) * 
        (COUNT(CASE WHEN mr.renewal_status = 'Completed' THEN 1 END) * 1.0 / NULLIF(COUNT(ms.membership_id), 0))
    ) as forecasted_renewal_revenue,
    
    -- Geographic breakdown
    COUNT(CASE WHEN p.province_name = 'Gauteng' THEN 1 END) as gauteng_expiring,
    COUNT(CASE WHEN p.province_name = 'Western Cape' THEN 1 END) as western_cape_expiring,
    COUNT(CASE WHEN p.province_name = 'KwaZulu-Natal' THEN 1 END) as kwazulu_natal_expiring,
    
    -- Subscription type breakdown
    COUNT(CASE WHEN st.subscription_name = 'Annual Membership' THEN 1 END) as annual_expiring,
    COUNT(CASE WHEN st.subscription_name = 'Student Membership' THEN 1 END) as student_expiring,
    COUNT(CASE WHEN st.subscription_name = 'Senior Membership' THEN 1 END) as senior_expiring,
    
    CURRENT_TIMESTAMP as last_updated

FROM memberships ms
LEFT JOIN subscription_types st ON ms.subscription_type_id = st.subscription_type_id
LEFT JOIN members m ON ms.member_id = m.member_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN membership_renewals mr ON ms.membership_id = mr.membership_id
WHERE ms.expiry_date >= CURRENT_DATE
  AND ms.expiry_date <= CURRENT_DATE + INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', ms.expiry_date), TO_CHAR(ms.expiry_date, 'YYYY-MM')
ORDER BY renewal_month;

-- =====================================================================================
-- OPERATIONAL EFFICIENCY VIEWS
-- =====================================================================================

-- Application Processing Efficiency View
CREATE OR REPLACE VIEW vw_application_processing_efficiency AS
SELECT
    DATE_TRUNC('week', ma.created_at) as application_week,
    TO_CHAR(ma.created_at, 'YYYY-"W"WW') as week_label,
    
    -- Application volume
    COUNT(ma.application_id) as total_applications,
    COUNT(CASE WHEN ma.status = 'Submitted' THEN 1 END) as submitted_applications,
    COUNT(CASE WHEN ma.status = 'Under Review' THEN 1 END) as under_review_applications,
    COUNT(CASE WHEN ma.status = 'Approved' THEN 1 END) as approved_applications,
    COUNT(CASE WHEN ma.status = 'Rejected' THEN 1 END) as rejected_applications,
    
    -- Processing efficiency metrics
    ROUND(
        (COUNT(CASE WHEN ma.status IN ('Approved', 'Rejected') THEN 1 END) * 100.0) /
        NULLIF(COUNT(ma.application_id), 0), 2
    ) as processing_completion_rate,
    
    ROUND(
        (COUNT(CASE WHEN ma.status = 'Approved' THEN 1 END) * 100.0) /
        NULLIF(COUNT(CASE WHEN ma.status IN ('Approved', 'Rejected') THEN 1 END), 0), 2
    ) as approval_rate,
    
    -- Processing time analysis
    AVG(
        CASE WHEN ma.reviewed_at IS NOT NULL AND ma.submitted_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ma.reviewed_at - ma.submitted_at))/86400
        ELSE NULL END
    ) as average_processing_days,
    
    AVG(
        CASE WHEN ma.approved_at IS NOT NULL AND ma.submitted_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (ma.approved_at - ma.submitted_at))/86400
        ELSE NULL END
    ) as average_approval_days,
    
    -- Geographic distribution
    COUNT(DISTINCT w.ward_code) as wards_with_applications,
    COUNT(DISTINCT mu.municipality_code) as municipalities_with_applications,
    COUNT(DISTINCT p.province_code) as provinces_with_applications,
    
    -- Application types
    COUNT(CASE WHEN ma.application_type = 'New' THEN 1 END) as new_applications,
    COUNT(CASE WHEN ma.application_type = 'Renewal' THEN 1 END) as renewal_applications,
    COUNT(CASE WHEN ma.application_type = 'Transfer' THEN 1 END) as transfer_applications,
    
    CURRENT_TIMESTAMP as last_updated

FROM membership_applications ma
LEFT JOIN wards w ON ma.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
WHERE ma.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('week', ma.created_at), TO_CHAR(ma.created_at, 'YYYY-"W"WW')
ORDER BY application_week DESC;

COMMIT;

-- Display completion message
SELECT 'Additional analytics views created successfully!' as message;
