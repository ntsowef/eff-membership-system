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
print("CHECKING DELETE PERMISSION")
print("=" * 80)

# Check if delete permission exists
cursor.execute("""
    SELECT permission_id, permission_name, description
    FROM permissions 
    WHERE permission_name = 'self_data_management.delete'
""")
result = cursor.fetchone()

if result:
    print(f"\n✓ Delete permission exists:")
    print(f"   ID: {result[0]}")
    print(f"   Name: {result[1]}")
    print(f"   Description: {result[2]}")
else:
    print("\n❌ Delete permission does NOT exist!")
    print("\nCreating delete permission...")
    
    cursor.execute("""
        INSERT INTO permissions (permission_name, description, resource, action, is_active, created_at, updated_at)
        VALUES (
            'self_data_management.delete',
            'Permission to delete members in bulk',
            'self_data_management',
            'delete',
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING permission_id
    """)
    
    new_perm_id = cursor.fetchone()[0]
    conn.commit()
    
    print(f"✓ Created delete permission (ID: {new_perm_id})")
    
    # Grant to Provincial Administrator
    cursor.execute("SELECT role_id FROM roles WHERE role_name = 'Provincial Administrator'")
    role_id = cursor.fetchone()[0]
    
    cursor.execute("""
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
    """, (role_id, new_perm_id))
    
    conn.commit()
    
    print(f"✓ Granted delete permission to Provincial Administrator")

# Check all self_data_management permissions for Provincial Admin
print("\n" + "=" * 80)
print("ALL SELF DATA MANAGEMENT PERMISSIONS FOR PROVINCIAL ADMIN:")
print("=" * 80)

cursor.execute("""
    SELECT p.permission_name, p.description
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.permission_id
    JOIN roles r ON rp.role_id = r.role_id
    WHERE r.role_name = 'Provincial Administrator'
      AND p.permission_name LIKE 'self_data_management%'
    ORDER BY p.permission_name
""")

permissions = cursor.fetchall()

if permissions:
    for perm in permissions:
        print(f"   ✓ {perm[0]}")
        print(f"     {perm[1]}")
else:
    print("   ❌ No permissions found!")

cursor.close()
conn.close()

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)

