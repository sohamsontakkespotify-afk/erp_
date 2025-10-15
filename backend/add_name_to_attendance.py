#!/usr/bin/env python3
"""
Migration script to add 'name' column to attendance table
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

def column_exists(connection, table_name: str, column_name: str) -> bool:
    query = text(
        """
        SELECT COUNT(*) AS cnt
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
          AND COLUMN_NAME = :col
        """
    )
    res = connection.execute(query, {"table": table_name, "col": column_name}).scalar()
    return int(res or 0) > 0

def add_name_column_to_attendance():
    """Add name column to attendance table after employee_id"""
    add_column_sql = """
    ALTER TABLE attendance 
    ADD COLUMN name VARCHAR(100) AFTER employee_id;
    """
    
    try:
        with engine.connect() as connection:
            if not column_exists(connection, 'attendance', 'name'):
                print("Adding 'name' column to attendance table...")
                connection.execute(text(add_column_sql))
                connection.commit()
                print("✅ 'name' column added successfully!")
            else:
                print("ℹ️ 'name' column already exists in attendance table.")
                
    except Exception as e:
        print(f"❌ Error adding 'name' column: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_name_column_to_attendance()
