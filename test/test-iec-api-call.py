import requests
import json

print('🧪 Testing IEC API Direct Call')
print('=' * 80)

try:
    response = requests.post(
        'http://localhost:5000/api/v1/iec/verify-voter-public',
        json={'idNumber': '7808020703087'},
        timeout=30
    )
    
    print(f'\n📡 Status Code: {response.status_code}')
    
    data = response.json()
    print('\n✅ API Response:')
    print(json.dumps(data, indent=2))
    
    if data.get('success') and data.get('data'):
        iec_data = data['data']
        print('\n📊 IEC Verification Data:')
        print('-' * 80)
        print(f"ID Number: {iec_data.get('id_number')}")
        print(f"Registered: {iec_data.get('is_registered')}")
        print(f"Status: {iec_data.get('voter_status')}")
        print('\n🗺️ Geographic Data:')
        print(f"  Province ID: {iec_data.get('province_id')}")
        print(f"  Province: {iec_data.get('province')}")
        print(f"  Province Code: {iec_data.get('province_code') or '❌ NOT MAPPED'}")
        print(f"  Municipality ID: {iec_data.get('municipality_id')}")
        print(f"  Municipality: {iec_data.get('municipality')}")
        print(f"  Municipality Code: {iec_data.get('municipality_code') or '❌ NOT MAPPED'}")
        print(f"  District Code: {iec_data.get('district_code') or '❌ NOT MAPPED'}")
        print(f"  Ward ID: {iec_data.get('ward_id')}")
        print(f"  Ward Code: {iec_data.get('ward_code') or '❌ NOT MAPPED'}")
        print(f"  VD Number: {iec_data.get('vd_number')}")
        print(f"  Voting District Code: {iec_data.get('voting_district_code') or '❌ NOT MAPPED'}")
        print(f"  Voting Station: {iec_data.get('voting_station_name')}")
        print(f"  Address: {iec_data.get('voting_station_address')}")
        
        print('\n' + '=' * 80)
        print('📊 MAPPING SUMMARY:')
        print('=' * 80)
        print(f"Province:        {'✅ MAPPED' if iec_data.get('province_code') else '❌ NOT MAPPED'}")
        print(f"District:        {'✅ MAPPED' if iec_data.get('district_code') else '❌ NOT MAPPED'}")
        print(f"Municipality:    {'✅ MAPPED' if iec_data.get('municipality_code') else '❌ NOT MAPPED'}")
        print(f"Ward:            {'✅ MAPPED' if iec_data.get('ward_code') else '❌ NOT MAPPED'}")
        print(f"Voting District: {'✅ MAPPED' if iec_data.get('voting_district_code') else '❌ NOT MAPPED'}")
        print('=' * 80)
    
except Exception as error:
    print(f'\n❌ Error: {error}')

