"""
Test ID validation to check if the Luhn algorithm is working correctly
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'python'))

from upload_validation_utils import validate_sa_id_number

def calculate_luhn_checksum(id_without_check):
    """Calculate the correct Luhn checksum digit for a 12-digit ID"""
    digits = [int(d) for d in id_without_check]
    checksum = 0
    
    # Process odd positions (from left, 0-indexed)
    for i in range(0, 12, 2):
        checksum += digits[i]
    
    # Process even positions (from left, 0-indexed) - double and subtract 9 if > 9
    for i in range(1, 12, 2):
        doubled = digits[i] * 2
        checksum += doubled if doubled < 10 else doubled - 9
    
    # Calculate check digit
    check_digit = (10 - (checksum % 10)) % 10
    return check_digit

def test_id_validation():
    """Test various ID numbers"""
    
    print("=" * 80)
    print("TEST: South African ID Number Validation")
    print("=" * 80)
    
    # Test IDs
    test_ids = [
        ('9202204720082', 'Valid ID from online examples'),
        ('8801235111088', 'Valid ID from online examples'),
        ('7106245929086', 'Valid ID from online examples'),
        ('1234567890123', 'Invalid checksum'),
        ('INVALID', 'Not a number'),
        ('920220472008', 'Too short (12 digits)'),
        ('92022047200822', 'Too long (14 digits)'),
    ]
    
    for id_num, description in test_ids:
        is_valid, error_msg = validate_sa_id_number(id_num)
        status = "✅ VALID" if is_valid else f"❌ INVALID: {error_msg}"
        print(f"\n{id_num:15} - {description}")
        print(f"   {status}")
        
        # If it's a 13-digit number, calculate what the checksum should be
        if id_num.isdigit() and len(id_num) == 13:
            correct_check = calculate_luhn_checksum(id_num[:12])
            actual_check = int(id_num[12])
            print(f"   Checksum: Expected={correct_check}, Actual={actual_check}, Match={correct_check == actual_check}")
    
    print("\n" + "=" * 80)
    print("Generating a valid ID number...")
    print("=" * 80)
    
    # Generate a valid ID: 1990-01-15, Male, SA Citizen
    id_base = '900115'  # YYMMDD
    id_base += '5'  # Gender (5-9 = Male)
    id_base += '000'  # Sequence
    id_base += '0'  # Citizenship (0 = SA Citizen)
    id_base += '8'  # Race (usually 8)
    
    check_digit = calculate_luhn_checksum(id_base)
    valid_id = id_base + str(check_digit)
    
    print(f"\nGenerated ID: {valid_id}")
    is_valid, error_msg = validate_sa_id_number(valid_id)
    print(f"Validation: {'✅ VALID' if is_valid else f'❌ INVALID: {error_msg}'}")

if __name__ == '__main__':
    test_id_validation()

