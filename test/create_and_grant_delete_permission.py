import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host='localhost',
        user='eff_admin',
        password='Frames!123',
        database='eff_membership_database'
    )
    
    cursor = conn.cursor()
    
    print("Creating self_data_management.delete permission...")
    
    # Create the delete permission
    cursor.execute("""
        INSERT INTO permissions (permission_name, permission_code, description, resource, action, is_active, created_at, updated_at)
        VALUES (
            'self_data_management.delete',
            'SDM_DELETE',
            'Permission to delete members in bulk',
            'self_data_management',
            'delete',
            TRUE,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (permission_name) DO NOTHING
        RETURNING permission_id
    """)
    
    result = cursor.fetchone()
    if result:
        perm_id = result[0]
        print(f"✓ Created delete permission (ID: {perm_id})")
    else:
        # Permission already exists, get its ID
        cursor.execute("SELECT permission_id FROM permissions WHERE permission_name = 'self_data_management.delete'")
        perm_id = cursor.fetchone()[0]
        print(f"ℹ️  Delete permission already exists (ID: {perm_id})")
    
    # Get Provincial Administrator role ID
    cursor.execute("SELECT role_id FROM roles WHERE role_name = 'Provincial Administrator'")
    role_id = cursor.fetchone()[0]
    print(f"✓ Found Provincial Administrator role (ID: {role_id})")
    
    # Grant permission to Provincial Administrator
    cursor.execute("""
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        VALUES (%s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (role_id, permission_id) DO NOTHING
    """, (role_id, perm_id))
    
    if cursor.rowcount > 0:
        print(f"✓ Granted delete permission to Provincial Administrator")
    else:
        print(f"ℹ️  Delete permission already granted to Provincial Administrator")
    
    conn.commit()
    
    # Verify all permissions
    print("\n" + "=" * 80)
    print("ALL SELF DATA MANAGEMENT PERMISSIONS FOR PROVINCIAL ADMIN:")
    print("=" * 80)
    
    cursor.execute("""
        SELECT p.permission_name, p.description
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        JOIN roles r ON rp.role_id = r.role_id
        WHERE r.role_name = 'Provincial Administrator'
          AND p.permission_name LIKE 'self_data_management%%'
        ORDER BY p.permission_name
    """)
    
    permissions = cursor.fetchall()
    
    for perm in permissions:
        print(f"   ✓ {perm[0]}")
        print(f"     {perm[1]}")
    
    print("\n✅ SUCCESS! Provincial Administrator now has full access to Self Data Management!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)

