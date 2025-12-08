import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="eff_membership_database",
        user="eff_admin",
        password="Frames!123"
    )
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'members_consolidated'
        ORDER BY ordinal_position
    """)
    
    columns = cursor.fetchall()
    print("Columns in members_consolidated table:", flush=True)
    for col in columns:
        print(f"  - {col[0]} ({col[1]})", flush=True)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)

