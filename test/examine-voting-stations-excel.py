import pandas as pd
import sys

# Read the Excel file
excel_path = r'C:\Development\NewProj\Membership-newV2\reports\VOTING_STATIONS_ELECTIONS.xlsx'

try:
    # Read the Excel file
    df = pd.read_excel(excel_path)
    
    print('📊 Excel File Structure Analysis')
    print('=' * 80)
    print(f'\nFile: {excel_path}')
    print(f'Total Rows: {len(df)}')
    print(f'Total Columns: {len(df.columns)}')
    
    print('\n📋 Column Names and Data Types:')
    print('-' * 80)
    for i, col in enumerate(df.columns, 1):
        dtype = df[col].dtype
        non_null = df[col].notna().sum()
        null_count = df[col].isna().sum()
        print(f'{i:2d}. {col:40s} | Type: {str(dtype):15s} | Non-null: {non_null:6d} | Null: {null_count:6d}')
    
    print('\n📝 Sample Data (First 5 rows):')
    print('-' * 80)
    print(df.head(5).to_string())
    
    print('\n🔍 Unique Values for Key Columns:')
    print('-' * 80)
    
    # Check for columns that might be IEC IDs
    for col in df.columns:
        col_lower = col.lower()
        if any(keyword in col_lower for keyword in ['id', 'code', 'number', 'province', 'municipality', 'ward']):
            unique_count = df[col].nunique()
            print(f'\n{col}: {unique_count} unique values')
            if unique_count <= 20:
                print(f'  Values: {sorted(df[col].dropna().unique())}')
            else:
                print(f'  Sample values: {list(df[col].dropna().unique()[:10])}')
    
    print('\n✅ Analysis complete!')
    
except FileNotFoundError:
    print(f'❌ Error: File not found at {excel_path}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error reading Excel file: {e}')
    sys.exit(1)

