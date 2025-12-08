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
    
    # Check permissions
    cursor.execute("""
        SELECT p.permission_name
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        JOIN roles r ON rp.role_id = r.role_id
        WHERE r.role_name = 'Provincial Administrator'
          AND p.permission_name LIKE 'self_data_management%%'
        ORDER BY p.permission_name
    """)
    
    permissions = cursor.fetchall()
    
    print("Provincial Admin Self Data Management Permissions:")
    for perm in permissions:
        print(f"  - {perm[0]}")
    
    # Check if delete exists
    cursor.execute("SELECT COUNT(*) FROM permissions WHERE permission_name = 'self_data_management.delete'")
    count = cursor.fetchone()[0]
    print(f"\nDelete permission exists: {count > 0}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)

