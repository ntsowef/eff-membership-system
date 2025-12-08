"""
Test script to verify the membership status filtering API endpoints
"""
import requests
import json
from datetime import datetime

# API Configuration
BASE_URL = "http://localhost:5000/api/v1"
AUTH_TOKEN = None  # Will need to be set after login

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_result(data, title="Result"):
    """Print formatted JSON result"""
    print(f"\n{title}:")
    print(json.dumps(data, indent=2))

def test_membership_status_breakdown():
    """Test the new membership status breakdown endpoint"""
    print_section("TEST 1: Membership Status Breakdown Endpoint")
    
    try:
        url = f"{BASE_URL}/statistics/membership-status-breakdown"
        print(f"📡 Calling: GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"✅ Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_result(data, "Membership Status Breakdown")
            
            # Verify structure
            if 'data' in data:
                breakdown_data = data['data']
                print("\n📊 Summary Statistics:")
                if 'summary' in breakdown_data:
                    summary = breakdown_data['summary']
                    print(f"  - Total Members: {summary.get('total_members', 0):,}")
                    print(f"  - Good Standing: {summary.get('good_standing_count', 0):,} ({summary.get('good_standing_percentage', 0)}%)")
                    print(f"  - Active: {summary.get('active_count', 0):,} ({summary.get('active_percentage', 0)}%)")
                    print(f"  - Inactive: {summary.get('inactive_count', 0):,} ({summary.get('inactive_percentage', 0)}%)")
                
                print("\n📋 Breakdown by Status:")
                if 'breakdown_by_status' in breakdown_data:
                    for status in breakdown_data['breakdown_by_status']:
                        print(f"  - {status['status_name']}: {status['member_count']:,} ({status['percentage']:.2f}%)")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

def test_dashboard_with_filters():
    """Test the dashboard endpoint with different membership status filters"""
    print_section("TEST 2: Dashboard Endpoint with Membership Filters")
    
    filters = [
        ('all', 'All Members'),
        ('good_standing', 'Good Standing Only'),
        ('active', 'Active Members Only'),
    ]
    
    for filter_value, filter_name in filters:
        print(f"\n🔍 Testing filter: {filter_name} (membership_status={filter_value})")
        
        try:
            url = f"{BASE_URL}/statistics/dashboard"
            params = {}
            if filter_value != 'all':
                params['membership_status'] = filter_value
            
            print(f"📡 Calling: GET {url} with params: {params}")
            
            response = requests.get(url, params=params, timeout=10)
            print(f"✅ Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Extract key metrics
                if 'data' in data and 'system' in data['data']:
                    system = data['data']['system']
                    totals = system.get('totals', {})
                    
                    print(f"  📊 Total Members: {totals.get('members', 0):,}")
                    print(f"  📊 Active Memberships: {totals.get('active_memberships', 0):,}")
                    
                    # Check if filter was applied
                    if 'filters_applied' in data['data']:
                        filters_applied = data['data']['filters_applied']
                        print(f"  ✅ Filter Applied: {filters_applied.get('membership_status', 'none')}")
            else:
                print(f"❌ Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")

def test_api_availability():
    """Test if the API is available"""
    print_section("TEST 0: API Availability Check")
    
    try:
        url = f"{BASE_URL}/statistics/dashboard"
        print(f"📡 Checking: {url}")
        
        response = requests.get(url, timeout=5)
        print(f"✅ API is available! Status Code: {response.status_code}")
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ API is not available. Please start the backend server on port 5000.")
        return False
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def main():
    """Main test execution"""
    print("\n" + "🚀"*40)
    print("  MEMBERSHIP STATUS FILTERING API TESTS")
    print("🚀"*40)
    print(f"\nTest Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check API availability first
    if not test_api_availability():
        print("\n⚠️  Please start the backend server and try again.")
        return
    
    # Run tests
    test_membership_status_breakdown()
    test_dashboard_with_filters()
    
    print_section("TEST SUMMARY")
    print("✅ All tests completed!")
    print("\n💡 Next Steps:")
    print("  1. Open the frontend at http://localhost:3000")
    print("  2. Navigate to the Dashboard")
    print("  3. Test the membership filter toggle buttons")
    print("  4. Verify the analytics cards display correctly")
    print("  5. Check that the filter indicator shows the current selection")

if __name__ == "__main__":
    main()

