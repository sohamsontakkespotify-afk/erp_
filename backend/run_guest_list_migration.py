"""
Guest List Migration Script
Creates the guest_list table for security department visitor management
"""
from utils.database import db
from sqlalchemy import text
from app import create_app

def run_migration():
    """Create guest_list table"""
    app = create_app()
    with app.app_context():
        try:
            # Create guest_list table
            create_table_query = text("""
            CREATE TABLE IF NOT EXISTS guest_list (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guest_name VARCHAR(255) NOT NULL,
                guest_contact VARCHAR(20),
                guest_email VARCHAR(255),
                guest_company VARCHAR(255),
                meeting_person VARCHAR(255) NOT NULL,
                meeting_person_department VARCHAR(100),
                meeting_person_contact VARCHAR(20),
                visit_date DATE NOT NULL,
                visit_time TIME,
                purpose VARCHAR(500) NOT NULL,
                in_time DATETIME,
                out_time DATETIME,
                vehicle_number VARCHAR(50),
                id_proof_type VARCHAR(50),
                id_proof_number VARCHAR(100),
                visitor_photo_path VARCHAR(500),
                status ENUM('scheduled', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'scheduled',
                notes TEXT,
                created_by VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_guest_name (guest_name),
                INDEX idx_meeting_person (meeting_person),
                INDEX idx_visit_date (visit_date),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            db.session.execute(create_table_query)
            db.session.commit()
            
            print("✅ Guest list table created successfully!")
            
            # Verify table creation
            verify_query = text("SHOW TABLES LIKE 'guest_list'")
            result = db.session.execute(verify_query)
            if result.fetchone():
                print("✅ Table verification successful!")
            else:
                print("❌ Table verification failed!")
                
        except Exception as e:
            print(f"❌ Error during migration: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    print("Starting guest list migration...")
    run_migration()
    print("Migration completed!")