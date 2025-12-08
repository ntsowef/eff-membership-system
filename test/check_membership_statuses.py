"""
Check what membership statuses exist in the database
"""

import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="eff_membership_database",
    user="eff_admin",
    password="Frames!123"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 80)
print("CHECKING MEMBERSHIP STATUSES IN DATABASE")
print("=" * 80)
print()

# Check membership_statuses table
print("📋 MEMBERSHIP STATUSES TABLE:")
print("-" * 80)

cursor.execute("""
    SELECT 
        status_id,
        status_name,
        status_code,
        is_active,
        allows_voting,
        allows_leadership
    FROM membership_statuses
    ORDER BY status_id
""")

statuses = cursor.fetchall()

print(f"\n{'ID':<5} {'Status Name':<20} {'Code':<10} {'Active':<10} {'Voting':<10} {'Leadership':<12}")
print("-" * 80)

for status in statuses:
    active = "✓ Yes" if status['is_active'] else "✗ No"
    voting = "✓ Yes" if status['allows_voting'] else "✗ No"
    leadership = "✓ Yes" if status['allows_leadership'] else "✗ No"
    code = status['status_code'] if status['status_code'] else 'N/A'
    print(f"{status['status_id']:<5} {status['status_name']:<20} {code:<10} {active:<10} {voting:<10} {leadership:<12}")

print()

# Check distribution of membership_status_id in members_consolidated
print("\n📊 MEMBERSHIP STATUS DISTRIBUTION IN members_consolidated:")
print("-" * 80)

cursor.execute("""
    SELECT 
        m.membership_status_id,
        ms.status_name,
        ms.is_active,
        COUNT(m.member_id) as member_count,
        ROUND(COUNT(m.member_id) * 100.0 / (SELECT COUNT(*) FROM members_consolidated), 2) as percentage
    FROM members_consolidated m
    LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
    GROUP BY m.membership_status_id, ms.status_name, ms.is_active
    ORDER BY member_count DESC
""")

distribution = cursor.fetchall()

print(f"\n{'Status ID':<12} {'Status Name':<20} {'Active':<10} {'Count':<15} {'Percentage':<12}")
print("-" * 75)

for dist in distribution:
    status_id = dist['membership_status_id'] if dist['membership_status_id'] is not None else 'NULL'
    status_name = dist['status_name'] if dist['status_name'] else 'Unknown'
    active = "✓ Yes" if dist['is_active'] else "✗ No" if dist['is_active'] is not None else "N/A"
    print(f"{str(status_id):<12} {status_name:<20} {active:<10} {dist['member_count']:<15,} {dist['percentage']:<12}%")

print()

# Check if there are any members with status_id = 1
print("\n🔍 CHECKING FOR MEMBERS WITH STATUS_ID = 1:")
print("-" * 80)

cursor.execute("""
    SELECT COUNT(*) as count
    FROM members_consolidated
    WHERE membership_status_id = 1
""")

count_status_1 = cursor.fetchone()['count']
print(f"\nMembers with membership_status_id = 1: {count_status_1:,}")

# Check members with active status (is_active = true)
cursor.execute("""
    SELECT COUNT(*) as count
    FROM members_consolidated m
    JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
    WHERE ms.is_active = true
""")

count_active = cursor.fetchone()['count']
print(f"Members with active status (is_active = true): {count_active:,}")

# Check members with expiry_date >= CURRENT_DATE
cursor.execute("""
    SELECT COUNT(*) as count
    FROM members_consolidated
    WHERE expiry_date >= CURRENT_DATE
""")

count_not_expired = cursor.fetchone()['count']
print(f"Members with expiry_date >= CURRENT_DATE: {count_not_expired:,}")

print()

# Sample some members to see their status
print("\n📋 SAMPLE MEMBERS (First 10):")
print("-" * 80)

cursor.execute("""
    SELECT 
        member_id,
        membership_status_id,
        expiry_date,
        created_at
    FROM members_consolidated
    ORDER BY created_at DESC
    LIMIT 10
""")

samples = cursor.fetchall()

print(f"\n{'Member ID':<12} {'Status ID':<12} {'Expiry Date':<15} {'Created At':<20}")
print("-" * 65)

for sample in samples:
    status_id = sample['membership_status_id'] if sample['membership_status_id'] is not None else 'NULL'
    expiry = str(sample['expiry_date']) if sample['expiry_date'] else 'NULL'
    created = str(sample['created_at'])[:19] if sample['created_at'] else 'NULL'
    print(f"{sample['member_id']:<12} {str(status_id):<12} {expiry:<15} {created:<20}")

print()
print("=" * 80)
print("✅ CHECK COMPLETE!")
print("=" * 80)

cursor.close()
conn.close()

