"""
Gate Entry System Migration Script
Creates database tables and optionally migrates data from Excel files
"""
import os
import sys
from datetime import datetime
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db
from models.gate_entry import GateUser, GateEntryLog, GoingOutLog, GateEntrySession

# Create app instance
app = create_app()

def create_tables():
    """Create gate entry tables"""
    with app.app_context():
        try:
            print("Creating gate entry tables...")
            
            # Create tables
            db.create_all()
            
            print("✓ Gate entry tables created successfully!")
            return True
            
        except Exception as e:
            print(f"✗ Error creating tables: {e}")
            return False


def migrate_excel_data():
    """Migrate data from Excel files to database (optional)"""
    with app.app_context():
        try:
            import pandas as pd
            from pathlib import Path
            
            data_dir = Path(__file__).parent / 'data'
            
            # Check if Excel files exist
            users_file = data_dir / 'gate_users.xlsx'
            gate_logs_file = data_dir / 'gate_entry_logs.xlsx'
            going_out_file = data_dir / 'going_out_logs.xlsx'
            
            migrated_count = 0
            
            # Migrate users
            if users_file.exists():
                print("\nMigrating users from Excel...")
                df_users = pd.read_excel(users_file)
                
                for _, row in df_users.iterrows():
                    try:
                        # Check if user already exists
                        existing = GateUser.query.filter_by(phone=str(row['phone'])).first()
                        if existing:
                            print(f"  - User {row['name']} already exists, skipping...")
                            continue
                        
                        user = GateUser(
                            name=str(row['name']),
                            phone=str(row['phone']),
                            photo=str(row['photo']) if pd.notna(row.get('photo')) else None,
                            status=str(row.get('status', 'active')),
                            registered_at=pd.to_datetime(row['registered_at']) if pd.notna(row.get('registered_at')) else datetime.now(),
                            last_entry=pd.to_datetime(row['last_entry']) if pd.notna(row.get('last_entry')) else None,
                            last_exit=pd.to_datetime(row['last_exit']) if pd.notna(row.get('last_exit')) else None
                        )
                        db.session.add(user)
                        migrated_count += 1
                        print(f"  + Migrated user: {row['name']}")
                    except Exception as e:
                        print(f"  ✗ Error migrating user {row.get('name', 'Unknown')}: {e}")
                
                db.session.commit()
                print(f"✓ Migrated {migrated_count} users")
            
            # Migrate gate entry logs
            if gate_logs_file.exists():
                print("\nMigrating gate entry logs from Excel...")
                df_logs = pd.read_excel(gate_logs_file)
                log_count = 0
                
                for _, row in df_logs.iterrows():
                    try:
                        # Find user by phone
                        user = GateUser.query.filter_by(phone=str(row['user_phone'])).first()
                        if not user:
                            print(f"  - User not found for phone {row['user_phone']}, skipping log...")
                            continue
                        
                        log = GateEntryLog(
                            user_id=user.id,
                            user_name=str(row['user_name']),
                            user_phone=str(row['user_phone']),
                            action=str(row['action']),
                            method=str(row.get('method', 'manual')),
                            details=str(row['details']) if pd.notna(row.get('details')) else None,
                            status=str(row.get('status', 'completed')),
                            timestamp=pd.to_datetime(row['timestamp']) if pd.notna(row.get('timestamp')) else datetime.now()
                        )
                        db.session.add(log)
                        log_count += 1
                    except Exception as e:
                        print(f"  ✗ Error migrating log: {e}")
                
                db.session.commit()
                print(f"✓ Migrated {log_count} gate entry logs")
            
            # Migrate going out logs
            if going_out_file.exists():
                print("\nMigrating going out logs from Excel...")
                df_going_out = pd.read_excel(going_out_file)
                going_out_count = 0
                
                for _, row in df_going_out.iterrows():
                    try:
                        # Find user by phone
                        user = GateUser.query.filter_by(phone=str(row['user_phone'])).first()
                        if not user:
                            print(f"  - User not found for phone {row['user_phone']}, skipping log...")
                            continue
                        
                        going_out_log = GoingOutLog(
                            user_id=user.id,
                            user_name=str(row['user_name']),
                            user_phone=str(row['user_phone']),
                            reason_type=str(row['reason']),
                            reason_details=str(row['details']) if pd.notna(row.get('details')) else None,
                            going_out_time=pd.to_datetime(row['timestamp']),
                            coming_back_time=pd.to_datetime(row['return_time']) if pd.notna(row.get('return_time')) else None,
                            status=str(row.get('status', 'out'))
                        )
                        
                        # Calculate duration if both times exist
                        if going_out_log.coming_back_time and going_out_log.going_out_time:
                            duration = (going_out_log.coming_back_time - going_out_log.going_out_time).total_seconds() / 60
                            going_out_log.duration_minutes = round(duration, 1)
                        
                        db.session.add(going_out_log)
                        going_out_count += 1
                    except Exception as e:
                        print(f"  ✗ Error migrating going out log: {e}")
                
                db.session.commit()
                print(f"✓ Migrated {going_out_count} going out logs")
            
            print(f"\n✓ Data migration completed!")
            return True
            
        except ImportError:
            print("\n⚠ pandas not available, skipping Excel data migration")
            print("  Install pandas with: pip install pandas openpyxl")
            return False
        except Exception as e:
            print(f"\n✗ Error during data migration: {e}")
            db.session.rollback()
            return False


def verify_tables():
    """Verify that tables were created successfully"""
    with app.app_context():
        try:
            print("\nVerifying tables...")
            
            # Check each table
            tables = ['gate_users', 'gate_entry_logs', 'going_out_logs', 'gate_entry_sessions']
            
            for table in tables:
                result = db.session.execute(text(f"SHOW TABLES LIKE '{table}'"))
                if result.fetchone():
                    print(f"  ✓ Table '{table}' exists")
                    
                    # Get row count
                    count_result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = count_result.fetchone()[0]
                    print(f"    - Contains {count} records")
                else:
                    print(f"  ✗ Table '{table}' not found")
            
            return True
            
        except Exception as e:
            print(f"✗ Error verifying tables: {e}")
            return False


def main():
    """Main migration function"""
    print("=" * 60)
    print("Gate Entry System Database Migration")
    print("=" * 60)
    
    # Step 1: Create tables
    if not create_tables():
        print("\n✗ Migration failed at table creation step")
        return False
    
    # Step 2: Verify tables
    if not verify_tables():
        print("\n⚠ Warning: Table verification failed")
    
    # Step 3: Ask about data migration
    print("\n" + "=" * 60)
    migrate_data = input("Do you want to migrate data from Excel files? (y/n): ").lower().strip()
    
    if migrate_data == 'y':
        migrate_excel_data()
    else:
        print("Skipping data migration")
    
    print("\n" + "=" * 60)
    print("✓ Migration completed successfully!")
    print("=" * 60)
    print("\nYou can now use the gate entry system with database storage.")
    print("The following tables have been created:")
    print("  - gate_users: Registered users")
    print("  - gate_entry_logs: Entry/exit logs")
    print("  - going_out_logs: Going out/coming back logs")
    print("  - gate_entry_sessions: Daily session tracking")
    
    return True


if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n✗ Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)