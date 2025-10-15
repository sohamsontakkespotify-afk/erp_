import sys
sys.path.append('.')
from models import db
from models.guest_list import GuestList
from config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date

engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
Session = sessionmaker(bind=engine)
session = Session()

try:
    count = session.query(GuestList).count()
    print(f'Total guests: {count}')
    today = date.today()
    today_count = session.query(GuestList).filter(GuestList.visit_date == today).count()
    print(f'Guests for today ({today}): {today_count}')
    scheduled = session.query(GuestList).filter(GuestList.status == 'scheduled').count()
    checked_in = session.query(GuestList).filter(GuestList.status == 'checked_in').count()
    checked_out = session.query(GuestList).filter(GuestList.status == 'checked_out').count()
    print(f'Scheduled: {scheduled}, Checked In: {checked_in}, Checked Out: {checked_out}')
    
    # Get all guests with dates
    guests = session.query(GuestList).all()
    for g in guests:
        print(f'ID: {g.id}, Name: {g.guest_name}, Date: {g.visit_date}, Status: {g.status}')
except Exception as e:
    print(f'Error: {e}')
finally:
    session.close()
