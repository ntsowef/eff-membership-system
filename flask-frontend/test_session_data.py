"""
Test script to check what data is stored in the Flask session
This helps debug what data is being sent to the backend
"""

import os
import pickle
import json

# Path to Flask session directory
SESSION_DIR = os.path.join(os.path.dirname(__file__), 'flask_session')

print("\n" + "="*80)
print("CHECKING FLASK SESSION DATA")
print("="*80)

if not os.path.exists(SESSION_DIR):
    print(f"❌ Session directory not found: {SESSION_DIR}")
    exit(1)

# List all session files
session_files = [f for f in os.listdir(SESSION_DIR) if not f.startswith('.')]

if not session_files:
    print("❌ No session files found")
    exit(1)

print(f"Found {len(session_files)} session file(s)")

# Read the most recent session file
session_files.sort(key=lambda f: os.path.getmtime(os.path.join(SESSION_DIR, f)), reverse=True)
latest_session = session_files[0]

print(f"\nReading latest session file: {latest_session}")

session_path = os.path.join(SESSION_DIR, latest_session)

try:
    with open(session_path, 'rb') as f:
        session_data = pickle.load(f)
    
    print("\n" + "="*80)
    print("SESSION DATA:")
    print("="*80)
    print(json.dumps(session_data, indent=2, default=str))
    print("="*80)
    
    if 'application_data' in session_data:
        print("\n" + "="*80)
        print("APPLICATION DATA (what would be sent to backend):")
        print("="*80)
        app_data = session_data['application_data']
        print(json.dumps(app_data, indent=2, default=str))
        print("="*80)
        
        # Check for null values
        null_fields = [k for k, v in app_data.items() if v is None or v == '' or v == 'None']
        if null_fields:
            print(f"\n⚠️  WARNING: Found {len(null_fields)} null/empty fields:")
            for field in null_fields:
                print(f"  - {field}: {app_data[field]}")
        else:
            print("\n✅ No null/empty fields found")
            
        # Check required transformations
        print("\n" + "="*80)
        print("DATA VALIDATION:")
        print("="*80)
        
        # Check gender
        gender = app_data.get('gender')
        if gender in ['1', '2', '3', '4', 1, 2, 3, 4]:
            print(f"❌ Gender is still an ID: {gender} (should be string like 'Male')")
        elif gender in ['Male', 'Female', 'Other', 'Prefer not to say']:
            print(f"✅ Gender correctly transformed: {gender}")
        else:
            print(f"⚠️  Gender value unexpected: {gender}")
            
        # Check citizenship
        citizenship = app_data.get('citizenship_status')
        if citizenship in ['1', '2', '3', 1, 2, 3]:
            print(f"❌ Citizenship is still an ID: {citizenship} (should be string)")
        elif citizenship in ['South African Citizen', 'Foreign National', 'Permanent Resident']:
            print(f"✅ Citizenship correctly transformed: {citizenship}")
        else:
            print(f"⚠️  Citizenship value unexpected: {citizenship}")
            
        # Check language_id, occupation_id, qualification_id
        for field in ['language_id', 'occupation_id', 'qualification_id']:
            value = app_data.get(field)
            if value is None:
                print(f"⚠️  {field}: None (should be omitted or integer)")
            elif isinstance(value, int):
                print(f"✅ {field}: {value} (integer)")
            elif isinstance(value, str) and value.isdigit():
                print(f"⚠️  {field}: '{value}' (string, should be integer)")
            else:
                print(f"❌ {field}: {value} (invalid type)")
    else:
        print("\n❌ No application_data found in session")
        
except Exception as e:
    print(f"\n❌ Error reading session file: {e}")
    import traceback
    traceback.print_exc()

