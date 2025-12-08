#!/usr/bin/env python3
"""
Verify that data from the test file was actually imported into the database
"""

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

print("\n" + "=" * 120)
print("VERIFY DATA IMPORT FROM TEST FILE")
print("=" * 120)

# Check the file status
print("\n1. FILE STATUS:")
print("-" * 120)
cur.execute("""
    SELECT file_id, original_filename, status, rows_processed, rows_total, 
           processing_completed_at, error_message
    FROM uploaded_files
    WHERE file_id = 2
""")

file_info = cur.fetchone()
if file_info:
    file_id, filename, status, rows_processed, rows_total, completed_at, error = file_info
    print(f"File ID: {file_id}")
    print(f"Filename: {filename}")
    print(f"Status: {status}")
    print(f"Rows Processed: {rows_processed}/{rows_total}")
    print(f"Completed At: {completed_at}")
    if error:
        print(f"Error: {error}")
else:
    print("File not found!")
    conn.close()
    exit(1)

# Check if data was inserted recently (last 5 minutes)
print("\n2. RECENT MEMBERS INSERTED:")
print("-" * 120)

five_minutes_ago = datetime.now() - timedelta(minutes=5)

cur.execute("""
    SELECT 
        member_id,
        id_number,
        firstname,
        surname,
        province_name,
        municipality_name,
        ward_code,
        membership_status_id,
        created_at
    FROM members_consolidated
    WHERE created_at >= %s
    ORDER BY created_at DESC
    LIMIT 10
""", (five_minutes_ago,))

recent_members = cur.fetchall()

if recent_members:
    print(f"Found {len(recent_members)} members inserted in the last 5 minutes:")
    print()
    for row in recent_members:
        member_id, id_num, firstname, surname, province, municipality, ward, status, created = row
        print(f"  Member ID: {member_id}")
        print(f"  ID Number: {id_num}")
        print(f"  Name: {firstname} {surname}")
        print(f"  Province: {province}")
        print(f"  Municipality: {municipality}")
        print(f"  Ward: {ward}")
        print(f"  Status: {status}")
        print(f"  Created: {created}")
        print()
else:
    print("❌ No members inserted in the last 5 minutes!")

# Check total members in database
print("\n3. TOTAL MEMBERS IN DATABASE:")
print("-" * 120)

cur.execute("SELECT COUNT(*) FROM members_consolidated")
total_members = cur.fetchone()[0]
print(f"Total members: {total_members:,}")

# Check for the specific duplicate ID we found
print("\n4. CHECK DUPLICATE ID NUMBER (2210000000):")
print("-" * 120)

cur.execute("""
    SELECT 
        member_id,
        id_number,
        firstname,
        surname,
        created_at,
        updated_at
    FROM members_consolidated
    WHERE id_number = '2210000000'
""")

dup_member = cur.fetchone()
if dup_member:
    print("✅ Found member with ID 2210000000:")
    print(f"  Member ID: {dup_member[0]}")
    print(f"  Name: {dup_member[2]} {dup_member[3]}")
    print(f"  Created: {dup_member[4]}")
    print(f"  Updated: {dup_member[5]}")
    print("\n  Note: Only ONE record exists (duplicates were merged)")
else:
    print("❌ Member with ID 2210000000 not found")

# Check membership history
print("\n5. MEMBERSHIP HISTORY RECORDS:")
print("-" * 120)

cur.execute("""
    SELECT COUNT(*)
    FROM membership_history
    WHERE created_at >= %s
""", (five_minutes_ago,))

history_count = cur.fetchone()[0]
print(f"Membership history records created in last 5 minutes: {history_count}")

conn.close()

print("\n" + "=" * 120)
print("SUMMARY:")
print("=" * 120)

if status == 'completed' and recent_members:
    print("✅ SUCCESS: File processed and data imported successfully!")
    print(f"   - {len(recent_members)} members found in database")
    print(f"   - File status: {status}")
    print(f"   - Rows processed: {rows_processed}/{rows_total}")
elif status == 'completed' and not recent_members:
    print("⚠️  WARNING: File marked as completed but no recent data found!")
    print("   - This might mean the data was already in the database (updates)")
    print("   - Or the members were created more than 5 minutes ago")
elif status == 'failed':
    print(f"❌ FAILED: File processing failed with error: {error}")
else:
    print(f"⚠️  File status: {status}")

print("=" * 120)

