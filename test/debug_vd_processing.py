#!/usr/bin/env python3
"""
Debug script to test the VD number processing logic
"""

import pandas as pd

def process_vd_number(vd_value):
    """Test the VD processing logic"""
    if pd.isna(vd_value):
        return None

    # Convert to string
    vd_str = str(int(vd_value)) if isinstance(vd_value, (int, float)) else str(vd_value).strip()

    # Remove trailing .0 if present
    if vd_str.endswith('.0'):
        vd_str = vd_str[:-2]
    
    # Remove any non-digit characters
    vd_str = ''.join(filter(str.isdigit, vd_str))
    
    if not vd_str:
        return None
    
    print(f"  Processing: {vd_value} -> '{vd_str}' (length: {len(vd_str)})")
    
    # VALIDATION 1: Reject cell phone numbers
    if vd_str.startswith('27') and len(vd_str) == 11:
        print(f"    ❌ REJECTED: Cell phone number")
        return None
    
    # VALIDATION 2: Reject values that exceed PostgreSQL INTEGER limit
    if vd_str.isdigit() and int(vd_str) > 2147483647:
        print(f"    ❌ REJECTED: Exceeds INTEGER limit ({int(vd_str):,})")
        return None
    
    # VALIDATION 3: Reject unreasonably long values
    if len(vd_str) > 10:
        print(f"    ❌ REJECTED: Too long ({len(vd_str)} digits)")
        return None

    print(f"    ✓ ACCEPTED")
    return vd_str[:20] if vd_str else None


# Test with sample values from the Excel file
test_values = [
    22222222,  # Special code
    99999999,  # Special code
    27632383545,  # Cell number (should be rejected)
    2763238354,  # 10 digits (should be accepted)
    276323835,  # 9 digits (should be accepted)
    27632383545678,  # Too long (should be rejected)
    3000000000,  # Exceeds INTEGER limit (should be rejected)
]

print("=" * 80)
print("TESTING VD NUMBER PROCESSING LOGIC")
print("=" * 80)

for val in test_values:
    print(f"\nTest value: {val}")
    result = process_vd_number(val)
    print(f"  Result: {result}")

print("\n" + "=" * 80)

