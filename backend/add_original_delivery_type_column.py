#!/usr/bin/env python3
"""
Migration script to add original_delivery_type column to dispatch_request table
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from config import config as app_config


def get_engine():
    load_dotenv()
    config_name = os.getenv('FLASK_CONFIG', 'default')
    FlaskConfig = app_config[config_name]
    uri = FlaskConfig.SQLALCHEMY_DATABASE_URI
    return create_engine(uri)


def run_migration():
    """Add original_delivery_type column to dispatch_request table"""
    engine = get_engine()
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            check_column = text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'dispatch_request' 
                AND COLUMN_NAME = 'original_delivery_type'
            """)
            
            result = conn.execute(check_column).fetchone()
            
            if result:
                print("✓ Column 'original_delivery_type' already exists in dispatch_request table")
                return
            
            # Add the new column
            add_column = text("""
                ALTER TABLE dispatch_request 
                ADD COLUMN original_delivery_type VARCHAR(50) NULL 
                COMMENT 'Store original delivery type from sales (part load, company delivery, etc.)'
            """)
            
            conn.execute(add_column)
            conn.commit()
            
            print("✓ Successfully added 'original_delivery_type' column to dispatch_request table")
            
            # Update existing records with default values based on delivery_type
            update_existing = text("""
                UPDATE dispatch_request 
                SET original_delivery_type = CASE 
                    WHEN delivery_type = 'self' THEN 'self delivery'
                    WHEN delivery_type = 'transport' THEN 'company delivery'
                    ELSE 'company delivery'
                END
                WHERE original_delivery_type IS NULL
            """)
            
            conn.execute(update_existing)
            conn.commit()
            
            print("✓ Updated existing records with default original_delivery_type values")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        raise


if __name__ == "__main__":
    print("Running migration to add original_delivery_type column...")
    run_migration()
    print("Migration completed successfully!")