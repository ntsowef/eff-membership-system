-- =====================================================================================
-- MISSING TABLES CREATION - OUTSTANDING TABLES AND VIEWS
-- =====================================================================================
-- Purpose: Create all missing tables referenced in stored procedures and backend code
-- Tables: leadership_appointments, user_activity_logs, payments, leadership_positions
-- =====================================================================================

-- =====================================================================================
-- 1. LEADERSHIP POSITIONS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS leadership_positions (
    id SERIAL PRIMARY KEY,
    position_name VARCHAR(255) NOT NULL,
    position_code VARCHAR(50) NOT NULL UNIQUE,
    position_description TEXT,
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'District', 'Municipality', 'Ward')),
    position_category VARCHAR(50) DEFAULT 'Executive', -- 'Executive', 'Committee', 'Deployment', 'Advisory'
    is_core_position BOOLEAN DEFAULT FALSE,
    requires_election BOOLEAN DEFAULT TRUE,
    term_duration_months INTEGER DEFAULT 60, -- 5 years default
    max_concurrent_appointments INTEGER DEFAULT 1,
    position_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default leadership positions
INSERT INTO leadership_positions (position_name, position_code, hierarchy_level, position_category, is_core_position, requires_election, position_order) VALUES
-- National Leadership
('President', 'PRES', 'National', 'Executive', TRUE, TRUE, 1),
('Deputy President', 'DPRES', 'National', 'Executive', TRUE, TRUE, 2),
('Secretary General', 'SG', 'National', 'Executive', TRUE, TRUE, 3),
('Deputy Secretary General', 'DSG', 'National', 'Executive', TRUE, TRUE, 4),
('National Chairperson', 'NCHAIR', 'National', 'Executive', TRUE, TRUE, 5),
('Treasurer General', 'TG', 'National', 'Executive', TRUE, TRUE, 6),

-- Provincial Leadership
('Provincial Chairperson', 'PCHAIR', 'Province', 'Executive', TRUE, TRUE, 10),
('Provincial Secretary', 'PSEC', 'Province', 'Executive', TRUE, TRUE, 11),
('Provincial Treasurer', 'PTREAS', 'Province', 'Executive', TRUE, TRUE, 12),
('Provincial Deputy Chairperson', 'PDCHAIR', 'Province', 'Executive', FALSE, TRUE, 13),

-- Municipal Leadership
('Municipal Chairperson', 'MCHAIR', 'Municipality', 'Executive', TRUE, TRUE, 20),
('Municipal Secretary', 'MSEC', 'Municipality', 'Executive', TRUE, TRUE, 21),
('Municipal Treasurer', 'MTREAS', 'Municipality', 'Executive', TRUE, TRUE, 22),

-- Ward Leadership
('Ward Chairperson', 'WCHAIR', 'Ward', 'Executive', TRUE, TRUE, 30),
('Ward Secretary', 'WSEC', 'Ward', 'Executive', TRUE, TRUE, 31),
('Ward Treasurer', 'WTREAS', 'Ward', 'Executive', TRUE, TRUE, 32),

-- Special Deployments
('CCT Deployee - Eastern Cape', 'CCT_EC', 'Province', 'Deployment', TRUE, FALSE, 100),
('CCT Deployee - Free State', 'CCT_FS', 'Province', 'Deployment', TRUE, FALSE, 101),
('CCT Deployee - Gauteng', 'CCT_GP', 'Province', 'Deployment', TRUE, FALSE, 102),
('CCT Deployee - KwaZulu-Natal', 'CCT_KZN', 'Province', 'Deployment', TRUE, FALSE, 103),
('CCT Deployee - Limpopo', 'CCT_LP', 'Province', 'Deployment', TRUE, FALSE, 104),
('CCT Deployee - Mpumalanga', 'CCT_MP', 'Province', 'Deployment', TRUE, FALSE, 105),
('CCT Deployee - Northern Cape', 'CCT_NC', 'Province', 'Deployment', TRUE, FALSE, 106),
('CCT Deployee - North West', 'CCT_NW', 'Province', 'Deployment', TRUE, FALSE, 107),
('CCT Deployee - Western Cape', 'CCT_WC', 'Province', 'Deployment', TRUE, FALSE, 108)

