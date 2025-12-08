import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("\n" + "="*80)
print("DROPPING OLD MAPPING TABLES")
print("="*80)

# Drop the tables we created earlier
cur.execute("DROP TABLE IF EXISTS iec_voting_district_mappings CASCADE")
print("✅ Dropped iec_voting_district_mappings")

print("\n" + "="*80)
print("CREATING NEW MAPPING TABLES (NO FOREIGN KEYS)")
print("="*80)

# Create iec_voting_district_mappings without foreign keys
cur.execute("""
    CREATE TABLE iec_voting_district_mappings (
        mapping_id SERIAL PRIMARY KEY,
        iec_vd_number BIGINT NOT NULL UNIQUE,
        voting_district_code VARCHAR(20) NOT NULL,
        voting_district_name VARCHAR(255),
        ward_code VARCHAR(20),
        voting_station_name VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("✅ Created iec_voting_district_mappings")

# Create indexes
cur.execute("CREATE INDEX idx_iec_vd_mappings_iec_vd_number ON iec_voting_district_mappings(iec_vd_number)")
cur.execute("CREATE INDEX idx_iec_vd_mappings_voting_district_code ON iec_voting_district_mappings(voting_district_code)")
cur.execute("CREATE INDEX idx_iec_vd_mappings_ward_code ON iec_voting_district_mappings(ward_code)")
print("✅ Created indexes")

conn.commit()
conn.close()

print("\n" + "="*80)
print("✅ TABLES RECREATED SUCCESSFULLY")
print("="*80)

