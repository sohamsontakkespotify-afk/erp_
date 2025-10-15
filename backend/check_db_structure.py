"""Check database structure and fix enum"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

def check_and_fix():
    with app.app_context():
        try:
            # Check the table structure
            print("=== Checking attendance table structure ===")
            result = db.session.execute(text("SHOW CREATE TABLE attendance"))
            for row in result:
                print(row[1])
            
            print("\n=== Current attendance records ===")
            result = db.session.execute(text("SELECT id, date, status, check_in_time, check_out_time FROM attendance ORDER BY date DESC LIMIT 10"))
            for row in result:
                print(f"ID: {row[0]} | Date: {row[1]} | Status: '{row[2]}' | Check-in: {row[3]} | Check-out: {row[4]}")
            
            # Try to alter the enum to include lowercase values temporarily
            print("\n=== Attempting to modify enum to accept both cases ===")
            try:
                db.session.execute(text("""
                    ALTER TABLE attendance 
                    MODIFY COLUMN status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'present', 'absent', 'late', 'half_day') 
                    DEFAULT 'PRESENT'
                """))
                db.session.commit()
                print("✅ Enum modified to accept both cases")
                
                # Now update all lowercase to uppercase
                print("\n=== Updating lowercase values to uppercase ===")
                updates = [
                    "UPDATE attendance SET status = 'PRESENT' WHERE status = 'present'",
                    "UPDATE attendance SET status = 'ABSENT' WHERE status = 'absent'",
                    "UPDATE attendance SET status = 'LATE' WHERE status = 'late'",
                    "UPDATE attendance SET status = 'HALF_DAY' WHERE status = 'half_day'",
                ]
                
                for update_sql in updates:
                    result = db.session.execute(text(update_sql))
                    if result.rowcount > 0:
                        print(f"Updated {result.rowcount} records")
                
                db.session.commit()
                
                # Remove lowercase values from enum
                print("\n=== Removing lowercase values from enum ===")
                db.session.execute(text("""
                    ALTER TABLE attendance 
                    MODIFY COLUMN status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY') 
                    DEFAULT 'PRESENT'
                """))
                db.session.commit()
                print("✅ Enum cleaned up")
                
            except Exception as e:
                print(f"Error modifying enum: {e}")
                db.session.rollback()
            
            # Verify
            print("\n=== Verification ===")
            result = db.session.execute(text("SELECT id, date, status FROM attendance ORDER BY date DESC LIMIT 5"))
            for row in result:
                print(f"ID: {row[0]} | Date: {row[1]} | Status: '{row[2]}'")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == '__main__':
    check_and_fix()