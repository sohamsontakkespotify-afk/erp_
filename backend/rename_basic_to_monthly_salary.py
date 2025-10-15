#!/usr/bin/env python3
"""
Migration script to rename basic_salary column to monthly_salary in payrolls table
"""

from app import create_app
from models import db
from sqlalchemy import text

def rename_column():
    """Rename basic_salary to monthly_salary in payrolls table"""
    try:
        app = create_app()
        with app.app_context():
            # Check if basic_salary column exists
            result = db.session.execute(text("SHOW COLUMNS FROM payrolls LIKE 'basic_salary'"))
            if result.fetchone():
                print("Renaming basic_salary to monthly_salary...")

                # Rename the column
                db.session.execute(text("""
                    ALTER TABLE payrolls
                    CHANGE COLUMN basic_salary monthly_salary FLOAT NOT NULL
                """))
                db.session.commit()

                print("Column renamed successfully!")
            else:
                print("basic_salary column not found. Checking if monthly_salary already exists...")

                # Check if monthly_salary already exists
                result = db.session.execute(text("SHOW COLUMNS FROM payrolls LIKE 'monthly_salary'"))
                if result.fetchone():
                    print("monthly_salary column already exists. Migration not needed.")
                else:
                    print("Neither basic_salary nor monthly_salary found. Please check the database schema.")

    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    rename_column()
