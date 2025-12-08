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
print("GRANTING SELF DATA MANAGEMENT PERMISSIONS TO PROVINCIAL ADMIN")
print("=" * 80)

try:
    # Get Provincial Administrator role ID
    cursor.execute("SELECT role_id FROM roles WHERE role_name = 'Provincial Administrator'")
    result = cursor.fetchone()
    
    if not result:
        print("❌ Provincial Administrator role not found!")
        exit(1)
    
    role_id = result[0]
    print(f"\n✓ Found Provincial Administrator role (ID: {role_id})")
    
    # Get permission IDs
    permissions_to_grant = [
        'self_data_management.read',
        'self_data_management.write',
        'self_data_management.delete'
    ]
    
    granted_count = 0
    
    for perm_name in permissions_to_grant:
        cursor.execute(
            "SELECT permission_id FROM permissions WHERE permission_name = %s",
            (perm_name,)
        )
        result = cursor.fetchone()
        
        if not result:
            print(f"⚠️  Permission '{perm_name}' not found in database!")
            continue
        
        perm_id = result[0]
        
        # Grant permission
        cursor.execute("""
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (role_id, permission_id) DO NOTHING
        """, (role_id, perm_id))
        
        if cursor.rowcount > 0:
            print(f"✓ Granted '{perm_name}' to Provincial Administrator")
            granted_count += 1
        else:
            print(f"ℹ️  '{perm_name}' already granted to Provincial Administrator")
    
    # Commit the changes
    conn.commit()
    
    print(f"\n✅ Successfully granted {granted_count} new permissions!")
    
    # Verify the permissions
    print("\n" + "=" * 80)
    print("VERIFICATION - Provincial Administrator Permissions:")
    print("=" * 80)
    
    cursor.execute("""
        SELECT p.permission_name, p.description
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE rp.role_id = %s AND p.permission_name LIKE 'self_data_management%%'
        ORDER BY p.permission_name
    """, (role_id,))
    
    permissions = cursor.fetchall()
    
    if permissions:
        for perm in permissions:
            print(f"   ✓ {perm[0]}")
            print(f"     {perm[1]}")
    else:
        print("   ❌ No self_data_management permissions found!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    conn.rollback()
finally:
    cursor.close()
    conn.close()

print("\n" + "=" * 80)
print("DONE")
print("=" * 80)

