"""
Test script to check hours_worked data in attendance table
"""
from app import create_app
from models import db
from models.hr import Attendance, Employee
from datetime import datetime

app = create_app()

with app.app_context():
    # Find employee "Som Sight"
    employee = Employee.query.filter(
        (Employee.first_name.ilike('%som%')) | 
        (Employee.last_name.ilike('%sight%'))
    ).first()
    
    if employee:
        print(f"\nFound employee: {employee.full_name} (ID: {employee.id})")
        print(f"Salary Type: {employee.salary_type}")
        
        # Get ALL attendance records for this employee
        all_records = Attendance.query.filter(
            Attendance.employee_id == employee.id
        ).order_by(Attendance.date.desc()).all()
        
        print(f"\nTotal Attendance Records: {len(all_records)}")
        print("-" * 80)
        
        total_hours = 0
        for record in all_records:
            print(f"Date: {record.date}")
            print(f"  Check-in: {record.check_in_time}")
            print(f"  Check-out: {record.check_out_time}")
            print(f"  Hours Worked: {record.hours_worked}")
            print(f"  Status: {record.status}")
            print()
            
            if record.hours_worked:
                total_hours += record.hours_worked
        
        print(f"Total Hours: {total_hours}")
        
        # Test the to_dict() method
        print("\n" + "=" * 80)
        print("Testing to_dict() method:")
        print("=" * 80)
        for record in all_records:
            dict_data = record.to_dict()
            print(f"Date: {dict_data['date']}, hoursWorked: {dict_data['hoursWorked']}")
    else:
        print("Employee 'Som Sight' not found")
        
        # List all employees
        print("\nAll employees:")
        all_employees = Employee.query.all()
        for emp in all_employees:
            print(f"  - {emp.full_name} (ID: {emp.id}, Salary Type: {emp.salary_type})")