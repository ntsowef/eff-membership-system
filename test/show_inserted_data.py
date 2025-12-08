#!/usr/bin/env python3
"""
Show the inserted data from the database with all relevant columns
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

# Get recent records (last 10 minutes)
cutoff = datetime.now() - timedelta(minutes=10)

print("=" * 150)
print("INSERTED DATA FROM TEST FILE (FransTest_unique.xlsx)")
print("=" * 150)

cur.execute("""
    SELECT 
        mc.member_id,
        mc.id_number,
        mc.firstname,
        mc.surname,
        mc.gender_id,
        g.gender_name,
        mc.voter_status_id,
        vs.status_name as voter_status,
        mc.membership_status_id,
        ms.status_name as membership_status,
        mc.voter_district_code,
        mc.voting_district_code,
        mc.ward_code,
        mc.province_name,
        mc.district_name,
        mc.municipality_name,
        mc.cell_number,
        mc.email,
        mc.created_at,
        mc.updated_at
    FROM members_consolidated mc
    LEFT JOIN genders g ON mc.gender_id = g.gender_id
    LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
    LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
    WHERE mc.updated_at > %s
    ORDER BY mc.id_number
""", (cutoff,))

results = cur.fetchall()

if not results:
    print("\n❌ No recent records found. Run the ingestion test first.")
    conn.close()
    exit()

print(f"\nTotal Records: {len(results)}")
print("\n" + "=" * 150)

# Show detailed records
for i, row in enumerate(results, 1):
    print(f"\n[Record {i}]")
    print("-" * 150)
    print(f"  Member ID:              {row[0]}")
    print(f"  ID Number:              {row[1]}")
    print(f"  Name:                   {row[2]} {row[3]}")
    print(f"  Gender:                 {row[5]} (ID: {row[4]})")
    print(f"  Voter Status:           {row[7]} (ID: {row[6]})")
    print(f"  Membership Status:      {row[9]} (ID: {row[8]})")
    print(f"  Voter District Code:    {row[10] if row[10] else 'NULL'}")
    print(f"  Voting District Code:   {row[11] if row[11] else 'NULL'}")
    print(f"  Ward Code:              {row[12] if row[12] else 'NULL'}")
    print(f"  Province:               {row[13] if row[13] else 'NULL'}")
    print(f"  District:               {row[14] if row[14] else 'NULL'}")
    print(f"  Municipality:           {row[15] if row[15] else 'NULL'}")
    print(f"  Cell Number:            {row[16] if row[16] else 'NULL'}")
    print(f"  Email:                  {row[17] if row[17] else 'NULL'}")
    print(f"  Created At:             {row[18]}")
    print(f"  Updated At:             {row[19]}")

# Summary statistics
print("\n" + "=" * 150)
print("SUMMARY STATISTICS")
print("=" * 150)

# Voter Status breakdown
cur.execute("""
    SELECT vs.status_name, COUNT(*) as cnt
    FROM members_consolidated mc
    LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
    WHERE mc.updated_at > %s
    GROUP BY vs.status_name
    ORDER BY cnt DESC
""", (cutoff,))

print("\nVoter Status Distribution:")
for row in cur.fetchall():
    status_name = row[0] if row[0] else "NULL"
    print(f"  {status_name}: {row[1]}")

# Membership Status breakdown
cur.execute("""
    SELECT ms.status_name, COUNT(*) as cnt
    FROM members_consolidated mc
    LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
    WHERE mc.updated_at > %s
    GROUP BY ms.status_name
    ORDER BY cnt DESC
""", (cutoff,))

print("\nMembership Status Distribution:")
for row in cur.fetchall():
    status_name = row[0] if row[0] else "NULL"
    print(f"  {status_name}: {row[1]}")

# VD Code breakdown
cur.execute("""
    SELECT 
        COUNT(*) as total,
        COUNT(voter_district_code) as has_voter_district_code,
        COUNT(voting_district_code) as has_voting_district_code,
        SUM(CASE WHEN voter_district_code IN ('00000000', '22222222', '11111111', '99999999', '33333333') THEN 1 ELSE 0 END) as special_codes
    FROM members_consolidated
    WHERE updated_at > %s
""", (cutoff,))

vd_stats = cur.fetchone()
print("\nVD Code Statistics:")
print(f"  Total records: {vd_stats[0]}")
print(f"  With voter_district_code: {vd_stats[1]} ({vd_stats[1]/vd_stats[0]*100:.1f}%)")
print(f"  With voting_district_code: {vd_stats[2]} ({vd_stats[2]/vd_stats[0]*100:.1f}%)")
print(f"  Special VD codes: {vd_stats[3]}")

# Gender breakdown
cur.execute("""
    SELECT g.gender_name, COUNT(*) as cnt
    FROM members_consolidated mc
    LEFT JOIN genders g ON mc.gender_id = g.gender_id
    WHERE mc.updated_at > %s
    GROUP BY g.gender_name
    ORDER BY cnt DESC
""", (cutoff,))

print("\nGender Distribution:")
for row in cur.fetchall():
    gender_name = row[0] if row[0] else "NULL"
    print(f"  {gender_name}: {row[1]}")

# Province breakdown
cur.execute("""
    SELECT province_name, COUNT(*) as cnt
    FROM members_consolidated
    WHERE updated_at > %s
    GROUP BY province_name
    ORDER BY cnt DESC
""", (cutoff,))

print("\nProvince Distribution:")
for row in cur.fetchall():
    province_name = row[0] if row[0] else "NULL"
    print(f"  {province_name}: {row[1]}")

conn.close()

print("\n" + "=" * 150)
print("END OF REPORT")
print("=" * 150)

