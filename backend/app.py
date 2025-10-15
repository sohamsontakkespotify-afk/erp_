"""
Main Flask application entry point
"""
from flask import Flask
from flask_cors import CORS
from flask_mail import Mail
from flask_session import Session
from config import config
from models import db
from routes import register_blueprints
from utils.migration_manager import init_migrations
import os

mail = Mail()  # Initialize Mail instance globally

def create_app(config_name=None):
    """
    Application factory pattern
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.getenv('FLASK_CONFIG', 'default')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    mail.init_app(app)  # Initialize Mail with app
    Session(app)  # Initialize Flask-Session

    CORS(app , resources={r"/*": {"origins": erp-3p2p-git-main-sohams-projects-703c1079.vercel.app}})
    
    # Register blueprints
    register_blueprints(app)

    return app

def initialize_database(app):
    """Initialize database with tables and sample data"""
    with app.app_context():
        try:
            # Step 1: Run all custom migrations first
            print("\n🔧 Running custom migrations...")
            init_migrations(app, db)
            
            # Step 2: Create all database tables from models
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Step 3: Check and add missing columns for MySQL
            from sqlalchemy import text
            
            try:
                # Check if original_requirements column exists in purchase_order table
                result = db.session.execute(text("""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'purchase_order' 
                    AND COLUMN_NAME = 'original_requirements'
                """))
                
                column_exists = result.fetchone() is not None
                
                if not column_exists:
                    print("🔄 Adding missing original_requirements column...")
                    db.session.execute(text("ALTER TABLE purchase_order ADD COLUMN original_requirements TEXT"))
                    db.session.commit()
                    print("✅ original_requirements column added successfully!")
                else:
                    print("ℹ️ original_requirements column already exists")
                    
            except Exception as e:
                print(f"⚠️ Error checking/adding column: {e}")
                db.session.rollback()
            
            # Step 4: Create admin user if it doesn't exist
            from models import User, UserStatus
            admin_created = User.create_admin_user()
            if admin_created:
                print("✅ Admin user created successfully!")
            else:
                print("ℹ️ Admin user already exists")
            
            # Step 5: Initialize sample data if needed
            from models import ShowroomProduct
            from datetime import datetime
            
            if ShowroomProduct.query.count() == 0:
                print("🔄 Adding sample showroom products...")
                sample_products = [
                    {
                        'name': 'Office Chair',
                        'category': 'Furniture',
                        'cost_price': 150.0,
                        'sale_price': 250.0,
                        'showroom_status': 'sold',
                        'sold_date': datetime.utcnow()
                    },
                    {
                        'name': 'Desk Lamp',
                        'category': 'Electronics',
                        'cost_price': 45.0,
                        'sale_price': 75.0,
                        'showroom_status': 'sold',
                        'sold_date': datetime.utcnow()
                    },
                    {
                        'name': 'Wooden Table',
                        'category': 'Furniture',
                        'cost_price': 200.0,
                        'sale_price': 350.0,
                        'showroom_status': 'available'
                    }
                ]
                
                for product_data in sample_products:
                    product = ShowroomProduct(**product_data)
                    db.session.add(product)
                
                db.session.commit()
                print("✅ Sample showroom products added!")
                
        except Exception as e:
            print(f"❌ Error setting up database: {e}")
            raise

if __name__ == '__main__':
    # Create the Flask application
    app = create_app()
    
    # Initialize database
    initialize_database(app)
    
    # Run the application
    app.run(
        debug=app.config.get('DEBUG', True),
        host='0.0.0.0',
        port=5000
    )
