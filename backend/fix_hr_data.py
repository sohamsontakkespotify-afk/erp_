"""
Fix HR Data - Update enum values in attendance and leaves tables
"""
from app import create_app
from models import db
from sqlalchemy import text

def fix_enum_values():
    """Fix enum values in attendance and leaves tables"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 Fixing attendance status values...")
            
            # Fix attendance status
            db.session.execute(text("""
                UPDATE attendance 
                SET status = 'PRESENT' 
                WHERE LOWER(status) = 'present'
            """))
            
            db.session.execute(text("""
                UPDATE attendance 
                SET status = 'ABSENT' 
                WHERE LOWER(status) = 'absent'
            """))
            
            db.session.execute(text("""
                UPDATE attendance 
                SET status = 'LATE' 
                WHERE LOWER(status) = 'late'
            """))
            
            db.session.execute(text("""
                UPDATE attendance 
                SET status = 'HALF_DAY' 
                WHERE LOWER(status) IN ('half_day', 'halfday', 'half day')
            """))
            
            print("✅ Attendance status values fixed")
            
            print("🔄 Fixing leave status values...")
            
            # Fix leave status
            db.session.execute(text("""
                UPDATE leaves 
                SET status = 'PENDING' 
                WHERE LOWER(status) = 'pending'
            """))
            
            db.session.execute(text("""
                UPDATE leaves 
                SET status = 'APPROVED' 
                WHERE LOWER(status) = 'approved'
            """))
            
            db.session.execute(text("""
                UPDATE leaves 
                SET status = 'REJECTED' 
                WHERE LOWER(status) = 'rejected'
            """))
            
            print("✅ Leave status values fixed")
            
            print("🔄 Fixing leave type values...")
            
            # Fix leave types
            db.session.execute(text("""
                UPDATE leaves 
                SET leave_type = 'CASUAL' 
                WHERE LOWER(leave_type) = 'casual'
            """))
            
            db.session.execute(text("""
                UPDATE leaves 
                SET leave_type = 'SICK' 
                WHERE LOWER(leave_type) = 'sick'
            """))
            
            db.session.execute(text("""
                UPDATE leaves 
                SET leave_type = 'EARNED' 
                WHERE LOWER(leave_type) = 'earned'
            """))
            
            db.session.execute(text("""
                UPDATE leaves 
                SET leave_type = 'MATERNITY' 
                WHERE LOWER(leave_type) = 'maternity'
            """))
            
            db.session.execute(text("""
                UPDATE leaves 
                SET leave_type = 'PATERNITY' 
                WHERE LOWER(leave_type) = 'paternity'
            """))
            
            print("✅ Leave type values fixed")
            
            # Commit all changes
            db.session.commit()
            
            print("\n✅ All enum values have been fixed successfully!")
            
            # Show current values
            print("\n📊 Current values in database:")
            
            result = db.session.execute(text("SELECT DISTINCT status FROM attendance"))
            attendance_statuses = [row[0] for row in result]
            print(f"Attendance statuses: {attendance_statuses}")
            
            result = db.session.execute(text("SELECT DISTINCT status FROM leaves"))
            leave_statuses = [row[0] for row in result]
            print(f"Leave statuses: {leave_statuses}")
            
            result = db.session.execute(text("SELECT DISTINCT leave_type FROM leaves"))
            leave_types = [row[0] for row in result]
            print(f"Leave types: {leave_types}")
            
        except Exception as e:
            print(f"❌ Error fixing enum values: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    fix_enum_values()