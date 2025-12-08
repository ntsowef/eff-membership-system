#!/usr/bin/env python3
"""
Test IEC Auto-population Feature
Tests that IEC verification returns all necessary internal codes for auto-population
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:5000/api/v1"

def test_iec_verification_with_mapping():
    """
    Test that IEC verification returns mapped internal codes
    """
    print("=" * 80)
    print("TEST: IEC Verification with Geographic Code Mapping")
    print("=" * 80)
    
    # Test with a sample ID number (replace with a real registered voter ID for actual testing)
    test_id_number = "9001015009087"  # Sample ID - replace with real one
    
    print(f"\n1. Testing IEC verification for ID: {test_id_number}")
    print("-" * 80)
    
    try:
        response = requests.post(
            f"{BASE_URL}/iec/verify-voter-public",
            json={"idNumber": test_id_number},
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse Success: {data.get('success')}")
            
            if data.get('success') and data.get('data'):
                iec_data = data['data']
                
                print("\n" + "=" * 80)
                print("IEC VERIFICATION RESPONSE")
                print("=" * 80)
                
                # Basic Info
                print(f"\n📋 Basic Information:")
                print(f"  ID Number: {iec_data.get('id_number')}")
                print(f"  Is Registered: {iec_data.get('is_registered')}")
                print(f"  Voter Status: {iec_data.get('voter_status')}")
                
                # IEC IDs (from IEC API)
                print(f"\n🔢 IEC IDs (from IEC API):")
                print(f"  Province ID: {iec_data.get('province_id')}")
                print(f"  Municipality ID: {iec_data.get('municipality_id')}")
                print(f"  Ward ID: {iec_data.get('ward_id')}")
                print(f"  VD Number: {iec_data.get('vd_number')}")
                
                # Internal Codes (mapped from IEC IDs)
                print(f"\n🗺️  Internal Codes (mapped for auto-population):")
                print(f"  Province Code: {iec_data.get('province_code')}")
                print(f"  District Code: {iec_data.get('district_code')}")
                print(f"  Municipality Code: {iec_data.get('municipality_code')}")
                print(f"  Ward Code: {iec_data.get('ward_code')}")
                print(f"  Voting District Code: {iec_data.get('voting_district_code')}")
                
                # Location Details
                print(f"\n📍 Location Details:")
                print(f"  Province: {iec_data.get('province')}")
                print(f"  Municipality: {iec_data.get('municipality')}")
                print(f"  Voting District: {iec_data.get('voting_district')}")
                print(f"  Voting Station: {iec_data.get('voting_station_name')}")
                print(f"  Address: {iec_data.get('voting_station_address')}")
                
                # Validation
                print("\n" + "=" * 80)
                print("VALIDATION RESULTS")
                print("=" * 80)
                
                required_fields = [
                    'province_code',
                    'municipality_code',
                    'ward_code'
                ]
                
                missing_fields = []
                for field in required_fields:
                    if not iec_data.get(field):
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"\n❌ FAILED: Missing required fields for auto-population:")
                    for field in missing_fields:
                        print(f"   - {field}")
                else:
                    print(f"\n✅ SUCCESS: All required fields present for auto-population")
                    print(f"\n   The following fields can be auto-populated in Step 2:")
                    print(f"   ✓ Province: {iec_data.get('province_code')}")
                    if iec_data.get('district_code'):
                        print(f"   ✓ District: {iec_data.get('district_code')}")
                    else:
                        print(f"   ⚠ District: None (likely a metro municipality)")
                    print(f"   ✓ Municipality: {iec_data.get('municipality_code')}")
                    print(f"   ✓ Ward: {iec_data.get('ward_code')}")
                    if iec_data.get('voting_district_code'):
                        print(f"   ✓ Voting District: {iec_data.get('voting_district_code')}")
                
            else:
                print(f"\n❌ Voter not registered or verification failed")
                print(f"Message: {data.get('message')}")
        else:
            print(f"\n❌ Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print(f"\n❌ Request timed out after 30 seconds")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    print("\n🧪 Testing IEC Auto-population Feature\n")
    print("This test verifies that IEC verification returns all necessary")
    print("internal codes for auto-populating geographic fields in Step 2.\n")
    
    test_iec_verification_with_mapping()
    
    print("\n📝 Note: Replace the test ID number with a real registered voter ID")
    print("   for actual testing. The current ID may not be registered.\n")

