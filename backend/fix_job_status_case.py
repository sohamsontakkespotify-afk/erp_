"""Fix job posting status values to uppercase"""
from config import config
from flask import Flask
from utils.database import db
from sqlalchemy import text

app = Flask(__name__)
app.config.from_object(config['development'])
db.init_app(app)

with app.app_context():
    print("Fixing job posting status values...")
    
    # Update all lowercase status values to uppercase
    updates = [
        ("UPDATE job_postings SET status = 'OPEN' WHERE status = 'open'", "open -> OPEN"),
        ("UPDATE job_postings SET status = 'CLOSED' WHERE status = 'closed'", "closed -> CLOSED"),
        ("UPDATE job_postings SET status = 'FILLED' WHERE status = 'filled'", "filled -> FILLED"),
    ]
    
    for sql, description in updates:
        result = db.session.execute(text(sql))
        if result.rowcount > 0:
            print(f"  ✓ Updated {result.rowcount} records: {description}")
    
    db.session.commit()
    print("\n✓ Job posting status values fixed successfully!")
    
    # Verify the fix
    result = db.session.execute(text("SELECT id, title, status FROM job_postings"))
    jobs = result.fetchall()
    
    if jobs:
        print(f"\nVerification - Found {len(jobs)} job postings:")
        for job in jobs:
            print(f"  Job {job[0]}: {job[1]} - Status: {job[2]}")
    else:
        print("\nNo job postings found in database.")