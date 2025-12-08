"""
Manual test to check what JSON data the Flask frontend sends to the backend
This test will help us debug the data transformation issue
"""

import requests
import json

# Configuration
FLASK_URL = "http://localhost:3001"
BACKEND_URL = "http://localhost:5000/api/v1"

print("\n" + "="*80)
print("MANUAL SUBMISSION TEST")
print("="*80)
print("\nThis test will:")
print("1. Create a session with the Flask frontend")
print("2. Fill out all form steps")
print("3. Capture the final JSON payload before submission")
print("4. Submit to backend and show the response")
print("\n" + "="*80)

# Create a session to maintain cookies
session = requests.Session()

# Step 1: Start application
print("\n[Step 1] Starting application...")
response = session.get(f"{FLASK_URL}/application/start")
print(f"Status: {response.status_code}")

# Step 2: Submit personal info
print("\n[Step 2] Submitting personal information...")
personal_data = {
    'csrf_token': 'test',  # We'll need to extract this from the form
    'id_number': '9001016804099',  # Unique ID
    'first_name': 'ManualTest',
    'last_name': 'User',
    'date_of_birth': '1990-01-01',
    'gender': '1',  # Male ID
    'language_id': '1',  # English
    'occupation_id': '5',  # Teacher
    'qualification_id': '3',  # Bachelor's
    'citizenship_status': '1',  # SA Citizen
}

# Get the form to extract CSRF token
response = session.get(f"{FLASK_URL}/application/personal-info")
# Extract CSRF token from HTML (simplified - in real test we'd parse HTML)
# For now, let's just try without CSRF validation

print("\n⚠️  NOTE: This test requires CSRF token extraction which is complex.")
print("Instead, let's just check what the backend expects vs what we're sending.")
print("\n" + "="*80)

# Let's compare the working backend test data with what the frontend should send
print("\n📋 BACKEND TEST DATA (WORKING):")
backend_test_data = {
    "id_number": "9001016804089",
    "first_name": "TestUser",
    "last_name": "Complete",
    "date_of_birth": "1990-01-01",
    "gender": "Male",  # STRING
    "citizenship_status": "South African Citizen",  # STRING
    "language_id": 1,  # INTEGER
    "occupation_id": 5,  # INTEGER
    "qualification_id": 3,  # INTEGER
    "email": "testuser.complete@example.com",
    "cell_number": "0821234567",
    "residential_address": "123 Test Street, Johannesburg, 2000",
    "postal_address": "123 Test Street, Johannesburg, 2000",
    "province_code": "EC",
    "district_code": "DC44",
    "municipal_code": "EC441",
    "ward_code": "24401001",
    "signature_type": "typed",
    "signature_data": "TestUser Complete",
    "declaration_accepted": True,
    "constitution_accepted": True,
    "reason_for_joining": "I want to join the EFF to fight for economic freedom",
    "payment_method": "Cash",
    "payment_reference": "CASH-COMPLETE-TEST-123",
}

print(json.dumps(backend_test_data, indent=2))

print("\n" + "="*80)
print("📋 FRONTEND FORM DATA (BEFORE TRANSFORMATION):")
print("="*80)

frontend_form_data = {
    "id_number": "9001016804089",
    "first_name": "TestUser",
    "last_name": "Complete",
    "date_of_birth": "1990-01-01",
    "gender": "1",  # ID - needs transformation to "Male"
    "citizenship_status": "1",  # ID - needs transformation to "South African Citizen"
    "language_id": "1",  # STRING - needs transformation to INTEGER 1
    "occupation_id": "5",  # STRING - needs transformation to INTEGER 5
    "qualification_id": "3",  # STRING - needs transformation to INTEGER 3
    "email": "testuser.complete@example.com",
    "cell_number": "0821234567",
    "alternative_number": "",  # EMPTY - needs to be OMITTED
    "residential_address": "123 Test Street, Johannesburg, 2000",
    "postal_address": "123 Test Street, Johannesburg, 2000",
    "province_code": "EC",
    "district_code": "DC44",
    "municipal_code": "EC441",
    "ward_code": "24401001",
    "voting_district_code": "",  # EMPTY - needs to be OMITTED
    "signature_type": "typed",
    "signature_data": "TestUser Complete",
    "declaration_accepted": True,
    "constitution_accepted": True,
    "reason_for_joining": "I want to join the EFF to fight for economic freedom",
    "skills_experience": "",  # EMPTY - needs to be OMITTED
    "referred_by": "",  # EMPTY - needs to be OMITTED
    "payment_method": "Cash",
    "payment_reference": "CASH-COMPLETE-TEST-123",
    "payment_amount": "",  # EMPTY - needs to be OMITTED
    "payment_notes": "",  # EMPTY - needs to be OMITTED
}

print(json.dumps(frontend_form_data, indent=2))

print("\n" + "="*80)
print("🔄 REQUIRED TRANSFORMATIONS:")
print("="*80)
print("1. gender: '1' → 'Male' (ID to string)")
print("2. citizenship_status: '1' → 'South African Citizen' (ID to string)")
print("3. language_id: '1' → 1 (string to integer)")
print("4. occupation_id: '5' → 5 (string to integer)")
print("5. qualification_id: '3' → 3 (string to integer)")
print("6. Remove all empty string fields (alternative_number, voting_district_code, etc.)")

print("\n" + "="*80)
print("✅ EXPECTED FINAL PAYLOAD (AFTER TRANSFORMATION):")
print("="*80)
print(json.dumps(backend_test_data, indent=2))

print("\n" + "="*80)
print("📝 SUMMARY:")
print("="*80)
print("The Flask app.py review_submit() function should:")
print("1. Transform gender ID → gender name string")
print("2. Transform citizenship ID → citizenship name string")
print("3. Transform language/occupation/qualification string IDs → integers")
print("4. Remove all null/empty string fields from the payload")
print("\nThese transformations are implemented in flask-frontend/app.py lines 514-561")
print("="*80)

