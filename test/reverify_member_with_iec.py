#!/usr/bin/env python3
"""
Re-verify member 772468 (ID: 7808020703087) with IEC API
"""

import requests
import json

# Backend API endpoint
BASE_URL = "http://localhost:5000/api/v1"
ID_NUMBER = "7808020703087"

def main():
    print("=" * 100)
    print("RE-VERIFY MEMBER WITH IEC API")
    print("=" * 100)
    print(f"\nID Number: {ID_NUMBER}")
    print(f"Member ID: 772468 (Dunga Marshall)")
    
    # Call IEC verification endpoint
    print(f"\n🔍 Calling IEC API: POST {BASE_URL}/iec/verify-voter-public")
    
    try:
        response = requests.post(
            f"{BASE_URL}/iec/verify-voter-public",
            json={"idNumber": ID_NUMBER},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"\n📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ IEC Verification Successful!")
            print(f"\n📋 Full Response:")
            print(json.dumps(data, indent=2))
            
            if data.get('success') and data.get('data'):
                iec_data = data['data']
                
                print(f"\n" + "=" * 100)
                print("IEC VERIFICATION RESULTS")
                print("=" * 100)
                print(f"\n✅ Voter Registration Status:")
                print(f"   Is Registered: {iec_data.get('is_registered')}")
                print(f"   Voter Status: {iec_data.get('voter_status')}")
                
                print(f"\n📍 Geographic Information:")
                print(f"   Province: {iec_data.get('province')} (ID: {iec_data.get('province_id')})")
                print(f"   Province Code: {iec_data.get('province_code')}")
                print(f"   Municipality: {iec_data.get('municipality')} (ID: {iec_data.get('municipality_id')})")
                print(f"   Municipality Code: {iec_data.get('municipality_code')}")
                print(f"   District Code: {iec_data.get('district_code')}")
                print(f"   Ward ID: {iec_data.get('ward_id')}")
                print(f"   Ward Code: {iec_data.get('ward_code')}")
                print(f"   VD Number: {iec_data.get('vd_number')}")
                print(f"   Voting District Code: {iec_data.get('voting_district_code')}")
                
                print(f"\n🏢 Voting Station:")
                print(f"   Name: {iec_data.get('voting_station_name')}")
                print(f"   Address: {iec_data.get('voting_station_address')}")
                print(f"   Town: {iec_data.get('town')}")
                print(f"   Suburb: {iec_data.get('suburb')}")
                print(f"   Street: {iec_data.get('street')}")
                
                # Determine what to set in database
                print(f"\n" + "=" * 100)
                print("DATABASE UPDATE RECOMMENDATIONS")
                print("=" * 100)
                
                is_registered = iec_data.get('is_registered')
                vd_code = iec_data.get('voting_district_code')
                
                if is_registered:
                    voter_status_id = 1  # Registered
                    if vd_code:
                        voting_district_code = vd_code
                        print(f"\n✅ Voter Status: Registered (ID: 1)")
                        print(f"✅ Voting District Code: {voting_district_code} (IEC VD Number)")
                    else:
                        voting_district_code = '222222222'
                        print(f"\n✅ Voter Status: Registered (ID: 1)")
                        print(f"⚠️ Voting District Code: 222222222 (Registered but no VD data)")
                else:
                    voter_status_id = 2  # Not Registered
                    voting_district_code = '999999999'
                    print(f"\n❌ Voter Status: Not Registered (ID: 2)")
                    print(f"⚠️ Voting District Code: 999999999 (Not registered)")
                
                print(f"\n📝 SQL Update Statement:")
                print(f"""
UPDATE members_consolidated
SET 
  voter_status_id = {voter_status_id},
  voting_district_code = '{voting_district_code}',
  municipality_code = 'EKU004'  -- From ward table
WHERE member_id = 772468;
                """)
                
                # Save results to file
                with open('test/IEC_REVERIFICATION_RESULTS.json', 'w') as f:
                    json.dump({
                        'id_number': ID_NUMBER,
                        'member_id': 772468,
                        'iec_data': iec_data,
                        'recommended_updates': {
                            'voter_status_id': voter_status_id,
                            'voting_district_code': voting_district_code,
                            'municipality_code': 'EKU004'
                        }
                    }, f, indent=2)
                
                print(f"\n✅ Results saved to: test/IEC_REVERIFICATION_RESULTS.json")
                
        else:
            print(f"\n❌ IEC Verification Failed!")
            print(f"Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print(f"\n⏱️ Request timed out after 30 seconds")
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Connection error - is the backend server running on port 5000?")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == '__main__':
    main()

