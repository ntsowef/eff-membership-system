"""
Test script to manually submit application data to backend API
This helps debug data transformation issues
"""

import requests
import json

# Backend API URL
BACKEND_API_URL = "http://localhost:5000/api/v1"

# Sample application data matching what the frontend would send
application_data = {
    # Personal Information
    "id_number": "9001016804089",
    "first_name": "TestUser",
    "last_name": "Complete",
    "date_of_birth": "1990-01-01",
    "gender": "Male",  # Transformed from ID to string
    "citizenship_status": "South African Citizen",  # Transformed from ID to string
    "language_id": 1,  # Integer
    "occupation_id": 5,  # Integer
    "qualification_id": 3,  # Integer
    
    # Contact Information
    "email": "testuser.complete@example.com",
    "cell_number": "0821234567",
    # "alternative_number": None,  # OMIT instead of sending null
    "residential_address": "123 Test Street, Johannesburg, 2000",
    "postal_address": "123 Test Street, Johannesburg, 2000",

    # Geographic Information
    "province_code": "EC",
    "district_code": "DC44",
    "municipal_code": "EC441",
    "ward_code": "24401001",
    # "voting_district_code": None,  # OMIT instead of sending null

    # Party Declaration
    "signature_type": "typed",
    "signature_data": "TestUser Complete",
    "declaration_accepted": True,
    "constitution_accepted": True,
    "reason_for_joining": "I want to join the EFF to fight for economic freedom",
    # "skills_experience": None,  # OMIT instead of sending null
    # "referred_by": None,  # OMIT instead of sending null

    # Payment Information
    "payment_method": "Cash",
    "payment_reference": "CASH-COMPLETE-TEST-123",
    # "payment_amount": None,  # OMIT instead of sending null
    # "payment_notes": None,  # OMIT instead of sending null
}

print("\n" + "="*80)
print("TESTING BACKEND API SUBMISSION")
print("="*80)
print(f"Backend URL: {BACKEND_API_URL}/membership-applications")
print(f"\nApplication Data:")
print(json.dumps(application_data, indent=2))
print("="*80 + "\n")

try:
    # Submit to backend
    response = requests.post(
        f"{BACKEND_API_URL}/membership-applications",
        json=application_data,
        headers={
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        timeout=30
    )
    
    print(f"Response Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"\nResponse Body:")
    
    try:
        response_data = response.json()
        print(json.dumps(response_data, indent=2))
        
        if response.status_code == 201 or response.status_code == 200:
            print("\n" + "="*80)
            print("✅ SUCCESS! Application created successfully")
            print("="*80)
            if response_data.get('data', {}).get('application'):
                app = response_data['data']['application']
                print(f"Application ID: {app.get('id')}")
                print(f"Application Number: {app.get('application_number')}")
        else:
            print("\n" + "="*80)
            print("❌ ERROR! Backend returned an error")
            print("="*80)
            print(f"Error Message: {response_data.get('message', 'Unknown error')}")
            if 'errors' in response_data:
                print(f"Validation Errors:")
                for error in response_data['errors']:
                    print(f"  - {error}")
    except Exception as e:
        print(f"Could not parse JSON response: {e}")
        print(f"Raw response: {response.text}")
        
except requests.exceptions.RequestException as e:
    print(f"\n❌ REQUEST FAILED: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Response Status: {e.response.status_code}")
        print(f"Response Body: {e.response.text}")

