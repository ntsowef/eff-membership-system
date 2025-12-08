import psycopg2

c = psycopg2.connect(host='localhost', user='eff_admin', password='Frames!123', database='eff_membership_database')
r = c.cursor()

print("Creating view...")

sql = """
CREATE VIEW vw_member_details_optimized AS
SELECT 
    m.member_id,
    m.id_number,
    m.firstname,
    COALESCE(m.surname, '') as surname,
    COALESCE(m.email, '') as email,
    COALESCE(m.cell_number, '') as cell_number,
    m.created_at as member_created_at,
    COALESCE(m.membership_number, CONCAT('MEM', LPAD(m.member_id::TEXT, 6, '0'))) as membership_number,
    COALESCE(p.province_code, pp.province_code) as province_code,
    COALESCE(p.province_name, pp.province_name) as province_name,
    COALESCE(d.district_code, pd.district_code) as district_code,
    COALESCE(d.district_name, pd.district_name) as district_name,
    COALESCE(mu.municipality_code, m.municipality_code) as municipality_code,
    COALESCE(mu.municipality_name, m.municipality_name) as municipality_name,
    w.ward_code,
    w.ward_number,
    w.ward_name,
    COALESCE(
        CAST(REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') AS VARCHAR),
        vd.voting_district_code
    ) as voting_district_code,
    COALESCE(vd.voting_district_name, 'Not Available') as voting_district_name,
    CAST(REPLACE(CAST(m.voter_district_code AS TEXT), '.0', '') AS VARCHAR) as voting_station_code,
    COALESCE(vs.station_name, 'Not Available') as voting_station_name,
    COALESCE(g.gender_name, 'Unknown') as gender_name,
    COALESCE(r.race_name, 'Unknown') as race_name,
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE AND mst.is_active = TRUE THEN 'Active'
        WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
        ELSE 'Inactive'
    END as membership_status,
    m.expiry_date,
    m.last_payment_date,
    m.date_joined,
    m.membership_amount,
    CASE 
        WHEN m.expiry_date >= CURRENT_DATE THEN 
            (m.expiry_date - CURRENT_DATE)::INTEGER
        ELSE 0 
    END as days_until_expiry,
    mst.is_active,
    mst.status_name
FROM members_consolidated m
LEFT JOIN membership_statuses mst ON m.membership_status_id = mst.status_id
LEFT JOIN wards w ON m.ward_code = w.ward_code
LEFT JOIN municipalities mu ON w.municipality_code = mu.municipality_code
LEFT JOIN districts d ON mu.district_code = d.district_code
LEFT JOIN provinces p ON d.province_code = p.province_code
LEFT JOIN municipalities mum ON m.municipality_code = mum.municipality_code
LEFT JOIN districts pd ON mum.district_code = pd.district_code
LEFT JOIN provinces pp ON pd.province_code = pp.province_code
LEFT JOIN voting_districts vd ON
    CAST(REPLACE(CAST(m.voting_district_code AS TEXT), '.0', '') AS VARCHAR) = vd.voting_district_code
LEFT JOIN voting_stations vs ON
    vd.voting_district_code = vs.voting_district_code
LEFT JOIN genders g ON m.gender_id = g.gender_id
LEFT JOIN races r ON m.race_id = r.race_id
"""

r.execute(sql)
c.commit()
print("✅ View created")

# Test it
r.execute("SELECT COUNT(*) FROM vw_member_details_optimized")
count = r.fetchone()[0]
print(f"Row count: {count:,}")

r.execute("SELECT COUNT(*) FROM members_consolidated")
consolidated_count = r.fetchone()[0]
print(f"members_consolidated count: {consolidated_count:,}")

if count == consolidated_count:
    print("✅ Counts match!")
else:
    print(f"⚠️  Difference: {abs(count - consolidated_count):,}")

c.close()

