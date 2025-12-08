import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database',
        port=5432
    )

    cur = conn.cursor()
except Exception as e:
    print(f"❌ Database connection error: {e}")
    sys.exit(1)

# Get JHB municipality details
try:
    cur.execute("""
        SELECT
            municipality_id,
            municipality_code,
            municipality_name,
            municipality_type,
            district_code,
            parent_municipality_id
        FROM municipalities
        WHERE municipality_code = 'JHB'
    """)

    row = cur.fetchone()
except Exception as e:
    print(f"❌ Query error: {e}")
    conn.close()
    sys.exit(1)

if row:
    municipality_id = row[0]
    municipality_code = row[1]
    municipality_name = row[2]
    municipality_type = row[3]
    district_code = row[4]
    parent_municipality_id = row[5]

    print("\n" + "="*80)
    print("MUNICIPALITY: JHB")
    print("="*80)
    print(f"Municipality ID:      {municipality_id}")
    print(f"Municipality Code:    {municipality_code}")
    print(f"Municipality Name:    {municipality_name}")
    print(f"Municipality Type:    {municipality_type}")
    print(f"District Code:        {district_code}")
    print(f"Parent Municipality:  {parent_municipality_id}")
    print("="*80)

    # Check if this is a metro with sub-regions
    if municipality_type == 'Metropolitan':
        print("\n🏙️ This is a METROPOLITAN municipality")
        print("\nChecking for sub-regions...")

        cur.execute("""
            SELECT
                municipality_code,
                municipality_name,
                municipality_type
            FROM municipalities
            WHERE parent_municipality_id = %s
            ORDER BY municipality_name
        """, (municipality_id,))
        
        sub_regions = cur.fetchall()
        
        if sub_regions:
            print(f"\n✅ Found {len(sub_regions)} sub-regions:")
            print("-"*80)
            for sr in sub_regions:
                print(f"  {sr[0]}: {sr[1]} ({sr[2]})")
        else:
            print("\n❌ No sub-regions found")
    else:
        print(f"\n📍 This is a {municipality_type} municipality")
else:
    print("\n❌ Municipality 'JHB' not found in database")

conn.close()

