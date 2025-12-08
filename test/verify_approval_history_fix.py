import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

print("\n" + "=" * 80)
print("VERIFICATION: application_approval_history FOREIGN KEY")
print("=" * 80)

# Check the foreign key constraint
cur.execute("""
    SELECT 
        tc.constraint_name,
        kcu.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table,
        ccu.column_name as to_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_name = 'application_approval_history'
    AND kcu.column_name = 'member_id'
""")

fk_info = cur.fetchone()

if fk_info:
    print(f"\n✅ Foreign Key Found:")
    print(f"   Constraint: {fk_info[0]}")
    print(f"   From: {fk_info[1]}.{fk_info[2]}")
    print(f"   To: {fk_info[3]}.{fk_info[4]}")
    
    if fk_info[3] == 'members_consolidated':
        print(f"\n✅ CORRECT! References members_consolidated")
    else:
        print(f"\n❌ WRONG! Should reference members_consolidated, not {fk_info[3]}")
else:
    print("\n❌ No foreign key constraint found!")

# Check if member 772467 exists in members_consolidated
print("\n" + "=" * 80)
print("CHECKING MEMBER 772467")
print("=" * 80)

cur.execute("""
    SELECT member_id, firstname, surname, id_number, created_at
    FROM members_consolidated
    WHERE member_id = 772467
""")

member = cur.fetchone()

if member:
    print(f"\n✅ Member exists in members_consolidated:")
    print(f"   ID: {member[0]}")
    print(f"   Name: {member[1]} {member[2]}")
    print(f"   ID Number: {member[3]}")
    print(f"   Created: {member[4]}")
else:
    print("\n❌ Member 772467 NOT found in members_consolidated")

# Check if member exists in old members table
cur.execute("""
    SELECT member_id, firstname, surname
    FROM members
    WHERE member_id = 772467
""")

old_member = cur.fetchone()

if old_member:
    print(f"\n⚠️  Member also exists in old members table")
else:
    print(f"\n✅ Member does NOT exist in old members table (expected)")

print("\n" + "=" * 80)

conn.close()

