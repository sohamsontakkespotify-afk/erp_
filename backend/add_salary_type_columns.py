#!/usr/bin/env python3
"""
Migration script to add salary_type column to employees and payrolls tables
"""

from app import create_app
from models import db
from sqlalchemy import text

def add_salary_type_columns():
    """Add salary_type column to employees and payrolls tables"""
    try:
        app = create_app()
        with app.app_context():
            # Add salary_type to employees table
            result = db.session.execute(text("SHOW COLUMNS FROM employees LIKE 'salary_type'"))
            if not result.fetchone():
                print("Adding salary_type column to employees table...")
                db.session.execute(text("""
                    ALTER TABLE employees
                    ADD COLUMN salary_type ENUM('daily','monthly','hourly') DEFAULT 'daily'
                """))
                db.session.commit()
                print("salary_type column added to employees table successfully!")
            else:
                print("salary_type column already exists in employees table.")

            # Add salary_type to payrolls table
            result = db.session.execute(text("SHOW COLUMNS FROM payrolls LIKE 'salary_type'"))
            if not result.fetchone():
                print("Adding salary_type column to payrolls table...")
                db.session.execute(text("""
                    ALTER TABLE payrolls
                    ADD COLUMN salary_type ENUM('daily','monthly','hourly') DEFAULT 'monthly'
                """))
                db.session.commit()
                print("salary_type column added to payrolls table successfully!")
            else:
                print("salary_type column already exists in payrolls table.")

    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    add_salary_type_columns()
