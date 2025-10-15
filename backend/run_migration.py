#!/usr/bin/env python3
"""
Simple migration script to create sales tables using the same DB URI as the Flask app
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

def create_sales_tables():
    """Create sales tables"""
    
    # SQL statements to create tables
    create_sales_order_table = """
    CREATE TABLE IF NOT EXISTS sales_order (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(200) NOT NULL,
        customer_contact VARCHAR(100),
        customer_email VARCHAR(200),
        customer_address VARCHAR(400),
        showroom_product_id INT NOT NULL,
        quantity INT DEFAULT 1,
        unit_price FLOAT NOT NULL,
        total_amount FLOAT NOT NULL,
        discount_amount FLOAT DEFAULT 0.0,
        final_amount FLOAT NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'pending',
        order_status VARCHAR(50) DEFAULT 'pending',
        sales_person VARCHAR(100) NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (showroom_product_id) REFERENCES showroom_product(id)
    );
    """
    
    create_customer_table = """
    CREATE TABLE IF NOT EXISTS customer (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact VARCHAR(100),
        email VARCHAR(200),
        address VARCHAR(400),
        customer_type VARCHAR(50) DEFAULT 'retail',
        credit_limit FLOAT DEFAULT 0.0,
        current_balance FLOAT DEFAULT 0.0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
    """
    
    create_sales_transaction_table = """
    CREATE TABLE IF NOT EXISTS sales_transaction (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sales_order_id INT NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        amount FLOAT NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference_number VARCHAR(100),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sales_order_id) REFERENCES sales_order(id)
    );
    """
    
    try:
        with engine.connect() as connection:
            print("Creating sales_order table...")
            connection.execute(text(create_sales_order_table))
            connection.commit()

            # Ensure coupon/bypass columns exist (idempotent without IF NOT EXISTS)
            print("Ensuring coupon/bypass columns on sales_order...")
            alters = []
            if not column_exists(connection, 'sales_order', 'coupon_code'):
                alters.append("ADD COLUMN coupon_code VARCHAR(50) NULL")
            if not column_exists(connection, 'sales_order', 'finance_bypass'):
                alters.append("ADD COLUMN finance_bypass BOOLEAN DEFAULT FALSE")
            if not column_exists(connection, 'sales_order', 'bypass_reason'):
                alters.append("ADD COLUMN bypass_reason TEXT NULL")
            if not column_exists(connection, 'sales_order', 'bypassed_at'):
                alters.append("ADD COLUMN bypassed_at DATETIME NULL")
            if alters:
                alter_sql = "ALTER TABLE sales_order " + ", ".join(alters)
                connection.execute(text(alter_sql))
                connection.commit()

            print("Creating customer table...")
            connection.execute(text(create_customer_table))
            connection.commit()
            
            print("Creating sales_transaction table...")
            connection.execute(text(create_sales_transaction_table))
            connection.commit()
            
            print("✅ All sales tables created successfully!")
            
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_sales_tables()
