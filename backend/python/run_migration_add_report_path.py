"""
Run migration to add report_file_path column to uploaded_files table
"""

import psycopg2

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def run_migration():
    """Run the migration to add report_file_path column"""
    
    conn = None
    cursor = None
    
    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("✅ Connected successfully!\n")
        
        print("="*80)
        print("Running Migration: Add report_file_path to uploaded_files")
        print("="*80)
        
        # Add report_file_path column
        print("\n1. Adding report_file_path column...")
        cursor.execute("""
            ALTER TABLE uploaded_files 
            ADD COLUMN IF NOT EXISTS report_file_path VARCHAR(500) NULL
        """)
        print("   ✅ Column added")
        
        # Add comment
        print("\n2. Adding column comment...")
        cursor.execute("""
            COMMENT ON COLUMN uploaded_files.report_file_path 
            IS 'Path to the generated Excel report file'
        """)
        print("   ✅ Comment added")
        
        # Create index
        print("\n3. Creating index...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_uploaded_files_report_path 
            ON uploaded_files(report_file_path) 
            WHERE report_file_path IS NOT NULL
        """)
        print("   ✅ Index created")
        
        # Commit changes
        conn.commit()
        print("\n✅ Migration committed to database")
        
        # Verify the column was added
        print("\n" + "="*80)
        print("Verification:")
        print("="*80)
        
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                character_maximum_length,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'uploaded_files' 
            AND column_name = 'report_file_path'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"\nColumn Details:")
            print(f"  Name: {result[0]}")
            print(f"  Type: {result[1]}")
            print(f"  Max Length: {result[2]}")
            print(f"  Nullable: {result[3]}")
        else:
            print("\n⚠️  Column not found!")
        
        print("\n" + "="*80)
        print("✅ Migration completed successfully!")
        print("="*80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        if conn:
            conn.rollback()
            print("🔄 Changes rolled back")
        import traceback
        traceback.print_exc()
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("\n🔌 Database connection closed")


if __name__ == '__main__':
    run_migration()