ON CONFLICT (position_code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leadership_positions_hierarchy ON leadership_positions(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_leadership_positions_category ON leadership_positions(position_category);
CREATE INDEX IF NOT EXISTS idx_leadership_positions_active ON leadership_positions(is_active);

-- =====================================================================================
-- 2. LEADERSHIP APPOINTMENTS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS leadership_appointments (
    id SERIAL PRIMARY KEY,
    position_id INTEGER NOT NULL REFERENCES leadership_positions(id),
    member_id INTEGER NOT NULL REFERENCES members(member_id),
    
    -- Geographic and hierarchy information
    hierarchy_level VARCHAR(20) CHECK (hierarchy_level IN ('National', 'Province', 'District', 'Municipality', 'Ward')),
    entity_id INTEGER, -- References the specific geographic entity (province_id, municipality_id, ward_id, etc.)
    
    -- Appointment details
    appointment_type VARCHAR(20) CHECK (appointment_type IN ('Elected', 'Appointed', 'Acting', 'Interim')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    appointment_status VARCHAR(20) CHECK (appointment_status IN ('Active', 'Inactive', 'Completed', 'Terminated')) NOT NULL DEFAULT 'Active',
    
    -- Appointment authority
    appointed_by INTEGER REFERENCES members(member_id),
    appointment_notes TEXT,
    
    -- Termination details
    termination_reason TEXT,
    terminated_by INTEGER REFERENCES members(member_id),
    terminated_at TIMESTAMP,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(position_id, member_id, start_date), -- Prevent duplicate appointments
    CHECK (end_date IS NULL OR end_date >= start_date),
    CHECK (terminated_at IS NULL OR appointment_status = 'Terminated')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_member ON leadership_appointments(member_id);
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_position ON leadership_appointments(position_id);
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_status ON leadership_appointments(appointment_status);
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_hierarchy ON leadership_appointments(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_dates ON leadership_appointments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leadership_appointments_entity ON leadership_appointments(entity_id, hierarchy_level);

-- =====================================================================================
-- 3. USER ACTIVITY LOGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    
    -- Activity details
    action_type VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', etc.
    resource_type VARCHAR(50), -- 'MEMBER', 'CAMPAIGN', 'REPORT', 'SYSTEM', etc.
    resource_id INTEGER, -- ID of the affected resource
    
    -- Activity description
    description TEXT,
    
    -- Request details
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    request_url TEXT,
    
    -- Response details
    response_status INTEGER, -- HTTP status code
    response_time_ms INTEGER, -- Response time in milliseconds
    
    -- Additional metadata
    metadata JSONB, -- Additional structured data
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX (user_id, created_at),
    INDEX (action_type, created_at),
    INDEX (resource_type, resource_id),
    INDEX (created_at DESC)
);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_date ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_resource ON user_activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_ip ON user_activity_logs(ip_address);

-- =====================================================================================
-- 4. PAYMENTS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    
    -- Member and membership information
    member_id INTEGER REFERENCES members(member_id),
    membership_id INTEGER REFERENCES memberships(membership_id),
    
    -- Payment details
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('Card', 'Cash', 'EFT', 'Mobile', 'Other')) NOT NULL,
    payment_provider VARCHAR(50), -- 'Peach', 'PayGate', 'Cash', etc.
    
    -- Amount information
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ZAR',
    
    -- Payment status
    payment_status VARCHAR(20) CHECK (payment_status IN ('Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Refunded')) NOT NULL DEFAULT 'Pending',
    
    -- Payment gateway information
    gateway_transaction_id VARCHAR(255),
    gateway_reference VARCHAR(255),
    gateway_response TEXT,
    
    -- Payment dates
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Payment purpose
    payment_type VARCHAR(30) CHECK (payment_type IN ('Registration', 'Renewal', 'Upgrade', 'Donation', 'Fine', 'Other')) NOT NULL,
    description TEXT,
    
    -- Receipt information
    receipt_number VARCHAR(50) UNIQUE,
    receipt_issued_at TIMESTAMP,
    receipt_sent_to VARCHAR(255), -- Email address where receipt was sent
    
    -- Verification (for cash payments)
    verified_by INTEGER REFERENCES users(user_id),
    verified_at TIMESTAMP,
    verification_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (amount > 0),
    CHECK (processed_at IS NULL OR processed_at >= payment_date),
    CHECK (completed_at IS NULL OR completed_at >= payment_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_membership ON payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(payment_provider);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON payments(gateway_transaction_id);

-- =====================================================================================
-- 5. TRIGGERS FOR UPDATED_AT COLUMNS
-- =====================================================================================

-- Trigger for leadership_positions
CREATE TRIGGER update_leadership_positions_updated_at 
    BEFORE UPDATE ON leadership_positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for leadership_appointments
CREATE TRIGGER update_leadership_appointments_updated_at 
    BEFORE UPDATE ON leadership_appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payments
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- 6. ADDITIONAL MISSING VIEWS
-- =====================================================================================

-- Leadership hierarchy view
CREATE OR REPLACE VIEW vw_leadership_hierarchy AS
SELECT 
    la.id as appointment_id,
    la.member_id,
    CONCAT(m.firstname, ' ', COALESCE(m.surname, '')) as member_name,
    m.cell_number,
    m.email,
    
    -- Position information
    lp.position_name,
    lp.position_code,
    lp.hierarchy_level,
    lp.position_category,
    lp.is_core_position,
    
    -- Appointment details
    la.appointment_type,
    la.start_date,
    la.end_date,
    la.appointment_status,
    
    -- Geographic information
    CASE 
        WHEN la.hierarchy_level = 'Province' THEN p.province_name
        WHEN la.hierarchy_level = 'Municipality' THEN mu.municipality_name
        WHEN la.hierarchy_level = 'Ward' THEN w.ward_name
        ELSE 'National'
    END as entity_name,
    
    CASE 
        WHEN la.hierarchy_level = 'Province' THEN p.province_code
        WHEN la.hierarchy_level = 'Municipality' THEN mu.municipality_code
        WHEN la.hierarchy_level = 'Ward' THEN w.ward_code
        ELSE 'NAT'
    END as entity_code,
    
    -- Appointment authority
    CONCAT(appointer.firstname, ' ', COALESCE(appointer.surname, '')) as appointed_by_name,
    la.appointment_notes,
    
    -- Status indicators
    CASE 
        WHEN la.appointment_status = 'Active' AND (la.end_date IS NULL OR la.end_date >= CURRENT_DATE) THEN TRUE
        ELSE FALSE
    END as is_currently_active,
    
    -- Audit information
    la.created_at,
    la.updated_at

FROM leadership_appointments la
JOIN leadership_positions lp ON la.position_id = lp.id
JOIN members m ON la.member_id = m.member_id
LEFT JOIN members appointer ON la.appointed_by = appointer.member_id
LEFT JOIN provinces p ON la.entity_id = p.province_id AND la.hierarchy_level = 'Province'
LEFT JOIN municipalities mu ON la.entity_id = mu.municipality_id AND la.hierarchy_level = 'Municipality'
LEFT JOIN wards w ON la.entity_id = w.ward_id AND la.hierarchy_level = 'Ward'
ORDER BY lp.position_order, la.start_date DESC;

-- Payment analytics view
CREATE OR REPLACE VIEW vw_payment_analytics AS
SELECT 
    DATE_TRUNC('month', p.payment_date) as payment_month,
    TO_CHAR(p.payment_date, 'YYYY-MM') as month_year,
    
    -- Payment counts
    COUNT(*) as total_payments,
    COUNT(CASE WHEN p.payment_status = 'Completed' THEN 1 END) as completed_payments,
    COUNT(CASE WHEN p.payment_status = 'Failed' THEN 1 END) as failed_payments,
    COUNT(CASE WHEN p.payment_status = 'Pending' THEN 1 END) as pending_payments,
    
    -- Payment amounts
    SUM(CASE WHEN p.payment_status = 'Completed' THEN p.amount ELSE 0 END) as total_amount,
    AVG(CASE WHEN p.payment_status = 'Completed' THEN p.amount ELSE NULL END) as average_amount,
    
    -- Payment methods
    COUNT(CASE WHEN p.payment_method = 'Card' AND p.payment_status = 'Completed' THEN 1 END) as card_payments,
    COUNT(CASE WHEN p.payment_method = 'Cash' AND p.payment_status = 'Completed' THEN 1 END) as cash_payments,
    COUNT(CASE WHEN p.payment_method = 'EFT' AND p.payment_status = 'Completed' THEN 1 END) as eft_payments,
    
    -- Payment types
    COUNT(CASE WHEN p.payment_type = 'Registration' AND p.payment_status = 'Completed' THEN 1 END) as registration_payments,
    COUNT(CASE WHEN p.payment_type = 'Renewal' AND p.payment_status = 'Completed' THEN 1 END) as renewal_payments,
    
    -- Success rate
    ROUND(
        (COUNT(CASE WHEN p.payment_status = 'Completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
    ) as success_rate_percent

FROM payments p
WHERE p.payment_date >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', p.payment_date), TO_CHAR(p.payment_date, 'YYYY-MM')
ORDER BY payment_month DESC;

SELECT 'Missing Tables and Views Created Successfully!' as result;
