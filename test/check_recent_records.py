#!/usr/bin/env python3
import psycopg2
from datetime import datetime, timedelta

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)
cur = conn.cursor()

# Get recent records
cutoff = datetime.now() - timedelta(minutes=5)
cur.execute("""
    SELECT 
        mc.id_number,
        mc.voter_status_id,
        vs.status_name as voter_status,
        mc.membership_status_id,
        ms.status_name as memb_status
    FROM members_consolidated mc
    LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
    LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
    WHERE mc.updated_at > %s
    ORDER BY mc.id_number
    LIMIT 30
""", (cutoff,))

results = cur.fetchall()

print("=" * 110)
print("RECENT RECORDS WITH STATUS COLUMNS")
print("=" * 110)
print(f"\n{'ID Number':<15} | {'voter_status_id':<16} | {'Voter Status':<20} | {'memb_status_id':<16} | {'Membership Status':<20}")
print("-" * 110)

for r in results:
    voter_status = r[2] if r[2] else "NULL"
    memb_status = r[4] if r[4] else "NULL"
    print(f"{r[0]:<15} | {str(r[1]):<16} | {voter_status:<20} | {str(r[3]):<16} | {memb_status:<20}")

print(f"\nTotal records: {len(results)}")

# Get summary
print("\n" + "=" * 110)
print("SUMMARY - VOTER STATUS")
print("=" * 110)

cur.execute("""
    SELECT vs.status_name, COUNT(*) as cnt
    FROM members_consolidated mc
    LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
    WHERE mc.updated_at > %s
    GROUP BY vs.status_name
    ORDER BY cnt DESC
""", (cutoff,))

for row in cur.fetchall():
    status_name = row[0] if row[0] else "NULL"
    print(f"  {status_name}: {row[1]}")

print("\n" + "=" * 110)
print("SUMMARY - MEMBERSHIP STATUS")
print("=" * 110)

cur.execute("""
    SELECT ms.status_name, COUNT(*) as cnt
    FROM members_consolidated mc
    LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
    WHERE mc.updated_at > %s
    GROUP BY ms.status_name
    ORDER BY cnt DESC
""", (cutoff,))

for row in cur.fetchall():
    status_name = row[0] if row[0] else "NULL"
    print(f"  {status_name}: {row[1]}")

conn.close()

print("\n" + "=" * 110)
print("VERIFICATION COMPLETE")
print("=" * 110)
print("\nExpected Results:")
print("  - Voter Status: Should show 'Registered' and 'Not Registered' (NOT 'Registered In Ward', etc.)")
print("  - Membership Status: Should show 'Inactive' (NOT 'Invalid')")
print("\nIf you see the normalized values above, the fix is working correctly!")

