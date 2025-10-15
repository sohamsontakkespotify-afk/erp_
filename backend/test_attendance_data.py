"""Test script to check attendance data in the database"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from models.hr import Attendance, Employee
from datetime import date

app = create_app()

def test_attendance_data():
    with app.app_context():
        # Get all attendance records
        attendance_records = Attendance.query.all()
        print(f"\n=== Total Attendance Records: {len(attendance_records)} ===\n")
        
        # Get today's attendance
        today = date.today()
        today_records = Attendance.query.filter_by(date=today).all()
        print(f"=== Today's Attendance Records ({today}): {len(today_records)} ===\n")
        
        if today_records:
            print("Today's Records:")
            for record in today_records:
                employee = Employee.query.get(record.employee_id)
                print(f"  - {employee.full_name if employee else 'Unknown'}: {record.status.value if hasattr(record.status, 'value') else record.status} (Check-in: {record.check_in_time}, Check-out: {record.check_out_time})")
        else:
            print("No attendance records for today.")
        
        # Show last 10 records
        print(f"\n=== Last 10 Attendance Records ===\n")
        recent_records = Attendance.query.order_by(Attendance.date.desc(), Attendance.created_at.desc()).limit(10).all()
        for record in recent_records:
            employee = Employee.query.get(record.employee_id)
            print(f"  - {record.date} | {employee.full_name if employee else 'Unknown'}: {record.status.value if hasattr(record.status, 'value') else record.status} (Check-in: {record.check_in_time}, Check-out: {record.check_out_time})")
        
        # Get all employees
        employees = Employee.query.all()
        print(f"\n=== Total Employees: {len(employees)} ===\n")
        
        # Check gate entry logs
        from models.gate_entry import GateEntryLog
        gate_logs = GateEntryLog.query.all()
        print(f"=== Total Gate Entry Logs: {len(gate_logs)} ===\n")
        
        today_gate_logs = GateEntryLog.query.filter_by(date=today).all()
        print(f"=== Today's Gate Entry Logs ({today}): {len(today_gate_logs)} ===\n")
        
        if today_gate_logs:
            print("Today's Gate Logs:")
            for log in today_gate_logs:
                print(f"  - {log.name} ({log.phone_number}): {log.entry_type} at {log.time}")

if __name__ == '__main__':
    test_attendance_data()