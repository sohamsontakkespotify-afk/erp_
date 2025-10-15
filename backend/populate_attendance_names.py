#!/usr/bin/env python3
"""
Script to populate the 'name' column in attendance table with employee names
"""
import os
import sys
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

def populate_attendance_names():
    """Populate name column in attendance table with employee full names"""
    update_sql = """
    UPDATE attendance a
    JOIN employees e ON a.employee_id = e.id
    SET a.name = CONCAT(e.first_name, ' ', e.last_name)
    WHERE a.name IS NULL;
    """
    
    try:
        with engine.connect() as connection:
            print("Populating 'name' column in attendance table...")
            result = connection.execute(text(update_sql))
            connection.commit()
            print(f"✅ Updated {result.rowcount} attendance records with employee names!")
                
    except Exception as e:
        print(f"❌ Error populating 'name' column: {e}")
        sys.exit(1)

if __name__ == "__main__":
    populate_attendance_names()
