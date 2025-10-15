#!/usr/bin/env python3
"""
Migration script to update existing employees and payrolls with default salary_type values
"""

from app import create_app
from models import db, Employee, Payroll, SalaryType

def update_salary_type_defaults():
    """Update existing records with default salary_type values"""
    try:
        app = create_app()
        with app.app_context():
            # Update employees with NULL salary_type to DAILY
            employees_updated = Employee.query.filter(Employee.salary_type.is_(None)).update({
                'salary_type': SalaryType.DAILY
            })
            print(f"Updated {employees_updated} employees with default salary_type DAILY")

            # Update payrolls with NULL salary_type to MONTHLY
            payrolls_updated = Payroll.query.filter(Payroll.salary_type.is_(None)).update({
                'salary_type': SalaryType.MONTHLY.value  # Store as string
            })
            print(f"Updated {payrolls_updated} payrolls with default salary_type MONTHLY")

            db.session.commit()
            print("All updates committed successfully!")

    except Exception as e:
        print(f"Error during update: {e}")
        db.session.rollback()
        raise

if __name__ == "__main__":
    update_salary_type_defaults()
