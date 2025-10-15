"""
Script to fix enum values in the database from lowercase to uppercase
"""
from app import create_app
from models import db
from sqlalchemy import text

def fix_enum_values():
    """Update enum values from lowercase to uppercase"""
    app = create_app()
    
    with app.app_context():
        try:
            # Fix attendance status enum values
            print("Fixing attendance status enum values...")
            db.session.execute(text("""
                UPDATE attendance 
                SET status = UPPER(status)
                WHERE status IN ('present', 'absent', 'late', 'half_day')
            """))
            
            # Fix leave type enum values
            print("Fixing leave type enum values...")
            db.session.execute(text("""
                UPDATE leaves 
                SET leave_type = UPPER(leave_type)
                WHERE leave_type IN ('casual', 'sick', 'earned', 'maternity', 'paternity')
            """))
            
            # Fix leave status enum values
            print("Fixing leave status enum values...")
            db.session.execute(text("""
                UPDATE leaves 
                SET status = UPPER(status)
                WHERE status IN ('pending', 'approved', 'rejected')
            """))
            
            # Fix performance rating enum values
            print("Fixing performance rating enum values...")
            db.session.execute(text("""
                UPDATE performance_reviews 
                SET overall_rating = UPPER(overall_rating)
                WHERE overall_rating IN ('excellent', 'good', 'average', 'needs_improvement')
            """))
            
            # Fix job status enum values
            print("Fixing job status enum values...")
            db.session.execute(text("""
                UPDATE job_postings 
                SET status = UPPER(status)
                WHERE status IN ('open', 'closed', 'filled')
            """))
            
            db.session.commit()
            print("✅ All enum values have been updated successfully!")
            
        except Exception as e:
            print(f"❌ Error updating enum values: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    fix_enum_values()