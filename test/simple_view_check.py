import psycopg2

c = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

r = c.cursor()

# Check if view exists
r.execute("SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'vw_member_details_optimized'")
exists = r.fetchone()[0] > 0
print(f"View exists: {exists}")

if exists:
    # Get row count
    r.execute("SELECT COUNT(*) FROM vw_member_details_optimized")
    count = r.fetchone()[0]
    print(f"Row count: {count:,}")
    
    # Check definition
    r.execute("SELECT view_definition FROM information_schema.views WHERE table_name = 'vw_member_details_optimized'")
    definition = r.fetchone()[0]
    
    uses_consolidated = 'members_consolidated' in definition
    uses_members = 'FROM members m' in definition or 'FROM members AS m' in definition
    
    print(f"Uses members_consolidated: {uses_consolidated}")
    print(f"Uses old members table: {uses_members}")

c.close()

