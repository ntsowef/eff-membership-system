#!/usr/bin/env python3
import psycopg2

conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cur = conn.cursor()

# List all views with 'member' and 'optimized' in name
cur.execute("SELECT viewname FROM pg_views WHERE viewname LIKE '%member%optimized%' ORDER BY viewname")
views = cur.fetchall()

print("Views with 'member' and 'optimized' in name:")
print("="*80)
if views:
    for row in views:
        print(f"  - {row[0]}")
else:
    print("  (none found)")

# Check if vw_member_details_optimized exists
print("\n" + "="*80)
cur.execute("SELECT COUNT(*) FROM pg_views WHERE viewname = 'vw_member_details_optimized'")
count = cur.fetchone()[0]

if count > 0:
    print("✅ vw_member_details_optimized EXISTS")
    
    # Get its definition
    cur.execute("SELECT definition FROM pg_views WHERE viewname = 'vw_member_details_optimized'")
    definition = cur.fetchone()[0]
    
    print("\nFirst 800 characters of definition:")
    print("-"*80)
    print(definition[:800])
    print("-"*80)
    
    # Check what table it uses
    if 'FROM members_consolidated' in definition:
        print("\n✅ Uses members_consolidated")
    elif 'FROM members m' in definition or 'FROM members AS m' in definition:
        print("\n❌ Uses old members table")
    
    # Check row count
    cur.execute("SELECT COUNT(*) FROM vw_member_details_optimized")
    view_count = cur.fetchone()[0]
    print(f"\nRow count: {view_count:,}")
    
else:
    print("❌ vw_member_details_optimized DOES NOT EXIST")

conn.close()

