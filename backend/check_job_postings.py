from config import config
from flask import Flask
from utils.database import db
from models.hr import JobPosting, JobStatus

app = Flask(__name__)
app.config.from_object(config['development'])
db.init_app(app)

with app.app_context():
    jobs = JobPosting.query.all()
    print(f'Total job postings: {len(jobs)}')
    
    for job in jobs:
        print(f'\nJob ID: {job.id}')
        print(f'  Title: {job.title}')
        print(f'  Status: {job.status}')
        print(f'  Status Type: {type(job.status)}')
        print(f'  Status Value: {job.status.value if hasattr(job.status, "value") else "N/A"}')