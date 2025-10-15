#!/usr/bin/env python3
"""
Seed script to add sample HR data for testing
"""
import os
import sys
from datetime import datetime, date, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from config import config as app_config

# Load environment variables
load_dotenv()

# Pick config (same as app's create_app)
CONFIG_NAME = os.getenv('FLASK_CONFIG', 'default')
FlaskConfig = app_config[CONFIG_NAME]
SQLALCHEMY_DATABASE_URI = FlaskConfig.SQLALCHEMY_DATABASE_URI

# Create database connection
engine = create_engine(SQLALCHEMY_DATABASE_URI)

def seed_employees():
    """Add sample employees"""
    employees = [
        {
            'employee_id': 'EMP0001',
            'first_name': 'Rajesh',
            'last_name': 'Kumar',
            'email': 'rajesh.kumar@company.com',
            'phone': '9876543210',
            'date_of_birth': '1990-05-15',
            'gender': 'Male',
            'address': '123 MG Road, Bangalore',
            'department': 'IT',
            'designation': 'Senior Developer',
            'joining_date': '2020-01-15',
            'salary': 75000,
            'status': 'active'
        },
        {
            'employee_id': 'EMP0002',
            'first_name': 'Priya',
            'last_name': 'Sharma',
            'email': 'priya.sharma@company.com',
            'phone': '9876543211',
            'date_of_birth': '1992-08-20',
            'gender': 'Female',
            'address': '456 Brigade Road, Bangalore',
            'department': 'HR',
            'designation': 'HR Manager',
            'joining_date': '2019-03-10',
            'salary': 65000,
            'status': 'active'
        },
        {
            'employee_id': 'EMP0003',
            'first_name': 'Amit',
            'last_name': 'Patel',
            'email': 'amit.patel@company.com',
            'phone': '9876543212',
            'date_of_birth': '1988-12-05',
            'gender': 'Male',
            'address': '789 Indiranagar, Bangalore',
            'department': 'Sales',
            'designation': 'Sales Executive',
            'joining_date': '2021-06-01',
            'salary': 55000,
            'status': 'active'
        },
        {
            'employee_id': 'EMP0004',
            'first_name': 'Sneha',
            'last_name': 'Reddy',
            'email': 'sneha.reddy@company.com',
            'phone': '9876543213',
            'date_of_birth': '1995-03-25',
            'gender': 'Female',
            'address': '321 Koramangala, Bangalore',
            'department': 'Marketing',
            'designation': 'Marketing Specialist',
            'joining_date': '2022-01-20',
            'salary': 50000,
            'status': 'active'
        },
        {
            'employee_id': 'EMP0005',
            'first_name': 'Vikram',
            'last_name': 'Singh',
            'email': 'vikram.singh@company.com',
            'phone': '9876543214',
            'date_of_birth': '1987-07-10',
            'gender': 'Male',
            'address': '654 Whitefield, Bangalore',
            'department': 'Finance',
            'designation': 'Finance Manager',
            'joining_date': '2018-09-15',
            'salary': 80000,
            'status': 'active'
        }
    ]

    try:
        with engine.connect() as connection:
            # Check if employees already exist
            result = connection.execute(text("SELECT COUNT(*) as cnt FROM employees")).scalar()
            
            if result > 0:
                print(f"⚠️  Database already has {result} employees. Skipping seed.")
                return
            
            print("Adding sample employees...")
            for emp in employees:
                insert_query = text("""
                    INSERT INTO employees 
                    (employee_id, first_name, last_name, email, phone, date_of_birth, 
                     gender, address, department, designation, joining_date, salary, status)
                    VALUES 
                    (:employee_id, :first_name, :last_name, :email, :phone, :date_of_birth,
                     :gender, :address, :department, :designation, :joining_date, :salary, :status)
                """)
                connection.execute(insert_query, emp)
            
            connection.commit()
            print(f"✅ Successfully added {len(employees)} sample employees!")

    except Exception as e:
        print(f"❌ Error seeding employees: {e}")
        sys.exit(1)

def seed_attendance():
    """Add sample attendance records for the current month"""
    try:
        with engine.connect() as connection:
            # Get employee IDs
            result = connection.execute(text("SELECT id FROM employees WHERE status = 'active'"))
            employee_ids = [row[0] for row in result]
            
            if not employee_ids:
                print("⚠️  No employees found. Please seed employees first.")
                return
            
            # Check if attendance already exists
            count = connection.execute(text("SELECT COUNT(*) as cnt FROM attendance")).scalar()
            if count > 0:
                print(f"⚠️  Database already has {count} attendance records. Skipping seed.")
                return
            
            print("Adding sample attendance records...")
            
            # Add attendance for last 30 days
            today = date.today()
            for i in range(30):
                attendance_date = today - timedelta(days=i)
                
                # Skip weekends
                if attendance_date.weekday() >= 5:
                    continue
                
                for emp_id in employee_ids:
                    # 90% attendance rate
                    import random
                    if random.random() < 0.9:
                        status = 'PRESENT'
                        check_in = '09:00:00'
                        check_out = '18:00:00'
                        hours_worked = 9.0
                    else:
                        status = 'ABSENT'
                        check_in = None
                        check_out = None
                        hours_worked = 0.0
                    
                    insert_query = text("""
                        INSERT INTO attendance 
                        (employee_id, date, check_in_time, check_out_time, status, hours_worked)
                        VALUES 
                        (:employee_id, :date, :check_in_time, :check_out_time, :status, :hours_worked)
                    """)
                    connection.execute(insert_query, {
                        'employee_id': emp_id,
                        'date': attendance_date,
                        'check_in_time': check_in,
                        'check_out_time': check_out,
                        'status': status,
                        'hours_worked': hours_worked
                    })
            
            connection.commit()
            print("✅ Successfully added sample attendance records!")

    except Exception as e:
        print(f"❌ Error seeding attendance: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🌱 Seeding HR data...")
    seed_employees()
    seed_attendance()
    print("✅ HR data seeding completed!")