import sys
import psycopg2
from psycopg2.extras import RealDictCursor

print("=" * 100, flush=True)
print("VERIFICATION: EXPIRY-BASED MEMBERSHIP FILTERING", flush=True)
print("=" * 100, flush=True)
print(flush=True)

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        database="eff_membership_database",
        user="eff_admin",
        password="Frames!123"
    )
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Test 1: Verify top 10 wards with new logic
    print("=" * 100, flush=True)
    print("✅ TEST 1: TOP 10 WARDS (NEW EXPIRY-BASED LOGIC)", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            w.ward_code,
            w.ward_name,
            m.municipality_name,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as active_count,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE THEN 1 END) as not_expired,
            COUNT(CASE WHEN mem.expiry_date < CURRENT_DATE AND mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        GROUP BY w.ward_code, w.ward_name, m.municipality_name
        HAVING COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) > 0
        ORDER BY active_count DESC
        LIMIT 10
    """)
    
    top_wards = cursor.fetchall()
    print(f"\n{'Ward':<12} {'Ward Name':<25} {'Municipality':<20} {'Active':<10} {'Not Exp':<10} {'Grace':<10}", flush=True)
    print("-" * 95, flush=True)
    
    for ward in top_wards:
        print(f"{ward['ward_code']:<12} {ward['ward_name'][:24]:<25} {ward['municipality_name'][:19]:<20} "
              f"{ward['active_count']:<10} {ward['not_expired']:<10} {ward['grace_period']:<10}", flush=True)
    
    print(flush=True)
    
    # Test 2: Verify membership status breakdown
    print("=" * 100, flush=True)
    print("✅ TEST 2: MEMBERSHIP STATUS BREAKDOWN", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            CASE
                WHEN expiry_date >= CURRENT_DATE THEN 'Active (Good Standing)'
                WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Grace Period'
                WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Inactive (Expired > 90 days)'
                ELSE 'Unknown/NULL'
            END as status_category,
            COUNT(*) as member_count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members_consolidated), 2) as percentage
        FROM members_consolidated
        GROUP BY status_category
        ORDER BY member_count DESC
    """)
    
    breakdown = cursor.fetchall()
    print(f"\n{'Status Category':<35} {'Count':<15} {'Percentage':<12}", flush=True)
    print("-" * 65, flush=True)
    
    for row in breakdown:
        print(f"{row['status_category']:<35} {row['member_count']:<15,} {row['percentage']:<12}%", flush=True)
    
    print(flush=True)
    
    # Test 3: Compare specific ward before and after
    print("=" * 100, flush=True)
    print("✅ TEST 3: WARD 107 - BEFORE vs AFTER", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            w.ward_code,
            w.ward_name,
            COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) as old_method,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as new_method,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE THEN 1 END) as active_only,
            COUNT(CASE WHEN mem.expiry_date < CURRENT_DATE AND mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period,
            COUNT(CASE WHEN mem.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as expired_over_90
        FROM wards w
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        WHERE w.ward_code = '79800107'
        GROUP BY w.ward_code, w.ward_name
    """)
    
    ward_107 = cursor.fetchone()
    print(f"\nWard: {ward_107['ward_code']} - {ward_107['ward_name']}", flush=True)
    print(f"  Old Method (status_id=8): {ward_107['old_method']:,}", flush=True)
    print(f"  New Method (active + grace): {ward_107['new_method']:,}", flush=True)
    print(f"    - Active (not expired): {ward_107['active_only']:,}", flush=True)
    print(f"    - Grace Period: {ward_107['grace_period']:,}", flush=True)
    print(f"  Excluded (expired > 90 days): {ward_107['expired_over_90']:,}", flush=True)
    print(f"  Impact: {ward_107['old_method'] - ward_107['new_method']:,} members excluded", flush=True)
    
    print(flush=True)
    
    # Test 4: Overall impact summary
    print("=" * 100, flush=True)
    print("✅ TEST 4: OVERALL IMPACT SUMMARY", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            COUNT(*) as total_members,
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active_members,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period,
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as total_active_with_grace,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as excluded,
            ROUND(COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) * 100.0 / COUNT(*), 2) as active_percentage
        FROM members_consolidated
    """)
    
    summary = cursor.fetchone()
    print(f"\n📊 Total Members in Database: {summary['total_members']:,}", flush=True)
    print(f"✅ Active (Not Expired): {summary['active_members']:,}", flush=True)
    print(f"⏳ Grace Period (Expired < 90 days): {summary['grace_period']:,}", flush=True)
    print(f"✅ Total Counted as Active: {summary['total_active_with_grace']:,} ({summary['active_percentage']}%)", flush=True)
    print(f"❌ Excluded (Expired > 90 days): {summary['excluded']:,}", flush=True)
    
    print(flush=True)
    print("=" * 100, flush=True)
    print("✅ VERIFICATION COMPLETE!", flush=True)
    print("=" * 100, flush=True)
    print(flush=True)
    print("📝 Summary:", flush=True)
    print(f"  - Top performing wards now show only active members (not expired OR grace period)", flush=True)
    print(f"  - {summary['excluded']:,} members (expired > 90 days) are excluded from active counts", flush=True)
    print(f"  - {summary['grace_period']:,} members in grace period are still counted as active", flush=True)
    print(f"  - This provides more accurate membership statistics", flush=True)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()

