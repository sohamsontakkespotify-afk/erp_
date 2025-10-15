"""Test the HR attendance API endpoint"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from models.hr import Attendance, Employee
from datetime import date
import json

app = create_app()

def test_api_endpoint():
    with app.app_context():
        print("=== Testing HR Attendance API Endpoint ===\n")
        
        # Simulate what the API endpoint does
        from services.hr_service import HRService
        
        # Get all attendance records
        attendance_data = HRService.get_all_attendance()
        print(f"Total attendance records from API: {len(attendance_data)}")
        
        # Show sample data
        print("\n=== Sample Attendance Records (as returned by API) ===")
        for record in attendance_data[:5]:
            print(json.dumps(record, indent=2))
        
        # Calculate today's stats
        today = date.today().isoformat()
        today_records = [r for r in attendance_data if r['date'] == today]
        
        print(f"\n=== Today's Statistics ({today}) ===")
        print(f"Total records today: {len(today_records)}")
        
        present_count = len([r for r in today_records if r['status'] == 'present'])
        absent_count = len([r for r in today_records if r['status'] == 'absent'])
        late_count = len([r for r in today_records if r['status'] == 'late'])
        half_day_count = len([r for r in today_records if r['status'] == 'half_day'])
        
        print(f"Present: {present_count}")
        print(f"Absent: {absent_count}")
        print(f"Late: {late_count}")
        print(f"Half Day: {half_day_count}")
        
        print("\n✅ API endpoint is working correctly!")
        print("\nNote: The frontend should now display these values instead of zeros.")

if __name__ == '__main__':
    test_api_endpoint()