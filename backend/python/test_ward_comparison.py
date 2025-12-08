"""
Test ward comparison logic
"""
import pandas as pd

# Simulate the data
excel_ward = 41804011  # Integer from Excel
iec_ward = 41804011.0  # Float from IEC API

print("="*80)
print("WARD COMPARISON TEST")
print("="*80)

print(f"\nExcel Ward: {excel_ward} (type: {type(excel_ward)})")
print(f"IEC Ward: {iec_ward} (type: {type(iec_ward)})")

# Test original comparison
print(f"\nOriginal comparison (str(ward) == str(expected_ward)):")
print(f"  str({iec_ward}) == str({excel_ward})")
print(f"  '{str(iec_ward)}' == '{str(excel_ward)}'")
print(f"  Result: {str(iec_ward) == str(excel_ward)}")

# Test fixed comparison
print(f"\nFixed comparison (convert to int first):")
try:
    excel_ward_str = str(int(float(excel_ward)))
    iec_ward_str = str(int(float(iec_ward)))
    print(f"  Excel: {excel_ward} -> {excel_ward_str}")
    print(f"  IEC: {iec_ward} -> {iec_ward_str}")
    print(f"  '{iec_ward_str}' == '{excel_ward_str}'")
    print(f"  Result: {iec_ward_str == excel_ward_str}")
except Exception as e:
    print(f"  Error: {e}")

# Test with pandas
print(f"\nTest with pandas DataFrame:")
df = pd.DataFrame({
    'Ward': [41804011, 41804011, 41804011],
    'iec_ward': [41804011.0, 41804011.0, 41804011.0]
})

print(df)

# Direct comparison
print(f"\nDirect comparison (df['Ward'] == df['iec_ward']):")
print(df['Ward'] == df['iec_ward'])

# String comparison
print(f"\nString comparison (df['Ward'].astype(str) == df['iec_ward'].astype(str)):")
print(df['Ward'].astype(str) == df['iec_ward'].astype(str))

# Int comparison
print(f"\nInt comparison (df['Ward'].astype(int) == df['iec_ward'].astype(int)):")
print(df['Ward'].astype(int) == df['iec_ward'].astype(int))

