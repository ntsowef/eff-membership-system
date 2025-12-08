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
print("RUNNING GENDER COLUMN MIGRATION")
print("=" * 80)

try:
    # Step 1: Add gender column if it doesn't exist
    print("\n[1/5] Adding gender column...")
    cur.execute("""
        ALTER TABLE membership_applications 
        ADD COLUMN IF NOT EXISTS gender VARCHAR(50)
    """)
    print("✅ Gender column added")
    
    # Step 2: Update existing records
    print("\n[2/5] Updating existing records from gender_id...")
    cur.execute("""
        UPDATE membership_applications ma
        SET gender = CASE 
            WHEN g.gender_name = 'Male' THEN 'Male'
            WHEN g.gender_name = 'Female' THEN 'Female'
            WHEN g.gender_name = 'Other' THEN 'Other'
            ELSE 'Prefer not to say'
        END
        FROM genders g
        WHERE ma.gender_id = g.gender_id
        AND ma.gender IS NULL
    """)
    print(f"✅ Updated {cur.rowcount} records")
    
    # Step 3: Drop old constraint if exists
    print("\n[3/5] Dropping old constraint...")
    cur.execute("""
        ALTER TABLE membership_applications
        DROP CONSTRAINT IF EXISTS membership_applications_gender_check
    """)
    print("✅ Old constraint dropped")
    
    # Step 4: Add check constraint
    print("\n[4/5] Adding check constraint...")
    cur.execute("""
        ALTER TABLE membership_applications
        ADD CONSTRAINT membership_applications_gender_check 
        CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say'))
    """)
    print("✅ Check constraint added")
    
    # Step 5: Create index
    print("\n[5/5] Creating index...")
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_membership_applications_gender 
        ON membership_applications(gender)
    """)
    print("✅ Index created")
    
    # Commit changes
    conn.commit()
    
    print("\n" + "=" * 80)
    print("✅ MIGRATION COMPLETED SUCCESSFULLY")
    print("=" * 80)
    
    # Verify the column exists
    print("\n[VERIFICATION] Checking gender column...")
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'membership_applications'
        AND column_name = 'gender'
    """)
    
    result = cur.fetchone()
    if result:
        print(f"✅ Column exists: {result[0]} ({result[1]}, {'NULL' if result[2] == 'YES' else 'NOT NULL'})")
    else:
        print("❌ Column not found!")
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()

print("\n" + "=" * 80)

