#!/usr/bin/env python3
"""
Migration script to update dispatch tables with new fields for proper dispatch workflow
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

def update_dispatch_tables():
    """Update dispatch tables with new fields"""
    
    # Check if dispatch_request table exists and add new columns (MySQL compatible)
    add_dispatch_columns = [
        "ALTER TABLE dispatch_request ADD COLUMN sales_order_id INT;",
        "ALTER TABLE dispatch_request ADD COLUMN party_email VARCHAR(200);", 
        "ALTER TABLE dispatch_request ADD COLUMN quantity INT DEFAULT 1;",
        "ALTER TABLE dispatch_request ADD COLUMN dispatch_notes TEXT;",
        "ALTER TABLE dispatch_request ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;"
    ]
    
    # Add foreign key constraint for sales_order_id (only if it doesn't exist)
    add_foreign_key = """
    ALTER TABLE dispatch_request 
    ADD CONSTRAINT fk_dispatch_sales_order 
    FOREIGN KEY (sales_order_id) REFERENCES sales_order(id)
    ON DELETE CASCADE;
    """
    
    # Update GatePass table to add rejected status
    update_gate_pass_status = """
    ALTER TABLE gate_pass
    MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending' 
    COMMENT 'pending, verified, rejected';
    """
    
    try:
        with engine.connect() as connection:
            print("Updating dispatch_request table...")
            for column_sql in add_dispatch_columns:
                try:
                    connection.execute(text(column_sql))
                    connection.commit()
                    print(f"✅ Executed: {column_sql}")
                except Exception as e:
                    if "Duplicate column name" not in str(e):
                        print(f"⚠️ Warning: {e}")
            
            print("Adding foreign key constraint...")
            try:
                connection.execute(text(add_foreign_key))
                connection.commit()
                print("✅ Added foreign key constraint")
            except Exception as e:
                if "Duplicate key name" not in str(e) and "already exists" not in str(e):
                    print(f"⚠️ Warning adding foreign key: {e}")
            
            print("Updating gate_pass status options...")
            try:
                connection.execute(text(update_gate_pass_status))
                connection.commit()
                print("✅ Updated gate_pass status options")
            except Exception as e:
                print(f"⚠️ Warning updating gate_pass: {e}")
            
            print("✅ All dispatch table updates completed successfully!")
            
    except Exception as e:
        print(f"❌ Error updating tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    update_dispatch_tables()
