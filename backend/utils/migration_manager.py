"""
Centralized Migration Manager
Automatically runs all database migrations when the application starts
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class MigrationManager:
    """Manages all database migrations for the ERP system"""
    
    def __init__(self, app=None, db=None):
        """
        Initialize the migration manager
        
        Args:
            app: Flask application instance
            db: SQLAlchemy database instance
        """
        self.app = app
        self.db = db
        self.engine = None
        
        if app:
            self.init_app(app, db)
    
    def init_app(self, app, db):
        """Initialize with Flask app"""
        self.app = app
        self.db = db
        
        # Get database URI from app config
        database_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
        if database_uri:
            self.engine = create_engine(database_uri)
    
    def column_exists(self, connection, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table"""
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
    
    def table_exists(self, connection, table_name: str) -> bool:
        """Check if a table exists"""
        query = text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
            """
        )
        res = connection.execute(query, {"table": table_name}).scalar()
        return int(res or 0) > 0
    
    def run_sales_migration(self, connection):
        """Create sales tables"""
        print("🔄 Running sales migration...")
        
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
            connection.execute(text(create_sales_order_table))
            connection.commit()
            
            # Add additional columns if they don't exist
            if not self.column_exists(connection, 'sales_order', 'coupon_code'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN coupon_code VARCHAR(50) NULL"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'finance_bypass'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN finance_bypass BOOLEAN DEFAULT FALSE"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'bypass_reason'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN bypass_reason TEXT NULL"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'bypassed_at'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN bypassed_at DATETIME NULL"))
                connection.commit()
            
            connection.execute(text(create_customer_table))
            connection.commit()
            
            connection.execute(text(create_sales_transaction_table))
            connection.commit()
            
            print("✅ Sales tables created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Sales migration error: {e}")
            return False
    
    def run_hr_migration(self, connection):
        """Create HR tables"""
        print("🔄 Running HR migration...")
        
        create_employees_table = """
        CREATE TABLE IF NOT EXISTS employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id VARCHAR(20) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            date_of_birth DATE,
            gender VARCHAR(20),
            address TEXT,
            department VARCHAR(100) NOT NULL,
            designation VARCHAR(100) NOT NULL,
            joining_date DATE NOT NULL,
            salary FLOAT NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            manager_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (manager_id) REFERENCES employees(id)
        );
        """

        create_attendance_table = """
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            date DATE NOT NULL,
            check_in_time TIME,
            check_out_time TIME,
            status ENUM('present', 'absent', 'late', 'half_day') DEFAULT 'present',
            hours_worked FLOAT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );
        """

        create_leaves_table = """
        CREATE TABLE IF NOT EXISTS leaves (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            leave_type ENUM('casual', 'sick', 'earned', 'maternity', 'paternity') NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_requested FLOAT NOT NULL,
            reason TEXT,
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            approved_by INT,
            approved_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (approved_by) REFERENCES employees(id)
        );
        """

        create_payrolls_table = """
        CREATE TABLE IF NOT EXISTS payrolls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            pay_period_start DATE NOT NULL,
            pay_period_end DATE NOT NULL,
            basic_salary FLOAT NOT NULL,
            allowances FLOAT DEFAULT 0,
            deductions FLOAT DEFAULT 0,
            gross_salary FLOAT NOT NULL,
            net_salary FLOAT NOT NULL,
            payment_date DATE,
            status VARCHAR(20) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );
        """

        create_performance_reviews_table = """
        CREATE TABLE IF NOT EXISTS performance_reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            review_period VARCHAR(20) NOT NULL,
            review_date DATE NOT NULL,
            reviewer_id INT NOT NULL,
            overall_rating ENUM('excellent', 'good', 'average', 'needs_improvement') NOT NULL,
            goals_achievement FLOAT,
            strengths TEXT,
            areas_for_improvement TEXT,
            development_plan TEXT,
            comments TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (reviewer_id) REFERENCES employees(id)
        );
        """

        create_job_postings_table = """
        CREATE TABLE IF NOT EXISTS job_postings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            department VARCHAR(100) NOT NULL,
            location VARCHAR(100),
            employment_type VARCHAR(50),
            experience_level VARCHAR(50),
            salary_range VARCHAR(100),
            description TEXT NOT NULL,
            requirements TEXT,
            responsibilities TEXT,
            status ENUM('open', 'closed', 'filled') DEFAULT 'open',
            posted_by INT,
            application_deadline DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (posted_by) REFERENCES employees(id)
        );
        """

        create_job_applications_table = """
        CREATE TABLE IF NOT EXISTS job_applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_posting_id INT NOT NULL,
            applicant_name VARCHAR(200) NOT NULL,
            applicant_email VARCHAR(255) NOT NULL,
            applicant_phone VARCHAR(20),
            resume_path VARCHAR(500),
            cover_letter TEXT,
            experience_years FLOAT,
            current_salary FLOAT,
            expected_salary FLOAT,
            availability_date DATE,
            status ENUM('submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn') DEFAULT 'submitted',
            notes TEXT,
            reviewed_by INT,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_posting_id) REFERENCES job_postings(id),
            FOREIGN KEY (reviewed_by) REFERENCES employees(id)
        );
        """

        create_interviews_table = """
        CREATE TABLE IF NOT EXISTS interviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_application_id INT NOT NULL,
            interview_type VARCHAR(50),
            scheduled_date DATE NOT NULL,
            scheduled_time TIME NOT NULL,
            duration_minutes INT DEFAULT 60,
            interviewers VARCHAR(500),
            location VARCHAR(200),
            status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
            feedback TEXT,
            rating FLOAT,
            decision VARCHAR(50),
            conducted_by INT,
            conducted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_application_id) REFERENCES job_applications(id),
            FOREIGN KEY (conducted_by) REFERENCES employees(id)
        );
        """

        create_candidates_table = """
        CREATE TABLE IF NOT EXISTS candidates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            skills TEXT,
            experience_years FLOAT,
            current_position VARCHAR(200),
            current_company VARCHAR(200),
            location VARCHAR(100),
            resume_path VARCHAR(500),
            source VARCHAR(100),
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT,
            added_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES employees(id)
        );
        """
        
        try:
            connection.execute(text(create_employees_table))
            connection.commit()
            
            connection.execute(text(create_attendance_table))
            connection.commit()
            
            connection.execute(text(create_leaves_table))
            connection.commit()
            
            connection.execute(text(create_payrolls_table))
            connection.commit()
            
            connection.execute(text(create_performance_reviews_table))
            connection.commit()
            
            connection.execute(text(create_job_postings_table))
            connection.commit()
            
            connection.execute(text(create_job_applications_table))
            connection.commit()
            
            connection.execute(text(create_interviews_table))
            connection.commit()
            
            connection.execute(text(create_candidates_table))
            connection.commit()
            
            print("✅ HR tables created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ HR migration error: {e}")
            return False
    
    def run_dispatch_migration(self, connection):
        """Update dispatch tables"""
        print("🔄 Running dispatch migration...")
        
        try:
            # Add columns if they don't exist
            if self.table_exists(connection, 'dispatch_request'):
                if not self.column_exists(connection, 'dispatch_request', 'sales_order_id'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN sales_order_id INT"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'party_email'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN party_email VARCHAR(200)"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'quantity'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN quantity INT DEFAULT 1"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'dispatch_notes'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN dispatch_notes TEXT"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'updated_at'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
                    connection.commit()
                
                print("✅ Dispatch tables updated successfully!")
            else:
                print("ℹ️ dispatch_request table doesn't exist yet, skipping dispatch migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Dispatch migration error: {e}")
            return False
    
    def run_fleet_migration(self, connection):
        """Create fleet tables"""
        print("🔄 Running fleet migration...")
        
        create_vehicle_table = """
        CREATE TABLE IF NOT EXISTS vehicle (
          id INT NOT NULL AUTO_INCREMENT,
          vehicle_number VARCHAR(100) NOT NULL UNIQUE,
          vehicle_type VARCHAR(50) NOT NULL,
          driver_name VARCHAR(200) NOT NULL,
          driver_contact VARCHAR(100),
          capacity VARCHAR(100),
          status VARCHAR(50) DEFAULT 'available',
          current_location VARCHAR(200),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_vehicle_status (status),
          INDEX idx_vehicle_number (vehicle_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        
        create_transport_job_table = """
        CREATE TABLE IF NOT EXISTS transport_job (
          id INT NOT NULL AUTO_INCREMENT,
          dispatch_request_id INT NOT NULL,
          transporter_name VARCHAR(200),
          vehicle_no VARCHAR(100),
          status VARCHAR(50) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_transport_status (status),
          INDEX idx_transport_dispatch (dispatch_request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        
        try:
            connection.execute(text(create_vehicle_table))
            connection.commit()
            
            connection.execute(text(create_transport_job_table))
            connection.commit()
            
            print("✅ Fleet tables created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Fleet migration error: {e}")
            return False
    
    def run_guest_list_migration(self, connection):
        """Create guest list table"""
        print("🔄 Running guest list migration...")
        
        create_guest_list_table = """
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        try:
            connection.execute(text(create_guest_list_table))
            connection.commit()
            
            print("✅ Guest list table created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Guest list migration error: {e}")
            return False
    
    def run_all_migrations(self):
        """Run all migrations in the correct order"""
        print("\n" + "=" * 60)
        print("🚀 Starting Automatic Database Migrations")
        print("=" * 60 + "\n")
        
        if not self.engine:
            print("❌ Database engine not initialized")
            return False
        
        try:
            with self.engine.connect() as connection:
                # Run migrations in order (respecting dependencies)
                self.run_sales_migration(connection)
                self.run_hr_migration(connection)
                self.run_dispatch_migration(connection)
                self.run_fleet_migration(connection)
                self.run_guest_list_migration(connection)
                
                print("\n" + "=" * 60)
                print("✅ All migrations completed successfully!")
                print("=" * 60 + "\n")
                return True
                
        except Exception as e:
            print(f"\n❌ Migration error: {e}")
            import traceback
            traceback.print_exc()
            return False


# Global instance
migration_manager = MigrationManager()


def init_migrations(app, db):
    """
    Initialize and run all migrations
    
    Args:
        app: Flask application instance
        db: SQLAlchemy database instance
    
    Returns:
        bool: True if migrations completed successfully
    """
    migration_manager.init_app(app, db)
    return migration_manager.run_all_migrations()