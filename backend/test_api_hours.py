"""
Test the API endpoint for fetching attendance with hours worked
"""
from app import create_app
from models import db
from models.hr import Attendance, Employee
from services.hr_service import HRService
from datetime import datetime
import json

app = create_app()

with app.app_context():
    # Find employee "som singh"
    employee = Employee.query.filter(
        (Employee.first_name.ilike('%som%'))
    ).first()
    
    if employee:
        print(f"\nEmployee: {employee.full_name} (ID: {employee.id})")
        print(f"Salary Type: {employee.salary_type}")
        
        # Test the service method that the API uses
        print("\n" + "=" * 80)
        print("Testing HRService.get_employee_attendance()")
        print("=" * 80)
        
        # Test with October 2025 dates
        start_date = '2025-10-01'
        end_date = '2025-10-31'
        
        print(f"\nFetching attendance from {start_date} to {end_date}")
        
        attendance_records = HRService.get_employee_attendance(
            employee.id, 
            start_date, 
            end_date
        )
        
        print(f"\nReturned {len(attendance_records)} records")
        print("-" * 80)
        
        total_hours = 0
        for record in attendance_records:
            print(f"\nRecord:")
            print(f"  Date: {record.get('date')}")
            print(f"  Check-in: {record.get('checkInTime')}")
            print(f"  Check-out: {record.get('checkOutTime')}")
            print(f"  Hours Worked: {record.get('hoursWorked')}")
            print(f"  Status: {record.get('status')}")
            
            if record.get('hoursWorked'):
                total_hours += record.get('hoursWorked')
        
        print(f"\n{'=' * 80}")
        print(f"Total Hours: {total_hours}")
        print(f"Expected: 5.94")
        print(f"Match: {'✅ YES' if abs(total_hours - 5.94) < 0.01 else '❌ NO'}")
        
        # Also test JSON serialization
        print(f"\n{'=' * 80}")
        print("JSON Serialization Test:")
        print(f"{'=' * 80}")
        json_str = json.dumps(attendance_records, indent=2)
        print(json_str)
    else:
        print("Employee not found")