"""
Test script to verify Daily Report Metro Municipality fix
Analyzes the existing Daily Report to check if Metro Municipalities are correctly handled
"""

import pandas as pd
import sys
from pathlib import Path

def test_daily_report_metro_fix():
    print('🧪 Testing Daily Report Metro Municipality Fix\n')
    print('=' * 80)

    try:
        # Load the existing report
        report_path = Path(__file__).parent.parent / 'solo' / 'Daily_Report_2025-11-18 (1).xlsx'
        print(f'📂 Loading report from: {report_path}\n')

        # Read the Municipality-District Analysis sheet
        df = pd.read_excel(report_path, sheet_name='Municipality-District Analysis')
        
        # Extract data
        municipalities = []
        metro_municipalities = []
        gauteng_municipalities = []
        current_province = ''
        province_data = {}

        print('📊 Analyzing sheet data...\n')

        for idx, row in df.iterrows():
            municipality_name = str(row.iloc[0]) if pd.notna(row.iloc[0]) else ''
            iec_wards = row.iloc[1] if pd.notna(row.iloc[1]) else None

            # Check if it's a province header (no data in other columns)
            if pd.isna(iec_wards) and 'Total' not in municipality_name and municipality_name:
                current_province = municipality_name
                province_data[current_province] = []
                print(f'📍 Province: {current_province}')
                continue

            # Skip totals rows
            if 'Total' in municipality_name:
                continue

            # Check for Metro Municipalities
            if 'Metropolitan Municipality' in municipality_name:
                metro_municipalities.append({
                    'name': municipality_name,
                    'province': current_province,
                    'wards': iec_wards
                })
                print(f'   ❌ FOUND METRO: {municipality_name} ({iec_wards} wards)')
            elif municipality_name:
                municipalities.append(municipality_name)
                if current_province:
                    province_data[current_province].append(municipality_name)
                if current_province == 'Gauteng':
                    gauteng_municipalities.append(municipality_name)
                    print(f'   ✅ {municipality_name}')

        # Results
        print('\n' + '=' * 80)
        print('📊 TEST RESULTS')
        print('=' * 80)

        print(f'\n✅ Total municipalities/sub-regions found: {len(municipalities)}')
        print(f'✅ Gauteng municipalities/sub-regions: {len(gauteng_municipalities)}')

        if len(metro_municipalities) == 0:
            print('\n✅ SUCCESS: No Metro Municipalities found in report')
            print('   Metro Municipalities are correctly excluded')
            print('   Only sub-regions are shown')
        else:
            print(f'\n❌ FAILURE: Found {len(metro_municipalities)} Metro Municipalities:')
            for metro in metro_municipalities:
                print(f'   - {metro["name"]} (Province: {metro["province"]}, Wards: {metro["wards"]})')
            print('\n   These should NOT appear in the report!')
            print('   Only their sub-regions should be shown.')

        print('\n📋 Gauteng Municipalities/Sub-Regions:')
        for muni in gauteng_municipalities:
            print(f'   - {muni}')

        print('\n📊 Province Summary:')
        for province, munis in province_data.items():
            if province:
                print(f'   {province}: {len(munis)} municipalities/sub-regions')

        print('\n' + '=' * 80)
        print('🎯 EXPECTED BEHAVIOR:')
        print('=' * 80)
        print('❌ Should NOT see:')
        print('   - City of Johannesburg Metropolitan Municipality')
        print('   - City of Tshwane Metropolitan Municipality')
        print('   - Ekurhuleni Metropolitan Municipality')
        print('\n✅ Should see:')
        print('   - Emfuleni Sub-Region')
        print('   - Lesedi Sub-Region')
        print('   - Merafong City Sub-Region')
        print('   - Midvaal Sub-Region')
        print('   - Mogale City Sub-Region')
        print('   - Rand West City Sub-Region')
        print('   - (and other Gauteng sub-regions)')

        print('\n' + '=' * 80)

        if len(metro_municipalities) == 0:
            print('✅ TEST PASSED: Metro Municipality fix is working correctly!')
            print('\n💡 The report correctly shows only sub-regions, not metro municipalities.')
            return True
        else:
            print('❌ TEST FAILED: Metro Municipalities still appearing in report')
            print('\n💡 The SQL query needs to be updated to exclude Metropolitan municipalities.')
            print('   Filter: WHERE municipality_type != \'Metropolitan\'')
            return False

    except Exception as error:
        print(f'\n❌ Error during test: {str(error)}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_daily_report_metro_fix()
    sys.exit(0 if success else 1)

