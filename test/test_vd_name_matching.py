import psycopg2

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    dbname='eff_membership_database'
)

cur = conn.cursor()

test_vd_number = 32871326

print("=" * 80)
print(f"TESTING VOTING DISTRICT MAPPING FOR VD NUMBER: {test_vd_number}")
print("=" * 80)

# Step 1: Get IEC voting station data
print("\n1️⃣ Getting IEC voting station data...")
cur.execute("""
    SELECT 
        iec_vd_number,
        iec_voting_district_name,
        iec_ward_id,
        iec_municipality_name
    FROM iec_voting_stations
    WHERE iec_vd_number = %s
""", (test_vd_number,))

iec_station = cur.fetchone()
if not iec_station:
    print("❌ VD number not found in iec_voting_stations")
    conn.close()
    exit()

print(f"✅ Found IEC station:")
print(f"   VD Number: {iec_station[0]}")
print(f"   VD Name: {iec_station[1]}")
print(f"   Ward ID: {iec_station[2]}")
print(f"   Municipality: {iec_station[3]}")

# Step 2: Map ward
print("\n2️⃣ Mapping IEC Ward ID to our ward_code...")
ward_id_str = str(iec_station[2])
ward_number = int(ward_id_str[-3:])

cur.execute("""
    SELECT ward_code, ward_name
    FROM wards
    WHERE municipality_code = 'JHB' AND ward_number = %s
""", (ward_number,))

ward = cur.fetchone()
if not ward:
    print(f"❌ Ward not found for municipality JHB, ward number {ward_number}")
    conn.close()
    exit()

print(f"✅ Found ward: {ward[0]} - {ward[1]}")

# Step 3: Try to match voting district by name
print("\n3️⃣ Trying to match voting district by name...")
iec_vd_name = iec_station[1]
search_term = iec_vd_name[:20]  # First 20 characters

print(f"   Searching for voting districts in ward {ward[0]}")
print(f"   Search term: '{search_term}'")

cur.execute("""
    SELECT voting_district_code, voting_district_name
    FROM voting_districts
    WHERE ward_code = %s
    AND voting_district_name ILIKE %s
""", (ward[0], f'%{search_term}%'))

vd_match = cur.fetchone()
if vd_match:
    print(f"✅ Found matching voting district:")
    print(f"   Code: {vd_match[0]}")
    print(f"   Name: {vd_match[1]}")
else:
    print(f"❌ No voting district found matching '{search_term}'")
    
    # Show all voting districts in this ward
    print(f"\n   All voting districts in ward {ward[0]}:")
    cur.execute("""
        SELECT voting_district_code, voting_district_name
        FROM voting_districts
        WHERE ward_code = %s
        LIMIT 10
    """, (ward[0],))
    
    for vd in cur.fetchall():
        print(f"     - {vd[0]}: {vd[1]}")

conn.close()

