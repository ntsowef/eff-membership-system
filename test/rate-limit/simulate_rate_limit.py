"""
Simulate IEC API Rate Limit Scenarios
This script helps test rate limit handling by simulating various scenarios
"""
import requests
import time
import redis
from datetime import datetime
from typing import Dict

# Configuration
BACKEND_URL = "http://localhost:5000"
REDIS_HOST = "localhost"
REDIS_PORT = 6379

class RateLimitSimulator:
    """Simulate rate limit scenarios for testing"""
    
    def __init__(self):
        self.backend_url = BACKEND_URL
        self.redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        
    def get_current_hour_key(self) -> str:
        """Get current hour key for Redis"""
        now = datetime.now()
        return f"iec_api:rate_limit:{now.strftime('%Y-%m-%d:%H')}"
    
    def get_status(self) -> Dict:
        """Get current rate limit status"""
        try:
            response = requests.get(f"{self.backend_url}/api/v1/iec/rate-limit/status")
            if response.status_code == 200:
                return response.json()['data']
            else:
                print(f"❌ Failed to get status: {response.status_code}")
                return {}
        except Exception as e:
            print(f"❌ Error getting status: {e}")
            return {}
    
    def increment_counter(self) -> Dict:
        """Increment rate limit counter"""
        try:
            response = requests.post(f"{self.backend_url}/api/v1/iec/rate-limit/increment")
            if response.status_code == 200:
                return response.json()['data']
            elif response.status_code == 429:
                return response.json()
            else:
                print(f"❌ Failed to increment: {response.status_code}")
                return {}
        except Exception as e:
            print(f"❌ Error incrementing: {e}")
            return {}
    
    def set_counter(self, count: int):
        """Manually set Redis counter to specific value"""
        key = self.get_current_hour_key()
        self.redis_client.set(key, count)
        self.redis_client.expire(key, 3600)  # 1 hour TTL
        print(f"✅ Set counter to {count} (key: {key})")
    
    def reset_counter(self):
        """Reset rate limit counter"""
        key = self.get_current_hour_key()
        self.redis_client.delete(key)
        print(f"✅ Reset counter (deleted key: {key})")
    
    def print_status(self):
        """Print current rate limit status"""
        status = self.get_status()
        if status:
            print("\n" + "="*60)
            print("📊 CURRENT RATE LIMIT STATUS")
            print("="*60)
            print(f"Current Count:    {status.get('current_count', 0)}")
            print(f"Max Limit:        {status.get('max_limit', 10000)}")
            print(f"Remaining:        {status.get('remaining', 0)}")
            print(f"Percentage Used:  {status.get('percentage_used', 0):.1f}%")
            print(f"Is Limited:       {status.get('is_limited', False)}")
            print(f"Is Warning:       {status.get('is_warning', False)}")
            
            if status.get('reset_time'):
                reset_dt = datetime.fromtimestamp(status['reset_time'] / 1000)
                print(f"Resets At:        {reset_dt.strftime('%Y-%m-%d %H:%M:%S')}")
            print("="*60 + "\n")
    
    def test_scenario_1_normal(self):
        """Test Scenario 1: Normal operation"""
        print("\n🧪 TEST SCENARIO 1: Normal Operation")
        print("-" * 60)
        
        self.reset_counter()
        self.print_status()
        
        print("Incrementing counter 5 times...")
        for i in range(5):
            result = self.increment_counter()
            print(f"  Request {i+1}: Count = {result.get('current_count', 0)}")
            time.sleep(0.1)
        
        self.print_status()
    
    def test_scenario_2_warning(self):
        """Test Scenario 2: Warning threshold (9,000 requests)"""
        print("\n🧪 TEST SCENARIO 2: Warning Threshold (9,000 requests)")
        print("-" * 60)
        
        self.set_counter(8999)
        self.print_status()
        
        print("Incrementing counter (should trigger warning)...")
        result = self.increment_counter()
        print(f"  Result: {result}")
        
        self.print_status()
    
    def test_scenario_3_exceeded(self):
        """Test Scenario 3: Rate limit exceeded (10,000 requests)"""
        print("\n🧪 TEST SCENARIO 3: Rate Limit Exceeded (10,000 requests)")
        print("-" * 60)
        
        self.set_counter(9999)
        self.print_status()
        
        print("Incrementing counter (should exceed limit)...")
        result = self.increment_counter()
        
        if 'error' in result:
            print(f"  ❌ Rate Limit Exceeded!")
            print(f"  Error Code: {result['error']['code']}")
            print(f"  Message: {result['error']['message']}")
        
        self.print_status()
    
    def test_scenario_4_bulk_requests(self):
        """Test Scenario 4: Bulk requests"""
        print("\n🧪 TEST SCENARIO 4: Bulk Requests (100 requests)")
        print("-" * 60)
        
        self.reset_counter()
        
        print("Sending 100 requests...")
        for i in range(100):
            self.increment_counter()
            if (i + 1) % 10 == 0:
                print(f"  Sent {i+1} requests...")
        
        self.print_status()


def main():
    """Main test runner"""
    simulator = RateLimitSimulator()
    
    print("\n" + "="*60)
    print("🚀 IEC API RATE LIMIT SIMULATOR")
    print("="*60)
    
    while True:
        print("\nSelect a test scenario:")
        print("1. Normal Operation (5 requests)")
        print("2. Warning Threshold (9,000 requests)")
        print("3. Rate Limit Exceeded (10,000 requests)")
        print("4. Bulk Requests (100 requests)")
        print("5. View Current Status")
        print("6. Reset Counter")
        print("7. Set Custom Counter Value")
        print("0. Exit")
        
        choice = input("\nEnter choice: ").strip()
        
        if choice == '1':
            simulator.test_scenario_1_normal()
        elif choice == '2':
            simulator.test_scenario_2_warning()
        elif choice == '3':
            simulator.test_scenario_3_exceeded()
        elif choice == '4':
            simulator.test_scenario_4_bulk_requests()
        elif choice == '5':
            simulator.print_status()
        elif choice == '6':
            simulator.reset_counter()
            simulator.print_status()
        elif choice == '7':
            try:
                count = int(input("Enter counter value: "))
                simulator.set_counter(count)
                simulator.print_status()
            except ValueError:
                print("❌ Invalid number")
        elif choice == '0':
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice")


if __name__ == "__main__":
    main()

