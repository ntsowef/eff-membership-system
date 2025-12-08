import psycopg2

# Connect to database
conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database'
)

cursor = conn.cursor()

print("=" * 80)
print("CHECKING SELF DATA MANAGEMENT PERMISSIONS")
print("=" * 80)

# First check the structure of permissions table
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'permissions'
    ORDER BY ordinal_position
""")
columns = cursor.fetchall()
print("\nPermissions table structure:")
print("-" * 80)
for col in columns:
    print(f"   {col[0]}: {col[1]}")

# Check if permissions exist
cursor.execute("""
    SELECT permission_id, permission_name, description
    FROM permissions 
    WHERE permission_name LIKE 'self_data_management%' 
    ORDER BY permission_name
""")
permissions = cursor.fetchall()

print("\n1. Self Data Management Permissions:")
print("-" * 80)
if permissions:
    for perm in permissions:
        print(f"   ID: {perm[0]}, Name: {perm[1]}")
        print(f"   Description: {perm[2]}")
        print()
else:
    print("   ⚠️  NO PERMISSIONS FOUND!")

# Check Provincial Admin role
cursor.execute("""
    SELECT role_id, role_name, description 
    FROM roles 
    WHERE role_name ILIKE '%provincial%'
""")
provincial_roles = cursor.fetchall()

print("\n2. Provincial Admin Roles:")
print("-" * 80)
if provincial_roles:
    for role in provincial_roles:
        print(f"   ID: {role[0]}, Name: {role[1]}")
        print(f"   Description: {role[2]}")
        print()
else:
    print("   ⚠️  NO PROVINCIAL ADMIN ROLE FOUND!")

# Check what permissions Provincial Admin currently has
if provincial_roles:
    for role in provincial_roles:
        role_id = role[0]
        role_name = role[1]
        
        cursor.execute("""
            SELECT p.permission_name, p.description
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.permission_id
            WHERE rp.role_id = %s
            ORDER BY p.permission_name
        """, (role_id,))
        
        role_permissions = cursor.fetchall()
        
        print(f"\n3. Current Permissions for {role_name} (ID: {role_id}):")
        print("-" * 80)
        if role_permissions:
            for perm in role_permissions:
                print(f"   ✓ {perm[0]}")
        else:
            print("   ⚠️  NO PERMISSIONS ASSIGNED!")
        
        # Check specifically for self_data_management permissions
        cursor.execute("""
            SELECT p.permission_name
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.permission_id
            WHERE rp.role_id = %s AND p.permission_name LIKE 'self_data_management%'
        """, (role_id,))
        
        sdm_permissions = cursor.fetchall()
        
        print(f"\n4. Self Data Management Permissions for {role_name}:")
        print("-" * 80)
        if sdm_permissions:
            for perm in sdm_permissions:
                print(f"   ✓ {perm[0]}")
        else:
            print("   ❌ NO SELF DATA MANAGEMENT PERMISSIONS!")

cursor.close()
conn.close()

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)

