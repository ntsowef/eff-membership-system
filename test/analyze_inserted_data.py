#!/usr/bin/env python3
"""
Analyze the quality of data inserted into members_consolidated from recent bulk upload
"""

import psycopg2
from psycopg2.extras import RealDictCursor

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def analyze_data():
    """Analyze recently inserted data"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("=" * 80)
        print("DATA QUALITY ANALYSIS - RECENT BULK UPLOAD")
        print("=" * 80)
        
        # Get recent members (last hour)
        cursor.execute("""
            SELECT 
                id_number,
                firstname,
                surname,
                date_of_birth,
                age,
                gender_id,
                race_id,
                citizenship_id,
                language_id,
                ward_code,
                voter_district_code,
                voting_district_code,
                residential_address,
                cell_number,
                email,
                occupation_id,
                qualification_id,
                voter_status_id,
                membership_type,
                province_name,
                province_code,
                district_name,
                district_code,
                municipality_name,
                municipality_code,
                date_joined,
                last_payment_date,
                expiry_date,
                subscription_type_id,
                membership_amount,
                membership_status_id,
                payment_method,
                payment_reference,
                payment_status,
                created_at
            FROM members_consolidated
            WHERE created_at > NOW() - INTERVAL '1 hour'
            ORDER BY created_at DESC
        """)
        
        members = cursor.fetchall()
        
        if not members:
            print("\n❌ No recent members found")
            return
        
        print(f"\n📊 Analyzing {len(members)} recently inserted members\n")
        
        # Field completeness analysis
        print("=" * 80)
        print("FIELD COMPLETENESS ANALYSIS")
        print("=" * 80)
        
        fields_to_check = [
            'firstname', 'surname', 'id_number', 'date_of_birth', 'age',
            'gender_id', 'ward_code', 'voter_district_code', 'membership_status_id',
            'province_code', 'municipality_code', 'date_joined', 'expiry_date'
        ]
        
        for field in fields_to_check:
            null_count = sum(1 for m in members if m[field] is None)
            filled_count = len(members) - null_count
            percentage = (filled_count / len(members)) * 100
            status = "✅" if percentage == 100 else "⚠️ " if percentage > 90 else "❌"
            print(f"{status} {field:30s}: {filled_count:3d}/{len(members)} ({percentage:5.1f}%)")
        
        # Membership status analysis
        print("\n" + "=" * 80)
        print("MEMBERSHIP STATUS ANALYSIS")
        print("=" * 80)
        
        status_counts = {}
        for member in members:
            status = member['membership_status_id']
            status_counts[status] = status_counts.get(status, 0) + 1
        
        for status, count in sorted(status_counts.items()):
            percentage = (count / len(members)) * 100
            print(f"Status {status}: {count:3d} members ({percentage:5.1f}%)")
        
        if 1 in status_counts and status_counts[1] == len(members):
            print("✅ All members have membership_status_id = 1 (Good Standing)")
        else:
            print("⚠️  Not all members have status = 1 (Good Standing)")
        
        # Geographic data analysis
        print("\n" + "=" * 80)
        print("GEOGRAPHIC DATA ANALYSIS")
        print("=" * 80)
        
        provinces = set(m['province_code'] for m in members if m['province_code'])
        municipalities = set(m['municipality_code'] for m in members if m['municipality_code'])
        wards = set(m['ward_code'] for m in members if m['ward_code'])
        
        print(f"Unique Provinces: {len(provinces)}")
        print(f"Unique Municipalities: {len(municipalities)}")
        print(f"Unique Wards: {len(wards)}")
        
        # Sample data
        print("\n" + "=" * 80)
        print("SAMPLE DATA (First 3 Members)")
        print("=" * 80)
        
        for i, member in enumerate(members[:3], 1):
            print(f"\nMember {i}:")
            print(f"  Name: {member['firstname']} {member['surname']}")
            print(f"  ID Number: {member['id_number']}")
            print(f"  DOB: {member['date_of_birth']}, Age: {member['age']}")
            print(f"  Gender ID: {member['gender_id']}")
            print(f"  Ward: {member['ward_code']}, VD: {member['voter_district_code']}")
            print(f"  Province: {member['province_name']} ({member['province_code']})")
            print(f"  Municipality: {member['municipality_name']} ({member['municipality_code']})")
            print(f"  Membership Status: {member['membership_status_id']}")
            print(f"  Date Joined: {member['date_joined']}")
            print(f"  Expiry Date: {member['expiry_date']}")
            print(f"  Payment Status: {member['payment_status']}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETE")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    analyze_data()

