"""Fix job_postings status enum to use uppercase values"""
from config import config
from flask import Flask
from utils.database import db
from sqlalchemy import text

app = Flask(__name__)
app.config.from_object(config['development'])
db.init_app(app)

with app.app_context():
    print("Fixing job_postings status enum...")
    
    try:
        # Alter the enum column to use uppercase values
        sql = """
        ALTER TABLE job_postings 
        MODIFY COLUMN status ENUM('OPEN', 'CLOSED', 'FILLED') DEFAULT 'OPEN'
        """
        
        db.session.execute(text(sql))
        db.session.commit()
        
        print("✓ Successfully updated status enum to uppercase values")
        
        # Verify the change
        result = db.session.execute(text("SHOW COLUMNS FROM job_postings LIKE 'status'"))
        column = result.fetchone()
        print(f"\nVerification:")
        print(f"  Column Type: {column[1]}")
        print(f"  Default: {column[4]}")
        
        # Check existing records
        result = db.session.execute(text("SELECT id, title, status FROM job_postings"))
        jobs = result.fetchall()
        
        if jobs:
            print(f"\nExisting job postings ({len(jobs)}):")
            for job in jobs:
                print(f"  Job {job[0]}: {job[1]} - Status: {job[2]}")
        else:
            print("\nNo job postings found.")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        db.session.rollback()