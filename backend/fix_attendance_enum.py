"""Fix attendance enum values in the database"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

def fix_attendance_enum():
    with app.app_context():
        try:
            # Check current values in the database
            result = db.session.execute(text("SELECT DISTINCT status FROM attendance"))
            current_values = [row[0] for row in result]
            print(f"Current status values in database: {current_values}")
            
            # Count records
            count_result = db.session.execute(text("SELECT COUNT(*) FROM attendance"))
            total_count = count_result.scalar()
            print(f"Total attendance records: {total_count}")
            
            # Update any lowercase values to uppercase
            updates = [
                ("UPDATE attendance SET status = 'PRESENT' WHERE status = 'present'", "present -> PRESENT"),
                ("UPDATE attendance SET status = 'ABSENT' WHERE status = 'absent'", "absent -> ABSENT"),
                ("UPDATE attendance SET status = 'LATE' WHERE status = 'late'", "late -> LATE"),
                ("UPDATE attendance SET status = 'HALF_DAY' WHERE status = 'half_day'", "half_day -> HALF_DAY"),
            ]
            
            for update_sql, description in updates:
                result = db.session.execute(text(update_sql))
                if result.rowcount > 0:
                    print(f"Updated {result.rowcount} records: {description}")
            
            db.session.commit()
            print("\n✅ Attendance enum values fixed successfully!")
            
            # Verify the fix
            result = db.session.execute(text("SELECT DISTINCT status FROM attendance"))
            new_values = [row[0] for row in result]
            print(f"Updated status values: {new_values}")
            
            # Show sample records
            print("\n=== Sample Attendance Records ===")
            result = db.session.execute(text("""
                SELECT a.id, a.date, a.status, a.check_in_time, a.check_out_time, e.full_name
                FROM attendance a
                LEFT JOIN employees e ON a.employee_id = e.id
                ORDER BY a.date DESC, a.created_at DESC
                LIMIT 10
            """))
            
            for row in result:
                print(f"ID: {row[0]} | Date: {row[1]} | Status: {row[2]} | Check-in: {row[3]} | Check-out: {row[4]} | Employee: {row[5]}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == '__main__':
    fix_attendance_enum()