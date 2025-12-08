#!/usr/bin/env python3
"""
Test script to verify existing members detection in Excel report
"""

import psycopg2
import pandas as pd
import os

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

def test_existing_members_detection():
    """Test if the report correctly identifies existing vs new members"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("=" * 80)
        print("EXISTING MEMBERS DETECTION TEST")
        print("=" * 80)
        
        # Get the latest upload
        cursor.execute("""
            SELECT 
                file_id,
                original_filename,
                report_file_path,
                rows_total,
                rows_success
            FROM uploaded_files
            ORDER BY file_id DESC
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        
        if not result:
            print("\n❌ No uploads found")
            return
        
        file_id, filename, report_path, rows_total, rows_success = result
        
        print(f"\n📄 Latest Upload:")
        print(f"  File ID: {file_id}")
        print(f"  Filename: {filename}")
        print(f"  Total rows: {rows_total}")
        print(f"  Success: {rows_success}")
        
        # Check if report exists
        if not report_path:
            print(f"\n❌ No report path in database")
            return
        
        if not os.path.exists(report_path):
            print(f"\n❌ Report file not found: {report_path}")
            return
        
        print(f"\n✅ Report found: {report_path}")
        
        # Read the Excel report
        print(f"\n📊 Reading Excel report sheets...")
        
        try:
            # Read all sheets
            excel_file = pd.ExcelFile(report_path)
            sheet_names = excel_file.sheet_names
            
            print(f"\n📋 Available sheets:")
            for sheet in sheet_names:
                print(f"  - {sheet}")
            
            # Read Summary sheet
            if 'Summary' in sheet_names:
                df_summary = pd.read_excel(report_path, sheet_name='Summary')
                print(f"\n📈 Summary Statistics:")
                
                # Find key metrics
                for _, row in df_summary.iterrows():
                    metric = row.get('Metric', '')
                    value = row.get('Value', '')
                    
                    if 'New Members' in metric:
                        print(f"  ✅ {metric}: {value}")
                    elif 'Existing Members' in metric:
                        print(f"  ✅ {metric}: {value}")
                    elif 'Records Imported' in metric:
                        print(f"  📊 {metric}: {value}")
            
            # Check for Existing Members sheet
            if 'Existing Members (Updated)' in sheet_names:
                df_existing = pd.read_excel(report_path, sheet_name='Existing Members (Updated)')
                print(f"\n👥 Existing Members (Updated) Sheet:")
                print(f"  Rows: {len(df_existing)}")
                
                if len(df_existing) > 0 and 'Message' not in df_existing.columns:
                    print(f"  Columns: {', '.join(df_existing.columns)}")
                    print(f"\n  Sample records:")
                    for idx, row in df_existing.head(3).iterrows():
                        print(f"    - {row.get('ID Number', 'N/A')}: {row.get('Name', '')} {row.get('Surname', '')}")
                else:
                    print(f"  ℹ️  No existing members were updated")
            else:
                print(f"\n⚠️  'Existing Members (Updated)' sheet not found")
            
            # Check for New Members sheet
            if 'New Members' in sheet_names:
                df_new = pd.read_excel(report_path, sheet_name='New Members')
                print(f"\n👤 New Members Sheet:")
                print(f"  Rows: {len(df_new)}")
                
                if len(df_new) > 0 and 'Message' not in df_new.columns:
                    print(f"  Columns: {', '.join(df_new.columns)}")
                    print(f"\n  Sample records:")
                    for idx, row in df_new.head(3).iterrows():
                        print(f"    - {row.get('ID Number', 'N/A')}: {row.get('Name', '')} {row.get('Surname', '')}")
                else:
                    print(f"  ℹ️  No new members were imported")
            elif 'Successfully Imported' in sheet_names:
                df_new = pd.read_excel(report_path, sheet_name='Successfully Imported')
                print(f"\n👤 Successfully Imported Sheet:")
                print(f"  Rows: {len(df_new)}")
            
            print("\n" + "=" * 80)
            print("TEST SUMMARY")
            print("=" * 80)
            
            if 'Existing Members (Updated)' in sheet_names:
                print("✅ Report includes 'Existing Members (Updated)' sheet")
            else:
                print("❌ Report missing 'Existing Members (Updated)' sheet")
            
            if 'New Members' in sheet_names or 'Successfully Imported' in sheet_names:
                print("✅ Report includes new members sheet")
            else:
                print("❌ Report missing new members sheet")
            
        except Exception as e:
            print(f"\n❌ Error reading Excel report: {e}")
            import traceback
            traceback.print_exc()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_existing_members_detection()

