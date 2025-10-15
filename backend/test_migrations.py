#!/usr/bin/env python3
"""
Test script to verify automatic migration system
This script tests the migration manager without starting the full Flask app
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import config as app_config
from utils.migration_manager import MigrationManager

# Load environment variables
load_dotenv()

def test_migrations():
    """Test the migration system"""
    print("\n" + "=" * 70)
    print("🧪 Testing Automatic Migration System")
    print("=" * 70 + "\n")
    
    try:
        # Get database configuration
        config_name = os.getenv('FLASK_CONFIG', 'default')
        flask_config = app_config[config_name]
        database_uri = flask_config.SQLALCHEMY_DATABASE_URI
        
        print(f"📊 Database: {database_uri.split('@')[1] if '@' in database_uri else 'configured'}")
        print(f"🔧 Config: {config_name}\n")
        
        # Create engine
        engine = create_engine(database_uri)
        
        # Test database connection
        print("🔌 Testing database connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            if result.fetchone():
                print("✅ Database connection successful!\n")
        
        # Create migration manager
        manager = MigrationManager()
        manager.engine = engine
        
        # Run migrations
        success = manager.run_all_migrations()
        
        if success:
            print("\n" + "=" * 70)
            print("✅ Migration Test PASSED")
            print("=" * 70)
            
            # Verify tables were created
            print("\n📋 Verifying created tables...\n")
            with engine.connect() as conn:
                tables_to_check = [
                    'sales_order',
                    'customer',
                    'employees',
                    'attendance',
                    'leaves',
                    'payrolls',
                    'vehicle',
                    'transport_job',
                    'guest_list'
                ]
                
                for table in tables_to_check:
                    try:
                        result = conn.execute(text(f"SHOW TABLES LIKE '{table}'"))
                        if result.fetchone():
                            # Get row count
                            count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                            count = count_result.fetchone()[0]
                            print(f"  ✅ {table:<25} (exists, {count} rows)")
                        else:
                            print(f"  ❌ {table:<25} (not found)")
                    except Exception as e:
                        print(f"  ⚠️  {table:<25} (error: {str(e)[:50]})")
            
            print("\n" + "=" * 70)
            print("🎉 All tests completed successfully!")
            print("=" * 70 + "\n")
            return True
        else:
            print("\n" + "=" * 70)
            print("❌ Migration Test FAILED")
            print("=" * 70 + "\n")
            return False
            
    except Exception as e:
        print(f"\n❌ Test Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_migration_status():
    """Check current migration status without running migrations"""
    print("\n" + "=" * 70)
    print("📊 Current Database Status")
    print("=" * 70 + "\n")
    
    try:
        config_name = os.getenv('FLASK_CONFIG', 'default')
        flask_config = app_config[config_name]
        database_uri = flask_config.SQLALCHEMY_DATABASE_URI
        engine = create_engine(database_uri)
        
        with engine.connect() as conn:
            # Get all tables
            result = conn.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print(f"Found {len(tables)} tables:\n")
                for table in sorted(tables):
                    count_result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = count_result.fetchone()[0]
                    print(f"  📋 {table:<30} ({count} rows)")
            else:
                print("⚠️  No tables found in database")
        
        print("\n" + "=" * 70 + "\n")
        
    except Exception as e:
        print(f"❌ Error checking status: {e}\n")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Test automatic migration system')
    parser.add_argument('--status', action='store_true', help='Check migration status only')
    parser.add_argument('--test', action='store_true', help='Run migration test')
    
    args = parser.parse_args()
    
    if args.status:
        check_migration_status()
    elif args.test or len(sys.argv) == 1:
        # Default action is to test
        success = test_migrations()
        sys.exit(0 if success else 1)
    else:
        parser.print_help()