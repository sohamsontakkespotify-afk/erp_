#!/usr/bin/env python3
"""
Check attendance status values in database
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

def check_attendance_status():
    """Check attendance status values"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text('SELECT DISTINCT status FROM attendance'))
            print('Current status values in attendance table:')
            for row in result:
                print(f'  {row[0]}')

    except Exception as e:
        print(f"❌ Error checking attendance status: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_attendance_status()
