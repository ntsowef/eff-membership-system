#!/usr/bin/env python3
"""
Test Metro Municipality Ward Loading
Tests that wards can be loaded directly for metro municipalities without district selection
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:5000/api/v1"

# Known metro municipalities
METRO_MUNICIPALITIES = [
    {"code": "CPT", "name": "City of Cape Town", "province": "WC"},
    {"code": "JHB", "name": "City of Johannesburg", "province": "GT"},
    {"code": "ETH", "name": "eThekwini (Durban)", "province": "KZN"},
    {"code": "TSH", "name": "City of Tshwane (Pretoria)", "province": "GT"},
    {"code": "EKU", "name": "Ekurhuleni", "province": "GT"},
    {"code": "NMB", "name": "Nelson Mandela Bay", "province": "EC"},
    {"code": "MAN", "name": "Mangaung", "province": "FS"},
    {"code": "BUF", "name": "Buffalo City", "province": "EC"},
]

def test_metro_municipality_info(metro_code):
    """
    Test that we can get municipality info and detect metro type
    """
    print(f"\n{'=' * 80}")
    print(f"Testing Municipality: {metro_code}")
    print('=' * 80)
    
    try:
        # Get municipality details
        response = requests.get(
            f"{BASE_URL}/geographic/municipalities/{metro_code}",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success') and data.get('data'):
                muni = data['data']
                
                print(f"\n📋 Municipality Details:")
                print(f"  Code: {muni.get('municipality_code')}")
                print(f"  Name: {muni.get('municipality_name')}")
                print(f"  Type: {muni.get('municipality_type')}")
                print(f"  District Code: {muni.get('district_code')}")
                print(f"  Province Code: {muni.get('province_code')}")
                
                is_metro = muni.get('municipality_type') == 'Metropolitan'
                has_no_district = muni.get('district_code') is None
                
                print(f"\n🔍 Metro Detection:")
                print(f"  Is Metropolitan: {is_metro}")
                print(f"  Has No District: {has_no_district}")
                
                if is_metro:
                    print(f"  ✅ Correctly identified as metro")
                else:
                    print(f"  ⚠️  Not identified as metro (type: {muni.get('municipality_type')})")
                
                return is_metro, muni.get('municipality_code')
            else:
                print(f"  ❌ Failed to get municipality data")
                return False, None
        else:
            print(f"  ❌ Request failed: {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False, None

def test_metro_ward_loading(metro_code):
    """
    Test that wards can be loaded for a metro municipality
    """
    print(f"\n📍 Testing Ward Loading:")
    
    try:
        # Get wards for municipality
        response = requests.get(
            f"{BASE_URL}/geographic/wards",
            params={"municipality": metro_code},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get('success') and data.get('data'):
                wards = data['data']
                
                print(f"  ✅ Successfully loaded {len(wards)} wards")
                
                if len(wards) > 0:
                    print(f"\n  Sample wards:")
                    for ward in wards[:3]:  # Show first 3 wards
                        print(f"    - Ward {ward.get('ward_number')}: {ward.get('ward_name')}")
                    
                    if len(wards) > 3:
                        print(f"    ... and {len(wards) - 3} more wards")
                    
                    return True, len(wards)
                else:
                    print(f"  ⚠️  No wards found for this municipality")
                    return False, 0
            else:
                print(f"  ❌ Failed to get ward data")
                return False, 0
        else:
            print(f"  ❌ Request failed: {response.status_code}")
            return False, 0
            
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False, 0

def run_all_tests():
    """
    Run tests for all metro municipalities
    """
    print("\n" + "=" * 80)
    print("METRO MUNICIPALITY WARD LOADING TEST")
    print("=" * 80)
    print("\nTesting that wards can be loaded directly for metro municipalities")
    print("without requiring district selection.\n")
    
    results = []
    
    for metro in METRO_MUNICIPALITIES:
        is_metro, muni_code = test_metro_municipality_info(metro['code'])
        
        if is_metro and muni_code:
            success, ward_count = test_metro_ward_loading(muni_code)
            results.append({
                'code': metro['code'],
                'name': metro['name'],
                'is_metro': is_metro,
                'wards_loaded': success,
                'ward_count': ward_count
            })
        else:
            results.append({
                'code': metro['code'],
                'name': metro['name'],
                'is_metro': is_metro,
                'wards_loaded': False,
                'ward_count': 0
            })
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    print(f"\n{'Municipality':<30} {'Metro?':<10} {'Wards':<10} {'Status'}")
    print("-" * 80)
    
    for result in results:
        status = "✅ PASS" if result['wards_loaded'] else "❌ FAIL"
        metro_status = "Yes" if result['is_metro'] else "No"
        ward_count = result['ward_count'] if result['ward_count'] > 0 else "-"
        
        print(f"{result['name']:<30} {metro_status:<10} {ward_count:<10} {status}")
    
    # Overall result
    passed = sum(1 for r in results if r['wards_loaded'])
    total = len(results)
    
    print("\n" + "=" * 80)
    print(f"OVERALL: {passed}/{total} metros passed ward loading test")
    print("=" * 80)
    
    if passed == total:
        print("\n✅ ALL TESTS PASSED - Metro ward loading works correctly!")
    else:
        print(f"\n⚠️  {total - passed} metros failed - Check configuration")

if __name__ == "__main__":
    run_all_tests()

