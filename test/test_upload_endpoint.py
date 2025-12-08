#!/usr/bin/env python3
"""
Test script to upload FransTest.xlsx to the backend endpoint and verify status columns
"""

import requests
import time
import os
import psycopg2
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:5000"
UPLOAD_ENDPOINT = f"{BACKEND_URL}/api/v1/self-data-management/bulk-upload"
TEST_FILE = "uploads/FransTest.xlsx"

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'eff_admin',
    'password': 'Frames!123',
    'database': 'eff_membership_database'
}

def get_auth_token():
    """Get authentication token (you'll need to implement this based on your auth system)"""
    # For now, we'll try without auth or you can add your login credentials
    login_url = f"{BACKEND_URL}/api/v1/auth/login"
    
    # Try to login (adjust credentials as needed)
    try:
        response = requests.post(login_url, json={
            "email": "admin@eff.local",  # Adjust based on your system
            "password": "admin123"
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get('data', {}).get('token') or data.get('token')
        else:
            print(f"⚠️  Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"⚠️  Could not authenticate: {e}")
        return None

def upload_file(file_path, token=None):
    """Upload file to the endpoint"""
    print("=" * 80)
    print("UPLOADING FILE TO ENDPOINT")
    print("=" * 80)
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return None
    
    print(f"\nFile: {file_path}")
    print(f"Endpoint: {UPLOAD_ENDPOINT}")
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        try:
            response = requests.post(UPLOAD_ENDPOINT, files=files, headers=headers)
            
            print(f"\nResponse Status: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            if response.status_code in [200, 201]:
                data = response.json()
                print("\n✅ File uploaded successfully!")
                return data.get('data', {}).get('file_id')
            else:
                print(f"\n❌ Upload failed with status {response.status_code}")
                return None
                
        except Exception as e:
            print(f"\n❌ Upload error: {e}")
            return None

def check_uploaded_file_status(file_id):
    """Check the status of the uploaded file in the database"""
    print("\n" + "=" * 80)
    print("CHECKING UPLOADED FILE STATUS")
    print("=" * 80)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT file_id, filename, original_filename, status, 
               progress_percentage, rows_processed, rows_total,
               rows_success, rows_failed, error_message
        FROM uploaded_files 
        WHERE file_id = %s
    """, (file_id,))
    
    result = cur.fetchone()
    
    if result:
        print(f"\nFile ID: {result[0]}")
        print(f"Filename: {result[1]}")
        print(f"Original: {result[2]}")
        print(f"Status: {result[3]}")
        print(f"Progress: {result[4]}%")
        print(f"Rows Processed: {result[5]}/{result[6]}")
        print(f"Success: {result[7]}, Failed: {result[8]}")
        if result[9]:
            print(f"Error: {result[9]}")
    else:
        print(f"❌ File ID {file_id} not found")
    
    conn.close()
    return result[3] if result else None

def verify_status_columns():
    """Verify that status columns were captured correctly"""
    print("\n" + "=" * 80)
    print("VERIFYING STATUS COLUMNS IN DATABASE")
    print("=" * 80)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Check voter_status_id for the test records
    print("\n1. VOTER STATUS Verification:")
    print("-" * 60)
    cur.execute("""
        SELECT voter_status_id, vs.status_name, COUNT(*) as cnt
        FROM members_consolidated mc
        LEFT JOIN voter_statuses vs ON mc.voter_status_id = vs.status_id
        WHERE mc.updated_at > NOW() - INTERVAL '5 minutes'
        GROUP BY voter_status_id, vs.status_name
        ORDER BY voter_status_id
    """)
    
    results = cur.fetchall()
    if results:
        print(f"{'voter_status_id':<20} | {'status_name':<30} | {'count':<10}")
        print("-" * 65)
        for row in results:
            status_name = row[1] if row[1] else "NULL"
            print(f"{str(row[0]):<20} | {status_name:<30} | {row[2]:<10}")
    else:
        print("No recent records found")
    
    # Check membership_status_id for the test records
    print("\n2. MEMBERSHIP STATUS Verification:")
    print("-" * 60)
    cur.execute("""
        SELECT membership_status_id, ms.status_name, COUNT(*) as cnt
        FROM members_consolidated mc
        LEFT JOIN membership_statuses ms ON mc.membership_status_id = ms.status_id
        WHERE mc.updated_at > NOW() - INTERVAL '5 minutes'
        GROUP BY membership_status_id, ms.status_name
        ORDER BY membership_status_id
    """)
    
    results = cur.fetchall()
    if results:
        print(f"{'membership_status_id':<20} | {'status_name':<30} | {'count':<10}")
        print("-" * 65)
        for row in results:
            status_name = row[1] if row[1] else "NULL"
            print(f"{str(row[0]):<20} | {status_name:<30} | {row[2]:<10}")
    else:
        print("No recent records found")
    
    conn.close()

if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("ENDPOINT UPLOAD TEST")
    print("=" * 80)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Get auth token
    print("\n[Step 1] Getting authentication token...")
    token = get_auth_token()
    
    # Upload file
    print("\n[Step 2] Uploading file...")
    file_id = upload_file(TEST_FILE, token)
    
    if file_id:
        # Wait for processing
        print("\n[Step 3] Waiting for file processing...")
        for i in range(30):  # Wait up to 30 seconds
            time.sleep(1)
            status = check_uploaded_file_status(file_id)
            if status in ['completed', 'failed']:
                break
            print(f"  Waiting... ({i+1}s)")
        
        # Verify status columns
        print("\n[Step 4] Verifying status columns...")
        verify_status_columns()
    
    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

