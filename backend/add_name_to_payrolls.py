"""
Migration script to add name column to payrolls table
"""
from models import db
from app import create_app
from sqlalchemy import text

def add_name_column_to_payrolls():
    """Add name column to payrolls table after employee_id"""
    app = create_app()

    with app.app_context():
        try:
            # Add name column after employee_id
            db.session.execute(text('''
                ALTER TABLE payrolls
                ADD COLUMN name VARCHAR(100) AFTER employee_id
            '''))

            # Populate the name column with employee names
            db.session.execute(text('''
                UPDATE payrolls p
                JOIN employees e ON p.employee_id = e.id
                SET p.name = CONCAT(e.first_name, ' ', e.last_name)
            '''))

            db.session.commit()
            print("Successfully added name column to payrolls table and populated with employee names")

        except Exception as e:
            print(f"Error adding name column: {e}")
            db.session.rollback()

if __name__ == "__main__":
    add_name_column_to_payrolls()
