"""
Analyze membership status based on expiry_date field
Business Rules:
1. Active (Good Standing): expiry_date >= CURRENT_DATE
2. Grace Period: expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - 90 days
3. Inactive (Expired): expiry_date < CURRENT_DATE - 90 days
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

# Database connection
conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="eff_membership_database",
    user="eff_admin",
    password="Frames!123"
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

print("=" * 100)
print("MEMBERSHIP STATUS ANALYSIS BASED ON EXPIRY DATE")
print("=" * 100)
print()

# Get current date from database
cursor.execute("SELECT CURRENT_DATE as today")
today = cursor.fetchone()['today']
print(f"📅 Analysis Date: {today}")
print(f"📅 Grace Period Cutoff: {today - timedelta(days=90)} (90 days ago)")
print()

# Test 1: Overall membership status distribution by expiry date
print("=" * 100)
print("📊 TEST 1: MEMBERSHIP STATUS DISTRIBUTION BY EXPIRY DATE")
print("=" * 100)

query = """
SELECT
    CASE
        WHEN expiry_date >= CURRENT_DATE THEN 'Active (Good Standing)'
        WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
        WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Inactive (Expired > 90 days)'
        ELSE 'Unknown/NULL'
    END as status_category,
    COUNT(*) as member_count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members_consolidated), 2) as percentage,
    MIN(expiry_date) as earliest_expiry,
    MAX(expiry_date) as latest_expiry
FROM members_consolidated
GROUP BY status_category
ORDER BY 
    CASE status_category
        WHEN 'Active (Good Standing)' THEN 1
        WHEN 'Grace Period' THEN 2
        WHEN 'Inactive (Expired > 90 days)' THEN 3
        ELSE 4
    END
"""

cursor.execute(query)
distribution = cursor.fetchall()

print(f"\n{'Status Category':<35} {'Count':<15} {'Percentage':<12} {'Earliest Expiry':<18} {'Latest Expiry':<18}")
print("-" * 100)

for row in distribution:
    print(f"{row['status_category']:<35} {row['member_count']:<15,} {row['percentage']:<12}% "
          f"{str(row['earliest_expiry']):<18} {str(row['latest_expiry']):<18}")

print()

# Test 2: Top 10 wards by ACTIVE members (excluding expired > 90 days)
print("=" * 100)
print("📊 TEST 2: TOP 10 WARDS BY ACTIVE MEMBERS (Active + Grace Period)")
print("=" * 100)

query = """
SELECT
    w.ward_code,
    w.ward_name,
    m.municipality_name,
    COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE THEN 1 END) as active_count,
    COUNT(CASE WHEN mem.expiry_date < CURRENT_DATE AND mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period_count,
    COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as total_active_with_grace,
    COUNT(CASE WHEN mem.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as expired_count,
    COUNT(mem.member_id) as total_members
FROM wards w
LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
GROUP BY w.ward_code, w.ward_name, m.municipality_name
HAVING COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) > 0
ORDER BY total_active_with_grace DESC
LIMIT 10
"""

cursor.execute(query)
top_wards = cursor.fetchall()

print(f"\n{'Ward':<12} {'Ward Name':<20} {'Municipality':<20} {'Active':<10} {'Grace':<10} {'Total Active':<15} {'Expired':<10} {'Total':<10}")
print("-" * 100)

for ward in top_wards:
    print(f"{ward['ward_code']:<12} {ward['ward_name'][:19]:<20} {ward['municipality_name'][:19]:<20} "
          f"{ward['active_count']:<10} {ward['grace_period_count']:<10} {ward['total_active_with_grace']:<15} "
          f"{ward['expired_count']:<10} {ward['total_members']:<10}")

print()

# Test 3: Comparison - Old method vs New method
print("=" * 100)
print("📊 TEST 3: COMPARISON - OLD METHOD (status_id=8) vs NEW METHOD (expiry_date)")
print("=" * 100)

comparison_query = """
SELECT
    w.ward_code,
    w.ward_name,
    COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) as old_method_count,
    COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as new_method_count,
    COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) - 
        COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) as difference
FROM wards w
LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
GROUP BY w.ward_code, w.ward_name
HAVING COUNT(mem.member_id) > 0
ORDER BY ABS(COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) - 
        COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END)) DESC
LIMIT 10
"""

cursor.execute(comparison_query)
comparison = cursor.fetchall()

print(f"\n{'Ward Code':<12} {'Ward Name':<25} {'Old Method':<15} {'New Method':<15} {'Difference':<12}")
print("-" * 85)

for row in comparison:
    diff_str = f"{row['difference']:+,}" if row['difference'] != 0 else "0"
    print(f"{row['ward_code']:<12} {row['ward_name'][:24]:<25} {row['old_method_count']:<15,} "
          f"{row['new_method_count']:<15,} {diff_str:<12}")

print()

# Test 4: Sample members from each category
print("=" * 100)
print("📊 TEST 4: SAMPLE MEMBERS FROM EACH CATEGORY")
print("=" * 100)

for category, condition in [
    ('Active (Good Standing)', "expiry_date >= CURRENT_DATE"),
    ('Grace Period', "expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days'"),
    ('Inactive (Expired > 90 days)', "expiry_date < CURRENT_DATE - INTERVAL '90 days'")
]:
    print(f"\n🔍 {category}:")
    print("-" * 100)
    
    sample_query = f"""
    SELECT
        member_id,
        expiry_date,
        CURRENT_DATE - expiry_date as days_since_expiry,
        membership_status_id
    FROM members_consolidated
    WHERE {condition}
    ORDER BY expiry_date DESC
    LIMIT 5
    """
    
    cursor.execute(sample_query)
    samples = cursor.fetchall()
    
    if samples:
        print(f"{'Member ID':<15} {'Expiry Date':<15} {'Days Since Expiry':<20} {'Status ID':<12}")
        print("-" * 65)
        for sample in samples:
            days_str = str(sample['days_since_expiry'].days) if sample['days_since_expiry'] else 'N/A'
            print(f"{sample['member_id']:<15} {str(sample['expiry_date']):<15} {days_str:<20} {sample['membership_status_id']:<12}")
    else:
        print("No members found in this category")

print()

# Test 5: Summary statistics
print("=" * 100)
print("📊 TEST 5: SUMMARY STATISTICS")
print("=" * 100)

summary_query = """
SELECT
    COUNT(*) as total_members,
    COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active_members,
    COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period_members,
    COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as total_active_with_grace,
    COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as expired_members,
    ROUND(COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) * 100.0 / COUNT(*), 2) as active_percentage,
    ROUND(COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) * 100.0 / COUNT(*), 2) as active_with_grace_percentage
FROM members_consolidated
"""

cursor.execute(summary_query)
summary = cursor.fetchone()

print(f"\n📈 Total Members: {summary['total_members']:,}")
print(f"✅ Active (Good Standing): {summary['active_members']:,} ({summary['active_percentage']}%)")
print(f"⏳ Grace Period: {summary['grace_period_members']:,}")
print(f"✅ Total Active (with Grace): {summary['total_active_with_grace']:,} ({summary['active_with_grace_percentage']}%)")
print(f"❌ Inactive (Expired > 90 days): {summary['expired_members']:,}")

print()
print("=" * 100)
print("✅ ANALYSIS COMPLETE!")
print("=" * 100)

cursor.close()
conn.close()

