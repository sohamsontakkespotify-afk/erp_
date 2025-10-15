#!/usr/bin/env python3
"""
Test script to check HR employees endpoint
"""

import requests

def test_hr_endpoint():
    """Test the HR employees endpoint"""
    try:
        response = requests.get('http://localhost:5000/api/hr/employees')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success!")
            print(response.json())
        else:
            print("Error!")
            print(response.text)
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_hr_endpoint()
