import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

print("=" * 120, flush=True)
print("INACTIVE MEMBERS REPORT (Expired > 90 days)", flush=True)
print("=" * 120, flush=True)
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
    
    # Get summary statistics
    print("📊 SUMMARY STATISTICS", flush=True)
    print("-" * 120, flush=True)
    
    cursor.execute("""
        SELECT
            COUNT(*) as total_members,
            COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) as active_members,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE AND expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as grace_period,
            COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as inactive_members,
            ROUND(COUNT(CASE WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) * 100.0 / COUNT(*), 2) as inactive_percentage
        FROM members_consolidated
    """)
    
    summary = cursor.fetchone()
    print(f"\n  Total Members: {summary['total_members']:,}", flush=True)
    print(f"  ✅ Active (Not Expired): {summary['active_members']:,}", flush=True)
    print(f"  ⏳ Grace Period (Expired < 90 days): {summary['grace_period']:,}", flush=True)
    print(f"  ❌ Inactive (Expired > 90 days): {summary['inactive_members']:,} ({summary['inactive_percentage']}%)", flush=True)
    print(flush=True)
    
    # Show sample of inactive members
    print("=" * 120, flush=True)
    print("📋 SAMPLE OF INACTIVE MEMBERS (First 20)", flush=True)
    print("=" * 120, flush=True)
    
    cursor.execute("""
        SELECT
            member_id,
            firstname,
            surname,
            membership_number,
            expiry_date,
            CURRENT_DATE - expiry_date as days_expired,
            ward_code,
            municipality_name,
            province_name
        FROM members_consolidated
        WHERE expiry_date < CURRENT_DATE - INTERVAL '90 days'
        ORDER BY expiry_date ASC
        LIMIT 20
    """)

    inactive_members = cursor.fetchall()

    print(f"\n{'Member ID':<12} {'Name':<30} {'Membership #':<15} {'Expiry Date':<12} {'Days Exp':<10} {'Ward':<10} {'Municipality':<20}", flush=True)
    print("-" * 120, flush=True)

    for member in inactive_members:
        full_name = f"{member['firstname'] or ''} {member['surname'] or ''}"
        membership_num = member['membership_number'] or 'N/A'
        ward = member['ward_code'] or 'N/A'
        municipality = (member['municipality_name'] or 'N/A')[:19]
        print(f"{member['member_id']:<12} {full_name[:29]:<30} {membership_num:<15} "
              f"{str(member['expiry_date']):<12} {member['days_expired']:<10} "
              f"{ward:<10} {municipality:<20}", flush=True)
    
    print(flush=True)
    
    # Show distribution by expiry date ranges
    print("=" * 120, flush=True)
    print("📅 INACTIVE MEMBERS BY EXPIRY DATE RANGE", flush=True)
    print("=" * 120, flush=True)
    
    cursor.execute("""
        SELECT
            CASE
                WHEN expiry_date < CURRENT_DATE - INTERVAL '2 years' THEN 'Expired > 2 years ago'
                WHEN expiry_date < CURRENT_DATE - INTERVAL '1 year' THEN 'Expired 1-2 years ago'
                WHEN expiry_date < CURRENT_DATE - INTERVAL '6 months' THEN 'Expired 6-12 months ago'
                WHEN expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Expired 90 days - 6 months ago'
            END as expiry_range,
            COUNT(*) as member_count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM members_consolidated WHERE expiry_date < CURRENT_DATE - INTERVAL '90 days'), 2) as percentage
        FROM members_consolidated
        WHERE expiry_date < CURRENT_DATE - INTERVAL '90 days'
        GROUP BY expiry_range
        ORDER BY 
            CASE expiry_range
                WHEN 'Expired > 2 years ago' THEN 1
                WHEN 'Expired 1-2 years ago' THEN 2
                WHEN 'Expired 6-12 months ago' THEN 3
                WHEN 'Expired 90 days - 6 months ago' THEN 4
            END
    """)
    
    ranges = cursor.fetchall()
    
    print(f"\n{'Expiry Range':<35} {'Count':<15} {'Percentage':<12}", flush=True)
    print("-" * 65, flush=True)
    
    for row in ranges:
        print(f"{row['expiry_range']:<35} {row['member_count']:<15,} {row['percentage']:<12}%", flush=True)
    
    print(flush=True)
    
    # Show top 10 wards with most inactive members
    print("=" * 120, flush=True)
    print("🏘️ TOP 10 WARDS WITH MOST INACTIVE MEMBERS", flush=True)
    print("=" * 120, flush=True)
    
    cursor.execute("""
        SELECT
            w.ward_code,
            w.ward_name,
            m.municipality_name,
            p.province_name,
            COUNT(*) as inactive_count,
            COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as active_count,
            COUNT(*) as total_count,
            ROUND(COUNT(*) * 100.0 / (COUNT(*) + COUNT(CASE WHEN mem.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END)), 2) as inactive_percentage
        FROM wards w
        LEFT JOIN municipalities m ON w.municipality_code = m.municipality_code
        LEFT JOIN districts d ON m.district_code = d.district_code
        LEFT JOIN provinces p ON d.province_code = p.province_code
        LEFT JOIN members_consolidated mem ON w.ward_code = mem.ward_code
        WHERE mem.expiry_date < CURRENT_DATE - INTERVAL '90 days'
        GROUP BY w.ward_code, w.ward_name, m.municipality_name, p.province_name
        ORDER BY inactive_count DESC
        LIMIT 10
    """)
    
    top_wards = cursor.fetchall()
    
    print(f"\n{'Ward':<12} {'Ward Name':<20} {'Municipality':<20} {'Inactive':<10} {'Active':<10} {'Total':<10} {'% Inactive':<12}", flush=True)
    print("-" * 120, flush=True)
    
    for ward in top_wards:
        print(f"{ward['ward_code']:<12} {ward['ward_name'][:19]:<20} {ward['municipality_name'][:19]:<20} "
              f"{ward['inactive_count']:<10,} {ward['active_count']:<10,} {ward['total_count']:<10,} {ward['inactive_percentage']:<12}%", flush=True)
    
    print(flush=True)
    
    # Show province breakdown
    print("=" * 120, flush=True)
    print("🗺️ INACTIVE MEMBERS BY PROVINCE", flush=True)
    print("=" * 120, flush=True)
    
    cursor.execute("""
        SELECT
            p.province_name,
            COUNT(CASE WHEN m.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as inactive_count,
            COUNT(CASE WHEN m.expiry_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as active_count,
            COUNT(*) as total_count,
            ROUND(COUNT(CASE WHEN m.expiry_date < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) * 100.0 / COUNT(*), 2) as inactive_percentage
        FROM provinces p
        LEFT JOIN members_consolidated m ON p.province_code = m.province_code
        GROUP BY p.province_name
        ORDER BY inactive_count DESC
    """)
    
    provinces = cursor.fetchall()
    
    print(f"\n{'Province':<25} {'Inactive':<15} {'Active':<15} {'Total':<15} {'% Inactive':<12}", flush=True)
    print("-" * 85, flush=True)
    
    for prov in provinces:
        print(f"{prov['province_name']:<25} {prov['inactive_count']:<15,} {prov['active_count']:<15,} "
              f"{prov['total_count']:<15,} {prov['inactive_percentage']:<12}%", flush=True)
    
    print(flush=True)
    print("=" * 120, flush=True)
    print("✅ REPORT COMPLETE!", flush=True)
    print("=" * 120, flush=True)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()

