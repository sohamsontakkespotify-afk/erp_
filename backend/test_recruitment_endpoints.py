"""Test recruitment endpoints"""
import requests

base_url = "http://localhost:5000/api"

endpoints = [
    '/hr/job-postings',
    '/hr/job-applications',
    '/hr/interviews',
    '/hr/candidates'
]

print("Testing recruitment endpoints:\n")

for endpoint in endpoints:
    try:
        response = requests.get(f"{base_url}{endpoint}")
        status = "✓" if response.status_code == 200 else "✗"
        print(f"{status} {endpoint}: {response.status_code}")
        if response.status_code != 200:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"✗ {endpoint}: Error - {e}")