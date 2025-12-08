#!/usr/bin/env python3
"""
Manually recreate vw_member_details_optimized to use members_consolidated
"""

import psycopg2

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

# The CREATE VIEW SQL
CREATE_VIEW_SQL = """
DROP VIEW IF EXISTS vw_member_details_optimized CASCADE;

CREATE OR REPLACE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    
    -- Pre-calculated membership number (from members_consolidated directly)
    COALESCE(m.membership_number, CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0'))) as membership_number,
    
    -- Geographic data with optimized joins (METRO SUPPORT)
    -- Use COALESCE to get province from parent municipality when direct join fails
    COALESCE(p.province_code, pp.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,
    
    -- District information (handle metros with parent municipalities)
    COALESCE(d.district_code, pd.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    
    -- Municipality information
    COALESCE(mu.municipality_code, m.municipality_code) as municipality_code,
    COALESCE(mu.municipality_name, m.municipality_name) as municipality_name,
    
    -- Ward information
    w.ward_code,
    w.ward_number,
    w.ward_name,
    
    -- Voting district and station information
    COALESCE(
        CAST(REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') AS VARCHAR),
        vd.voting_district_code
    ) as voting_district_code,
    COALESCE(vd.voting_district_name, 'Not Available') as voting_district_name,

    CAST(REPLACE(CAST(m.voter_district_code AS TEXT), '.0', '') AS VARCHAR) as voting_station_code,
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    
    -- Demographic information
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    
    -- Membership status (optimized) - CRITICAL FIELDS
    -- All membership data comes from members_consolidated directly (no separate memberships table)
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    
    -- CRITICAL: Include actual membership fields from members_consolidated
    m.expiry_date,
    m.last_payment_date,
    m.date_joined,
    m.membership_amount,
    
    -- Calculated fields for performance
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE THEN 
            (m.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry,
    
    -- Status information
    mst.is_active,
    mst.status_name

FROM members_consolidated m

-- Join membership status lookup table only
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id

-- Geographic joins with metro support
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code

-- Metro fallback: Join directly through member's municipality_code
LEFT JOIN municipalities mum ON m.municipality_code = mum.municipality_code
LEFT JOIN districts pd ON mum.district_code = pd.district_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code

-- Voting district and station joins
LEFT JOIN voting_districts vd ON
    CAST(REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') AS VARCHAR) = vd.voting_district_code
LEFT JOIN voting_stations vs ON
    vd.voting_district_code = vs.voting_district_code

-- Demographic joins
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id;
"""

def main():
    print("="*80)
    print("RECREATING vw_member_details_optimized VIEW")
    print("="*80)
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("\n🔄 Dropping and recreating view...")
        cursor.execute(CREATE_VIEW_SQL)
        conn.commit()
        print("✅ View recreated successfully!")
        
        # Verify
        print("\n" + "="*80)
        print("VERIFICATION")
        print("="*80)
        
        cursor.execute("SELECT COUNT(*) FROM vw_member_details_optimized")
        count = cursor.fetchone()[0]
        print(f"\nRow count: {count:,}")
        
        cursor.execute("SELECT COUNT(*) FROM members_consolidated")
        consolidated_count = cursor.fetchone()[0]
        print(f"members_consolidated count: {consolidated_count:,}")
        
        if count == consolidated_count:
            print("\n✅ Counts match!")
        else:
            print(f"\n⚠️  Difference: {abs(count - consolidated_count):,} rows")
        
        # Test query
        cursor.execute("""
            SELECT member_id, firstname, surname, membership_number, 
                   province_name, membership_status, expiry_date
            FROM vw_member_details_optimized
            LIMIT 3
        """)
        
        print("\nSample records:")
        for row in cursor.fetchall():
            print(f"  Member #{row[0]}: {row[1]} {row[2]}")
            print(f"    Membership: {row[3]}, Status: {row[5]}")
            print(f"    Province: {row[4]}, Expiry: {row[6]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "="*80)
        print("✅ SUCCESS!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()

