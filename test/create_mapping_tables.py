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
    
    # Read and execute the SQL file
    with open('backend/migrations/create_iec_ward_vd_mappings.sql', 'r') as f:
        sql = f.read()
    
    cur.execute(sql)
    conn.commit()
    
    print("✅ Tables created successfully!")
    
    # Verify tables were created
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('iec_ward_mappings', 'iec_voting_district_mappings')
        ORDER BY table_name
    """)
    
    tables = cur.fetchall()
    print(f"\n📊 Created tables:")
    for table in tables:
        print(f"  - {table[0]}")
    
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

