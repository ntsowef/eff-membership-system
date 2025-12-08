#!/usr/bin/env python3
"""
Import IEC Voting Stations data from Excel to PostgreSQL
Source: reports/VOTING_STATIONS_ELECTIONS.xlsx
Target: iec_voting_stations table
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import sys
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'eff_membership_database',
    'user': 'eff_admin',
    'password': 'Frames!123'
}

# Excel file path
EXCEL_PATH = r'C:\Development\NewProj\Membership-newV2\reports\VOTING_STATIONS_ELECTIONS.xlsx'

def import_voting_stations():
    """Import voting stations from Excel to database"""
    
    print('🚀 Starting IEC Voting Stations Import')
    print('=' * 80)
    
    # Step 1: Read Excel file
    print(f'\n📂 Reading Excel file: {EXCEL_PATH}')
    try:
        df = pd.read_excel(EXCEL_PATH)
        print(f'✅ Loaded {len(df)} rows from Excel')
    except Exception as e:
        print(f'❌ Error reading Excel file: {e}')
        sys.exit(1)
    
    # Step 2: Connect to database
    print('\n🔌 Connecting to database...')
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print('✅ Database connected')
    except Exception as e:
        print(f'❌ Error connecting to database: {e}')
        sys.exit(1)
    
    # Step 3: Clear existing data
    print('\n🗑️  Clearing existing data...')
    try:
        cur.execute('TRUNCATE TABLE iec_voting_stations RESTART IDENTITY CASCADE')
        conn.commit()
        print('✅ Table cleared')
    except Exception as e:
        print(f'❌ Error clearing table: {e}')
        conn.rollback()
        sys.exit(1)
    
    # Step 4: Prepare data for insertion
    print('\n📝 Preparing data for insertion...')
    
    # Replace NaN with None for proper NULL handling
    df = df.where(pd.notna(df), None)
    
    # Prepare insert query
    insert_query = """
        INSERT INTO iec_voting_stations (
            town,
            suburb,
            street,
            latitude,
            longitude,
            iec_province_id,
            iec_province_name,
            iec_municipality_id,
            iec_municipality_name,
            iec_ward_id,
            iec_vd_number,
            iec_voting_district_name,
            iec_vd_address
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
    """
    
    # Prepare data tuples
    data = []
    for _, row in df.iterrows():
        data.append((
            row['Town'],
            row['Suburb'],
            row['Street'],
            row['Latitude'],
            row['Longitude'],
            int(row['ProvinceID']),
            row['Province'],
            int(row['MunicipalityID']),
            row['Municipality'],
            int(row['WardID']),
            int(row['VDNumber']),
            row['VotingDistrict'],
            row['VDAddress']
        ))
    
    print(f'✅ Prepared {len(data)} records for insertion')
    
    # Step 5: Insert data in batches
    print('\n💾 Inserting data into database...')
    batch_size = 1000
    total_inserted = 0
    
    try:
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            execute_batch(cur, insert_query, batch, page_size=batch_size)
            total_inserted += len(batch)
            print(f'  Progress: {total_inserted}/{len(data)} records inserted ({total_inserted/len(data)*100:.1f}%)')
        
        conn.commit()
        print(f'\n✅ Successfully inserted {total_inserted} voting stations')
        
    except Exception as e:
        print(f'\n❌ Error inserting data: {e}')
        conn.rollback()
        sys.exit(1)
    
    # Step 6: Verify data
    print('\n🔍 Verifying imported data...')
    try:
        cur.execute('SELECT COUNT(*) FROM iec_voting_stations')
        count = cur.fetchone()[0]
        print(f'✅ Total records in database: {count}')
        
        # Check unique values
        cur.execute('SELECT COUNT(DISTINCT iec_province_id) FROM iec_voting_stations')
        provinces = cur.fetchone()[0]
        print(f'✅ Unique provinces: {provinces}')
        
        cur.execute('SELECT COUNT(DISTINCT iec_municipality_id) FROM iec_voting_stations')
        municipalities = cur.fetchone()[0]
        print(f'✅ Unique municipalities: {municipalities}')
        
        cur.execute('SELECT COUNT(DISTINCT iec_ward_id) FROM iec_voting_stations')
        wards = cur.fetchone()[0]
        print(f'✅ Unique wards: {wards}')
        
    except Exception as e:
        print(f'⚠️  Warning during verification: {e}')
    
    # Close connection
    cur.close()
    conn.close()
    
    print('\n' + '=' * 80)
    print('✅ IEC Voting Stations Import Complete!')
    print(f'📊 Imported {total_inserted} voting stations')
    print(f'📅 Import completed at: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')

if __name__ == '__main__':
    import_voting_stations()

