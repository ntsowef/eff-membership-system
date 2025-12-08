import sys
import psycopg2
from psycopg2.extras import RealDictCursor

print("=" * 100, flush=True)
print("MEMBERSHIP STATUS ANALYSIS BASED ON EXPIRY DATE", flush=True)
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
    
    # Get current date
    cursor.execute("SELECT CURRENT_DATE as today")
    today = cursor.fetchone()['today']
    print(f"📅 Analysis Date: {today}", flush=True)
    print(flush=True)
    
    # Test 1: Overall distribution
    print("=" * 100, flush=True)
    print("📊 TEST 1: MEMBERSHIP STATUS DISTRIBUTION BY EXPIRY DATE", flush=True)
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
    
    distribution = cursor.fetchall()
    print(f"\n{'Status Category':<35} {'Count':<15} {'Percentage':<12}", flush=True)
    print("-" * 65, flush=True)
    
    for row in distribution:
        print(f"{row['status_category']:<35} {row['member_count']:<15,} {row['percentage']:<12}%", flush=True)
    
    print(flush=True)
    
    # Test 2: Top 10 wards comparison
    print("=" * 100, flush=True)
    print("📊 TEST 2: TOP 10 WARDS - OLD METHOD vs NEW METHOD", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            w.ward_code,
            w.ward_name,
            m.municipality_name,
            COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) as old_method,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as new_method,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE THEN 1 END) as active_only,
            COUNT(CASE WHEN mem.expiry_date < CURRENT_DATE AND mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        GROUP BY w.ward_code, w.ward_name, m.municipality_name
        HAVING COUNT(mem.member_id) > 0
        ORDER BY new_method DESC
        LIMIT 10
    """)
    
    top_wards = cursor.fetchall()
    print(f"\n{'Ward':<12} {'Ward Name':<20} {'Municipality':<20} {'Old':<8} {'New':<8} {'Active':<8} {'Grace':<8}", flush=True)
    print("-" * 90, flush=True)
    
    for ward in top_wards:
        print(f"{ward['ward_code']:<12} {ward['ward_name'][:19]:<20} {ward['municipality_name'][:19]:<20} "
              f"{ward['old_method']:<8} {ward['new_method']:<8} {ward['active_only']:<8} {ward['grace_period']:<8}", flush=True)
    
    print(flush=True)
    
    # Test 3: Wards with biggest difference
    print("=" * 100, flush=True)
    print("📊 TEST 3: WARDS WITH BIGGEST DIFFERENCE (Most Expired Members)", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            w.ward_code,
            w.ward_name,
            m.municipality_name,
            COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) as old_count,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as new_count,
            COUNT(CASE WHEN mem.membership_status_id = 8 THEN 1 END) - 
                COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as difference
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        GROUP BY w.ward_code, w.ward_name, m.municipality_name
        HAVING COUNT(mem.member_id) > 0
        ORDER BY difference DESC
        LIMIT 10
    """)
    
    diff_wards = cursor.fetchall()
    print(f"\n{'Ward':<12} {'Ward Name':<25} {'Municipality':<20} {'Old':<8} {'New':<8} {'Lost':<8}", flush=True)
    print("-" * 85, flush=True)
    
    for ward in diff_wards:
        print(f"{ward['ward_code']:<12} {ward['ward_name'][:24]:<25} {ward['municipality_name'][:19]:<20} "
              f"{ward['old_count']:<8} {ward['new_count']:<8} {ward['difference']:<8}", flush=True)
    
    print(flush=True)
    
    # Test 4: Summary
    print("=" * 100, flush=True)
    print("📊 TEST 4: SUMMARY STATISTICS", flush=True)
    print("=" * 100, flush=True)
    
    cursor.execute("""
        SELECT
            COUNT(*) as total_members,
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active_members,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period,
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as total_active_with_grace,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as expired_over_90,
            ROUND(COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) * 100.0 / COUNT(*), 2) as active_pct,
            ROUND(COUNT(CASE WHEN expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) * 100.0 / COUNT(*), 2) as active_with_grace_pct
        FROM members_consolidated
    """)
    
    summary = cursor.fetchone()
    print(f"\n📈 Total Members: {summary['total_members']:,}", flush=True)
    print(f"✅ Active (Good Standing): {summary['active_members']:,} ({summary['active_pct']}%)", flush=True)
    print(f"⏳ Grace Period (Expired < 90 days): {summary['grace_period']:,}", flush=True)
    print(f"✅ Total Active (with Grace): {summary['total_active_with_grace']:,} ({summary['active_with_grace_pct']}%)", flush=True)
    print(f"❌ Inactive (Expired > 90 days): {summary['expired_over_90']:,}", flush=True)
    print(f"\n💡 Impact: {summary['expired_over_90']:,} members will be excluded from 'active' counts", flush=True)
    
    print(flush=True)
    print("=" * 100, flush=True)
    print("✅ ANALYSIS COMPLETE!", flush=True)
    print("=" * 100, flush=True)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()

