#!/usr/bin/env python3
"""
Migration script to create HR tables using the same DB URI as the Flask app
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

def create_hr_tables():
    """Create HR tables"""
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
        with engine.connect() as connection:
            print("Creating employees table...")
            connection.execute(text(create_employees_table))
            connection.commit()

            print("Creating attendance table...")
            connection.execute(text(create_attendance_table))
            connection.commit()

            print("Creating leaves table...")
            connection.execute(text(create_leaves_table))
            connection.commit()

            print("Creating payrolls table...")
            connection.execute(text(create_payrolls_table))
            connection.commit()

            print("Creating performance_reviews table...")
            connection.execute(text(create_performance_reviews_table))
            connection.commit()

            print("Creating job_postings table...")
            connection.execute(text(create_job_postings_table))
            connection.commit()

            print("✅ All HR tables created successfully!")

    except Exception as e:
        print(f"❌ Error creating HR tables: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_hr_tables()
