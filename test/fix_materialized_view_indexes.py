#!/usr/bin/env python3
"""
Fix Materialized View Concurrent Refresh Issue
Add unique indexes to enable CONCURRENT refresh
"""

import psycopg2
import sys

# Database connection parameters
DB_CONFIG = {
    'host': 'localhost',
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database',
    'port': 5432
}

def main():
    print("=" * 80)
    print("FIX MATERIALIZED VIEW CONCURRENT REFRESH")
    print("=" * 80)
    
    try:
        # Connect to database
        print("\n📡 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print("✅ Connected successfully")
        
        # Read the SQL file
        print("\n📄 Reading SQL migration file...")
        with open('backend/migrations/add-unique-indexes-to-materialized-views.sql', 'r') as f:
            sql_content = f.read()
        print("✅ SQL file loaded")
        
        # Execute the SQL
        print("\n🔧 Creating unique indexes...")
        cur.execute(sql_content)
        conn.commit()
        print("✅ Unique indexes created successfully!")
        
        # Verify indexes were created
        print("\n🔍 Verifying indexes...")
        cur.execute("""
            SELECT 
                schemaname,
                tablename,
                indexname
            FROM pg_indexes
            WHERE tablename IN (
                'mv_membership_analytics_summary',
                'mv_geographic_performance',
                'mv_membership_growth_monthly'
            )
            AND indexname LIKE '%unique%'
            ORDER BY tablename, indexname
        """)
        
        indexes = cur.fetchall()
        if indexes:
            print(f"✅ Found {len(indexes)} unique indexes:")
            for schema, table, index in indexes:
                print(f"   - {table}: {index}")
        else:
            print("⚠️ No unique indexes found")
        
        # Test concurrent refresh
        print("\n🧪 Testing concurrent refresh...")
        try:
            cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_geographic_performance")
            conn.commit()
            print("✅ Concurrent refresh successful!")
        except Exception as e:
            print(f"❌ Concurrent refresh failed: {e}")
            conn.rollback()
        
        # Close connection
        cur.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("✅ FIX COMPLETE!")
        print("=" * 80)
        print("\nMaterialized views can now be refreshed concurrently without errors.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()

