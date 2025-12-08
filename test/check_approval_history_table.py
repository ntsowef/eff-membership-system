import psycopg2

conn = psycopg2.connect(
    host='localhost',
    user='eff_admin',
    password='Frames!123',
    database='eff_membership_database',
    port=5432
)

cur = conn.cursor()

# Check if table exists
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'application_approval_history'
""")

result = cur.fetchone()

if result:
    print(f"✅ Table 'application_approval_history' exists")
    
    # Get columns
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'application_approval_history' 
        ORDER BY ordinal_position
    """)
    
    cols = cur.fetchall()
    print("\nColumns:")
    for c in cols:
        print(f"  {c[0]}: {c[1]}")
    
    # Get foreign keys
    cur.execute("""
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name as foreign_table,
            ccu.column_name as foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.table_name = 'application_approval_history'
    """)
    
    fks = cur.fetchall()
    print("\nForeign Keys:")
    for fk in fks:
        print(f"  {fk[0]}: {fk[1]} -> {fk[2]}.{fk[3]}")
else:
    print("❌ Table 'application_approval_history' does NOT exist")

conn.close()

