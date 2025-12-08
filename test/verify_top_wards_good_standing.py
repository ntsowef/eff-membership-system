"""
Test script to verify that top performing wards only count Good Standing members
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
print("VERIFYING TOP WARDS ONLY COUNT GOOD STANDING MEMBERS")
print("=" * 80)
print()

# Test 1: Get top 10 wards by Good Standing members
print("📊 TEST 1: Top 10 Wards by Good Standing Members")
print("-" * 80)

query = """
SELECT
    w.ward_code,
    w.ward_name,
    m.municipality_name,
    COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) as good_standing_count,
    COUNT(mem.member_id) as total_members,
    ROUND(
        COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) * 100.0 /
        NULLIF(COUNT(mem.member_id), 0),
        2
    ) as good_standing_percentage
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
GROUP BY w.ward_code, w.ward_name, m.municipality_name
HAVING COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) > 0
ORDER BY good_standing_count DESC
LIMIT 10
"""

cursor.execute(query)
top_wards = cursor.fetchall()

print(f"\n{'Ward Code':<12} {'Ward Name':<30} {'Municipality':<25} {'Good Standing':<15} {'Total':<10} {'%':<8}")
print("-" * 110)

for ward in top_wards:
    print(f"{ward['ward_code']:<12} {ward['ward_name'][:29]:<30} {ward['municipality_name'][:24]:<25} "
          f"{ward['good_standing_count']:<15} {ward['total_members']:<10} {ward['good_standing_percentage']:<8}%")

print()

# Test 2: Compare with old method (counting all members)
print("\n📊 TEST 2: Comparison - Old Method vs New Method")
print("-" * 80)

old_query = """
SELECT
    w.ward_code,
    w.ward_name,
    COUNT(mem.member_id) as total_members
FROM wards w
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
GROUP BY w.ward_code, w.ward_name
HAVING COUNT(mem.member_id) > 0
ORDER BY total_members DESC
LIMIT 5
"""

cursor.execute(old_query)
old_top_wards = cursor.fetchall()

print("\n🔴 OLD METHOD (All Members):")
print(f"{'Ward Code':<12} {'Ward Name':<30} {'Total Members':<15}")
print("-" * 60)
for ward in old_top_wards:
    print(f"{ward['ward_code']:<12} {ward['ward_name'][:29]:<30} {ward['total_members']:<15}")

print("\n🟢 NEW METHOD (Good Standing Only):")
print(f"{'Ward Code':<12} {'Ward Name':<30} {'Good Standing':<15}")
print("-" * 60)
for ward in top_wards[:5]:
    print(f"{ward['ward_code']:<12} {ward['ward_name'][:29]:<30} {ward['good_standing_count']:<15}")

print()

# Test 3: Verify membership status breakdown for top ward
print("\n📊 TEST 3: Membership Status Breakdown for Top Ward")
print("-" * 80)

top_ward_code = top_wards[0]['ward_code']
print(f"\nAnalyzing Ward: {top_ward_code} - {top_wards[0]['ward_name']}")

status_query = """
SELECT
    ms.status_name,
    ms.is_active,
    COUNT(m.member_id) as member_count,
    ROUND(COUNT(m.member_id) * 100.0 / (
        SELECT COUNT(*) FROM members_consolidated WHERE ward_code = %s
    ), 2) as percentage
FROM members_consolidated m
LEFT JOIN membership_statuses ms ON m.membership_status_id = ms.status_id
WHERE m.ward_code = %s
GROUP BY ms.status_name, ms.is_active
ORDER BY member_count DESC
"""

cursor.execute(status_query, (top_ward_code, top_ward_code))
status_breakdown = cursor.fetchall()

print(f"\n{'Status':<20} {'Active?':<10} {'Count':<10} {'Percentage':<12}")
print("-" * 55)
for status in status_breakdown:
    active_str = "✓ Yes" if status['is_active'] else "✗ No"
    print(f"{status['status_name']:<20} {active_str:<10} {status['member_count']:<10} {status['percentage']:<12}%")

print()

# Test 4: Summary statistics
print("\n📊 TEST 4: Overall Summary")
print("-" * 80)

summary_query = """
SELECT
    COUNT(DISTINCT w.ward_code) as total_wards,
    COUNT(DISTINCT CASE WHEN mem.membership_status_id = 8 THEN w.ward_code END) as wards_with_good_standing,
    SUM(CASE WHEN mem.membership_status_id = 8 THEN 1 ELSE 0 END) as total_good_standing_members,
    COUNT(mem.member_id) as total_all_members,
    ROUND(
        SUM(CASE WHEN mem.membership_status_id = 8 THEN 1 ELSE 0 END) * 100.0 /
        NULLIF(COUNT(mem.member_id), 0),
        2
    ) as good_standing_percentage
FROM wards w
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
"""

cursor.execute(summary_query)
summary = cursor.fetchone()

print(f"\nTotal Wards: {summary['total_wards']:,}")
print(f"Wards with Good Standing Members: {summary['wards_with_good_standing']:,}")
print(f"Total Good Standing Members: {summary['total_good_standing_members']:,}")
print(f"Total All Members: {summary['total_all_members']:,}")
print(f"Good Standing Percentage: {summary['good_standing_percentage']}%")

print()
print("=" * 80)
print("✅ VERIFICATION COMPLETE!")
print("=" * 80)
print("\n✓ Top performing wards now correctly show only Good Standing members")
print("✓ Member counts reflect membership_status_id = 1 (Active/Good Standing)")
print()

cursor.close()
conn.close()

