import sys
import psycopg2
from psycopg2.extras import RealDictCursor

print("Checking inactive members...", flush=True)

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="eff_membership_database",
        user="eff_admin",
        password="Frames!123"
    )
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get summary
    cursor.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as inactive
        FROM members_consolidated
    """)
    
    summary = cursor.fetchone()
    print(f"\nTotal: {summary['total']:,}", flush=True)
    print(f"Active: {summary['active']:,}", flush=True)
    print(f"Grace: {summary['grace']:,}", flush=True)
    print(f"Inactive: {summary['inactive']:,}", flush=True)
    
    # Get sample of inactive members
    print("\nSample of 10 inactive members:", flush=True)
    cursor.execute("""
        SELECT
            member_id,
            membership_number,
            expiry_date,
            CURRENT_DATE - expiry_date as days_expired
        FROM members_consolidated
        WHERE expiry_date < CURRENT_DATE - INTERVAL '90 days'
        ORDER BY expiry_date ASC
        LIMIT 10
    """)
    
    members = cursor.fetchall()
    for m in members:
        print(f"  ID: {m['member_id']}, Membership: {m['membership_number']}, Expired: {m['expiry_date']}, Days: {m['days_expired']}", flush=True)
    
    cursor.close()
    conn.close()
    print("\nDone!", flush=True)
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()

