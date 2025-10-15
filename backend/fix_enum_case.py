"""Fix enum case mismatch between database and Python model"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import db
from sqlalchemy import text

app = create_app()

def fix_enum_case():
    with app.app_context():
        try:
            print("=== Fixing attendance status enum case ===\n")
            
            # Step 1: Change column to VARCHAR temporarily
            print("Step 1: Converting status column to VARCHAR...")
            db.session.execute(text("""
                ALTER TABLE attendance 
                MODIFY COLUMN status VARCHAR(20) DEFAULT 'present'
            """))
            db.session.commit()
            print("✅ Converted to VARCHAR\n")
            
            # Step 2: Update all values to uppercase
            print("Step 2: Updating values to uppercase...")
            updates = {
                'present': 'PRESENT',
                'absent': 'ABSENT',
                'late': 'LATE',
                'half_day': 'HALF_DAY'
            }
            
            for old_val, new_val in updates.items():
                result = db.session.execute(text(f"UPDATE attendance SET status = '{new_val}' WHERE status = '{old_val}'"))
                if result.rowcount > 0:
                    print(f"  Updated {result.rowcount} records: {old_val} -> {new_val}")
            
            db.session.commit()
            print("✅ All values updated to uppercase\n")
            
            # Step 3: Convert back to ENUM with uppercase values
            print("Step 3: Converting back to ENUM with uppercase values...")
            db.session.execute(text("""
                ALTER TABLE attendance 
                MODIFY COLUMN status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY') 
                DEFAULT 'PRESENT'
            """))
            db.session.commit()
            print("✅ Converted back to ENUM with uppercase values\n")
            
            # Verify
            print("=== Verification ===")
            result = db.session.execute(text("SHOW CREATE TABLE attendance"))
            for row in result:
                # Extract just the status line
                create_table = row[1]
                for line in create_table.split('\n'):
                    if 'status' in line.lower():
                        print(f"Status column: {line.strip()}")
            
            print("\n=== Sample Records ===")
            result = db.session.execute(text("SELECT id, date, status FROM attendance ORDER BY date DESC LIMIT 5"))
            for row in result:
                print(f"ID: {row[0]} | Date: {row[1]} | Status: '{row[2]}'")
            
            print("\n✅ Enum case fixed successfully!")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            db.session.rollback()

if __name__ == '__main__':
    fix_enum_case()