"""Test gate entry to attendance integration"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from models.hr import Employee, Attendance
from services.attendance_integration_service import AttendanceIntegrationService
from datetime import datetime
import json

app = create_app()

def test_integration():
    with app.app_context():
        print("=== Testing Gate Entry to Attendance Integration ===\n")
        
        # Get an employee
        employee = Employee.query.first()
        if not employee:
            print("❌ No employees found in database")
            return
        
        print(f"Testing with employee: {employee.full_name}")
        print(f"Phone: {employee.phone}")
        print(f"Status: {employee.status}\n")
        
        # Count current attendance records
        before_count = Attendance.query.filter_by(employee_id=employee.id).count()
        print(f"Attendance records before: {before_count}\n")
        
        # Simulate gate entry
        service = AttendanceIntegrationService()
        entry_time = datetime.now()
        
        print(f"Simulating gate entry at {entry_time.strftime('%Y-%m-%d %H:%M:%S')}...")
        result = service.mark_attendance_on_entry(employee.phone, entry_time)
        
        print(f"\nResult:")
        print(json.dumps(result, indent=2))
        
        # Count attendance records after
        after_count = Attendance.query.filter_by(employee_id=employee.id).count()
        print(f"\nAttendance records after: {after_count}")
        
        # Get today's attendance
        today = entry_time.date()
        today_attendance = Attendance.query.filter(
            Attendance.employee_id == employee.id,
            Attendance.date == today
        ).first()
        
        if today_attendance:
            print(f"\n=== Today's Attendance Record ===")
            print(f"ID: {today_attendance.id}")
            print(f"Date: {today_attendance.date}")
            print(f"Check-in: {today_attendance.check_in_time}")
            print(f"Check-out: {today_attendance.check_out_time}")
            print(f"Status: {today_attendance.status}")
            print(f"Notes: {today_attendance.notes}")
        
        # Test checkout
        print(f"\n=== Testing Checkout ===")
        exit_time = datetime.now()
        print(f"Simulating gate exit at {exit_time.strftime('%Y-%m-%d %H:%M:%S')}...")
        
        checkout_result = service.mark_checkout_on_exit(employee.phone, exit_time)
        print(f"\nCheckout Result:")
        print(json.dumps(checkout_result, indent=2))
        
        # Get updated attendance
        db.session.refresh(today_attendance)
        print(f"\n=== Updated Attendance Record ===")
        print(f"Check-in: {today_attendance.check_in_time}")
        print(f"Check-out: {today_attendance.check_out_time}")
        print(f"Hours worked: {today_attendance.hours_worked}")
        
        print("\n✅ Integration test completed!")

if __name__ == '__main__':
    test_integration()