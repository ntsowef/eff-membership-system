import psycopg2

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    dbname='eff_membership_database'
)

cur = conn.cursor()

# Check for the test VD number
test_vd_number = 32871326

print("=" * 80)
print(f"SEARCHING FOR IEC VD NUMBER: {test_vd_number}")
print("=" * 80)

cur.execute("""
    SELECT 
        voting_district_code,
        voting_district_name,
        ward_code,
        iec_vd_number,
        iec_vd_address
    FROM voting_districts
    WHERE iec_vd_number = %s
""", (test_vd_number,))

result = cur.fetchone()

if result:
    print("✅ FOUND!")
    print(f"  Voting District Code: {result[0]}")
    print(f"  Voting District Name: {result[1]}")
    print(f"  Ward Code: {result[2]}")
    print(f"  IEC VD Number: {result[3]}")
    print(f"  IEC VD Address: {result[4]}")
else:
    print("❌ NOT FOUND in voting_districts table")
    print("\nLet's check the iec_voting_stations table:")
    
    cur.execute("""
        SELECT 
            iec_vd_number,
            iec_voting_district_name,
            iec_ward_id,
            iec_municipality_name,
            iec_vd_address
        FROM iec_voting_stations
        WHERE iec_vd_number = %s
    """, (test_vd_number,))
    
    iec_result = cur.fetchone()
    if iec_result:
        print("✅ FOUND in iec_voting_stations table!")
        print(f"  IEC VD Number: {iec_result[0]}")
        print(f"  IEC VD Name: {iec_result[1]}")
        print(f"  IEC Ward ID: {iec_result[2]}")
        print(f"  IEC Municipality: {iec_result[3]}")
        print(f"  IEC VD Address: {iec_result[4]}")
        
        # Check if we can find the ward
        ward_id_str = str(iec_result[2])
        ward_number = int(ward_id_str[-3:])
        
        print(f"\n  Extracted Ward Number: {ward_number}")
        
        cur.execute("""
            SELECT ward_code, ward_name
            FROM wards
            WHERE municipality_code = 'JHB' AND ward_number = %s
        """, (ward_number,))
        
        ward_result = cur.fetchone()
        if ward_result:
            print(f"  ✅ Found Ward: {ward_result[0]} - {ward_result[1]}")
            
            # Check voting districts for this ward
            cur.execute("""
                SELECT COUNT(*), 
                       COUNT(CASE WHEN iec_vd_number IS NOT NULL THEN 1 END) as with_iec_vd
                FROM voting_districts
                WHERE ward_code = %s
            """, (ward_result[0],))
            
            vd_count = cur.fetchone()
            print(f"\n  Voting Districts in {ward_result[0]}: {vd_count[0]} total, {vd_count[1]} with IEC VD numbers")

conn.close()

