"""Check job_postings table schema"""
from config import config
from flask import Flask
from utils.database import db
from sqlalchemy import text

app = Flask(__name__)
app.config.from_object(config['development'])
db.init_app(app)

with app.app_context():
    # Get table schema
    result = db.session.execute(text("SHOW CREATE TABLE job_postings"))
    schema = result.fetchone()
    print("Job Postings Table Schema:")
    print(schema[1])
    
    print("\n" + "="*80 + "\n")
    
    # Get column info
    result = db.session.execute(text("SHOW COLUMNS FROM job_postings LIKE 'status'"))
    column = result.fetchone()
    print("Status Column Info:")
    print(f"Field: {column[0]}")
    print(f"Type: {column[1]}")
    print(f"Null: {column[2]}")
    print(f"Key: {column[3]}")
    print(f"Default: {column[4]}")
    print(f"Extra: {column[5]}")