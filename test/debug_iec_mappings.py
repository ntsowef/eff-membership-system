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
print("IEC_MUNICIPALITY_MAPPINGS COUNT")
print("="*80)
cur.execute("SELECT COUNT(*) FROM iec_municipality_mappings")
print(f"Total records: {cur.fetchone()[0]}")

print("\n" + "="*80)
print("SAMPLE IEC_MUNICIPALITY_MAPPINGS")
print("="*80)
cur.execute("SELECT iec_municipality_id, municipality_code, province_code FROM iec_municipality_mappings LIMIT 5")
for row in cur.fetchall():
    print(f"  IEC Muni ID: {row[0]} → Muni Code: {row[1]}, Province: {row[2]}")

print("\n" + "="*80)
print("IEC_VOTING_STATIONS SAMPLE")
print("="*80)
cur.execute("""
    SELECT iec_municipality_id, iec_municipality_name, iec_ward_id, iec_vd_number 
    FROM iec_voting_stations 
    WHERE iec_municipality_id = 3003
    LIMIT 3
""")
for row in cur.fetchall():
    print(f"  IEC Muni ID: {row[0]} ({row[1]}), Ward: {row[2]}, VD: {row[3]}")

print("\n" + "="*80)
print("CHECK IF JHB (3003) IS IN MAPPINGS")
print("="*80)
cur.execute("SELECT * FROM iec_municipality_mappings WHERE iec_municipality_id = '3003'")
result = cur.fetchone()
if result:
    print(f"  ✅ Found: {result}")
else:
    print(f"  ❌ Not found!")
    
print("\n" + "="*80)
print("CHECK WARDS FOR JHB")
print("="*80)
cur.execute("SELECT ward_code, ward_name, ward_number FROM wards WHERE municipality_code = 'JHB' LIMIT 5")
for row in cur.fetchall():
    print(f"  Ward Code: {row[0]}, Name: {row[1]}, Number: {row[2]}")

conn.close()

