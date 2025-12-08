"""
Simple check of expiry dates in members_consolidated
"""

import psycopg2
from psycopg2.extras import RealDictCursor

try:
    # Database connection
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="eff_membership_database",
        user="eff_admin",
        password="Frames!123"
    )

    cursor = conn.cursor(cursor_factory=RealDictCursor)

    print("Connected to database successfully!")
    print()

    # Check current date
    cursor.execute("SELECT CURRENT_DATE as today")
    today = cursor.fetchone()['today']
    print(f"Current Date: {today}")
    print()

    # Check total members
    cursor.execute("SELECT COUNT(*) as total FROM members_consolidated")
    total = cursor.fetchone()['total']
    print(f"Total Members: {total:,}")
    print()

    # Check expiry date distribution
    print("Checking expiry date distribution...")
    cursor.execute("""
        SELECT
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as not_expired,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE THEN 1 END) as expired,
            COUNT(CASE WHEN expiry_date IS NULL THEN 1 END) as null_expiry
        FROM members_consolidated
    """)
    
    result = cursor.fetchone()
    print(f"Not Expired (expiry_date >= today): {result['not_expired']:,}")
    print(f"Expired (expiry_date < today): {result['expired']:,}")
    print(f"NULL expiry_date: {result['null_expiry']:,}")
    print()

    # Check grace period
    print("Checking grace period (expired < 90 days)...")
    cursor.execute("""
        SELECT
            COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as expired_over_90
        FROM members_consolidated
    """)
    
    result = cursor.fetchone()
    print(f"Grace Period (expired < 90 days): {result['grace_period']:,}")
    print(f"Expired > 90 days: {result['expired_over_90']:,}")
    print()

    # Sample some expiry dates
    print("Sample expiry dates (10 random members):")
    cursor.execute("""
        SELECT member_id, expiry_date, membership_status_id
        FROM members_consolidated
        ORDER BY RANDOM()
        LIMIT 10
    """)
    
    samples = cursor.fetchall()
    for sample in samples:
        print(f"  Member {sample['member_id']}: Expiry={sample['expiry_date']}, Status={sample['membership_status_id']}")

    cursor.close()
    conn.close()
    
    print()
    print("Done!")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

