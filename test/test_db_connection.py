import sys
import psycopg2

print("Starting script...", flush=True)
sys.stdout.flush()

try:
    print("Connecting to database...", flush=True)
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="eff_membership_database",
        user="eff_admin",
        password="Frames!123"
    )
    print("Connected!", flush=True)
    
    cursor = conn.cursor()
    print("Executing query...", flush=True)
    cursor.execute("SELECT COUNT(*) FROM members_consolidated")
    count = cursor.fetchone()[0]
    print(f"Total members: {count}", flush=True)
    
    cursor.execute("""
        SELECT 
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END) as expired
        FROM members_consolidated
    """)
    result = cursor.fetchone()
    print(f"Active: {result[0]}, Expired: {result[1]}", flush=True)
    
    cursor.close()
    conn.close()
    print("Done!", flush=True)
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()

