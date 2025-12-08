"""
Debug how pandas accesses ward values
"""
import pandas as pd

file_path = r"c:\Development\NewProj\Membership-newV2\reports\Copy of 2nd Matjhabeng Ward 11 Duplicates 14.11.2025(1).xlsx"

df = pd.read_excel(file_path)

print("="*80)
print("WARD ACCESS DEBUG")
print("="*80)

# Get first row
idx = 0
row = df.iloc[idx]

print(f"\nRow {idx}:")
print(f"  Ward column dtype: {df['Ward'].dtype}")
print(f"  Ward value (iloc): {row['Ward']} (type: {type(row['Ward'])})")
print(f"  Ward value (at): {df.at[idx, 'Ward']} (type: {type(df.at[idx, 'Ward'])})")
print(f"  Ward value (loc): {df.loc[idx, 'Ward']} (type: {type(df.loc[idx, 'Ward'])})")

# Test conversion
ward_value = df.at[idx, 'Ward']
print(f"\nConversion tests:")
print(f"  Original: {ward_value}")
print(f"  str(): '{str(ward_value)}'")
print(f"  float(): {float(ward_value)}")
print(f"  int(float()): {int(float(ward_value))}")
print(f"  str(int(float())): '{str(int(float(ward_value)))}'")

# Check if notna
print(f"\n  pd.notna(): {pd.notna(ward_value)}")

# Simulate the IEC verification logic
expected_ward = None
if 'Ward' in df.columns:
    expected_ward = df.at[idx, 'Ward']
    if pd.notna(expected_ward):
        try:
            expected_ward = str(int(float(expected_ward)))
            print(f"\n  Converted expected_ward: '{expected_ward}'")
        except Exception as e:
            print(f"\n  Conversion failed: {e}")
            expected_ward = str(expected_ward).strip()

# Simulate IEC ward (as float)
iec_ward = 41804011.0
ward_str = None
if iec_ward:
    try:
        ward_str = str(int(float(iec_ward)))
        print(f"  Converted ward_str: '{ward_str}'")
    except Exception as e:
        print(f"  Conversion failed: {e}")
        ward_str = str(iec_ward).strip()

# Test comparison
print(f"\nComparison:")
print(f"  expected_ward: '{expected_ward}'")
print(f"  ward_str: '{ward_str}'")
print(f"  Match: {ward_str == expected_ward}")

# Test the condition
is_registered = True
print(f"\nCondition test:")
print(f"  is_registered: {is_registered}")
print(f"  expected_ward: {expected_ward}")
print(f"  ward_str: {ward_str}")
print(f"  ward_str == expected_ward: {ward_str == expected_ward}")
print(f"  Full condition: {is_registered and expected_ward and ward_str and ward_str == expected_ward}")

