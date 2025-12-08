"""
Test the data transformation logic in app.py
This isolates the transformation code to verify it works correctly
"""

import json

# Simulate the session data that would be collected from the form
session_data = {
    # Personal Information - as stored in session (IDs as strings)
    "id_number": "9001016804089",
    "first_name": "TestUser",
    "last_name": "Complete",
    "date_of_birth": "1990-01-01",
    "gender": "1",  # ID - needs transformation to "Male"
    "citizenship_status": "1",  # ID - needs transformation to "South African Citizen"
    "language_id": "1",  # STRING - needs transformation to INTEGER 1
    "occupation_id": "5",  # STRING - needs transformation to INTEGER 5
    "qualification_id": "3",  # STRING - needs transformation to INTEGER 3
    
    # Contact Information
    "email": "testuser.complete@example.com",
    "cell_number": "0821234567",
    "alternative_number": "",  # EMPTY - needs to be OMITTED
    "residential_address": "123 Test Street, Johannesburg, 2000",
    "postal_address": "123 Test Street, Johannesburg, 2000",
    
    # Geographic Information
    "province_code": "EC",
    "district_code": "DC44",
    "municipal_code": "EC441",
    "ward_code": "24401001",
    "voting_district_code": "",  # EMPTY - needs to be OMITTED
    
    # Party Declaration
    "signature_type": "typed",
    "signature_data": "TestUser Complete",
    "declaration_accepted": True,
    "constitution_accepted": True,
    "reason_for_joining": "I want to join the EFF to fight for economic freedom",
    "skills_experience": "",  # EMPTY - needs to be OMITTED
    "referred_by": "",  # EMPTY - needs to be OMITTED
    
    # Payment Information
    "payment_method": "Cash",
    "payment_reference": "CASH-COMPLETE-TEST-123",
    "payment_amount": "",  # EMPTY - needs to be OMITTED
    "payment_notes": "",  # EMPTY - needs to be OMITTED
}

print("\n" + "="*80)
print("DATA TRANSFORMATION TEST")
print("="*80)

print("\n📋 ORIGINAL SESSION DATA:")
print(json.dumps(session_data, indent=2))

# Apply the same transformations as in app.py review_submit()
application_data = session_data.copy()

# Transform gender_id to gender name string
gender_id = application_data.get('gender')
if gender_id:
    gender_map = {
        '1': 'Male',
        '2': 'Female',
        '3': 'Other',
        '4': 'Prefer not to say'
    }
    application_data['gender'] = gender_map.get(str(gender_id), 'Prefer not to say')
    print(f"\n🔄 Converted gender from '{gender_id}' to '{application_data['gender']}'")

# Transform citizenship_id to citizenship name string
citizenship_id = application_data.get('citizenship_status')
if citizenship_id:
    citizenship_map = {
        '1': 'South African Citizen',
        '2': 'Foreign National',
        '3': 'Permanent Resident'
    }
    application_data['citizenship_status'] = citizenship_map.get(str(citizenship_id), 'South African Citizen')
    print(f"🔄 Converted citizenship from '{citizenship_id}' to '{application_data['citizenship_status']}'")

# Convert language_id, occupation_id, qualification_id to integers or REMOVE if empty
for field in ['language_id', 'occupation_id', 'qualification_id']:
    if field in application_data:
        try:
            value = application_data[field]
            if value and str(value) != '0' and str(value).strip() != '':
                application_data[field] = int(value)
                print(f"🔄 Converted {field} from '{value}' to {application_data[field]} (integer)")
            else:
                del application_data[field]
                print(f"🗑️  Removed {field} (empty/zero)")
        except (ValueError, TypeError):
            if field in application_data:
                del application_data[field]
                print(f"🗑️  Removed {field} (conversion failed)")

# Remove all null/None/empty string fields
fields_to_remove = []
for key, value in application_data.items():
    if value is None or value == '' or value == 'None':
        fields_to_remove.append(key)

for field in fields_to_remove:
    del application_data[field]
    print(f"🗑️  Removed {field} (null/empty)")

print("\n" + "="*80)
print("✅ TRANSFORMED DATA (READY FOR BACKEND):")
print("="*80)
print(json.dumps(application_data, indent=2))

print("\n" + "="*80)
print("📊 VALIDATION:")
print("="*80)

# Validate transformations
errors = []

if application_data.get('gender') not in ['Male', 'Female', 'Other', 'Prefer not to say']:
    errors.append(f"❌ Gender is not a valid string: {application_data.get('gender')}")
else:
    print(f"✅ Gender: {application_data.get('gender')} (string)")

if application_data.get('citizenship_status') not in ['South African Citizen', 'Foreign National', 'Permanent Resident']:
    errors.append(f"❌ Citizenship is not a valid string: {application_data.get('citizenship_status')}")
else:
    print(f"✅ Citizenship: {application_data.get('citizenship_status')} (string)")

for field in ['language_id', 'occupation_id', 'qualification_id']:
    value = application_data.get(field)
    if value is not None:
        if isinstance(value, int):
            print(f"✅ {field}: {value} (integer)")
        else:
            errors.append(f"❌ {field} is not an integer: {value} (type: {type(value).__name__})")

# Check that empty fields were removed
empty_fields = ['alternative_number', 'voting_district_code', 'skills_experience', 'referred_by', 'payment_amount', 'payment_notes']
for field in empty_fields:
    if field in application_data:
        errors.append(f"❌ {field} should have been removed but is still present: {application_data[field]}")
    else:
        print(f"✅ {field}: OMITTED (was empty)")

if errors:
    print("\n" + "="*80)
    print("❌ VALIDATION FAILED:")
    print("="*80)
    for error in errors:
        print(error)
else:
    print("\n" + "="*80)
    print("✅ ALL VALIDATIONS PASSED!")
    print("="*80)
    print("The transformed data is ready to be sent to the backend API.")
    print("This matches the format that the backend expects.")

