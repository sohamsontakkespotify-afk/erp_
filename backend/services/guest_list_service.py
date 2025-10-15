"""
Guest List Service
Business logic for visitor/guest management in security department
"""
from models import db
from models.guest_list import GuestList, GuestStatus
from datetime import datetime, date, time
from sqlalchemy import or_, and_

class GuestListService:
    """Service class for guest list operations"""
    
    @staticmethod
    def create_guest_entry(data, created_by=None):
        """Create a new guest entry"""
        try:
            # Parse visit date and time
            visit_date = datetime.strptime(data['visitDate'], '%Y-%m-%d').date() if isinstance(data.get('visitDate'), str) else data.get('visitDate')
            visit_time = None
            if data.get('visitTime'):
                if isinstance(data['visitTime'], str):
                    visit_time = datetime.strptime(data['visitTime'], '%H:%M').time()
                else:
                    visit_time = data['visitTime']
            
            guest = GuestList(
                guest_name=data['guestName'],
                guest_contact=data.get('guestContact'),
                guest_email=data.get('guestEmail'),
                guest_company=data.get('guestCompany'),
                meeting_person=data['meetingPerson'],
                meeting_person_department=data.get('meetingPersonDepartment'),
                meeting_person_contact=data.get('meetingPersonContact'),
                visit_date=visit_date,
                visit_time=visit_time,
                purpose=data['purpose'],
                vehicle_number=data.get('vehicleNumber'),
                id_proof_type=data.get('idProofType'),
                id_proof_number=data.get('idProofNumber'),
                notes=data.get('notes'),
                status=GuestStatus.SCHEDULED,
                created_by=created_by
            )
            
            db.session.add(guest)
            db.session.commit()
            
            return guest.to_dict()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create guest entry: {str(e)}")
    
    @staticmethod
    def get_all_guests(filters=None):
        """Get all guest entries with optional filters"""
        try:
            query = GuestList.query
            
            if filters:
                # Filter by status
                if filters.get('status'):
                    query = query.filter(GuestList.status == GuestStatus(filters['status']))
                
                # Filter by date range
                if filters.get('startDate'):
                    start_date = datetime.strptime(filters['startDate'], '%Y-%m-%d').date()
                    query = query.filter(GuestList.visit_date >= start_date)
                
                if filters.get('endDate'):
                    end_date = datetime.strptime(filters['endDate'], '%Y-%m-%d').date()
                    query = query.filter(GuestList.visit_date <= end_date)
                
                # Search by guest name or meeting person
                if filters.get('search'):
                    search_term = f"%{filters['search']}%"
                    query = query.filter(
                        or_(
                            GuestList.guest_name.like(search_term),
                            GuestList.meeting_person.like(search_term),
                            GuestList.guest_company.like(search_term)
                        )
                    )
            
            guests = query.order_by(GuestList.visit_date.desc(), GuestList.created_at.desc()).all()
            return [guest.to_dict() for guest in guests]
        except Exception as e:
            raise Exception(f"Failed to fetch guests: {str(e)}")
    
    @staticmethod
    def get_guest_by_id(guest_id):
        """Get a specific guest entry by ID"""
        try:
            guest = GuestList.query.get(guest_id)
            if not guest:
                raise ValueError(f"Guest entry with ID {guest_id} not found")
            return guest.to_dict()
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to fetch guest: {str(e)}")
    
    @staticmethod
    def get_todays_guests():
        """Get all guests scheduled for today"""
        try:
            today = date.today()
            guests = GuestList.query.filter(GuestList.visit_date == today).order_by(GuestList.visit_time).all()
            return [guest.to_dict() for guest in guests]
        except Exception as e:
            raise Exception(f"Failed to fetch today's guests: {str(e)}")
    
    @staticmethod
    def check_in_guest(guest_id, data=None):
        """Check in a guest (mark arrival)"""
        try:
            guest = GuestList.query.get(guest_id)
            if not guest:
                raise ValueError(f"Guest entry with ID {guest_id} not found")
            
            if guest.status == GuestStatus.CHECKED_IN:
                raise ValueError("Guest is already checked in")
            
            if guest.status == GuestStatus.CHECKED_OUT:
                raise ValueError("Guest has already checked out")
            
            guest.in_time = datetime.now()
            guest.status = GuestStatus.CHECKED_IN
            
            # Update additional info if provided
            if data:
                if data.get('vehicleNumber'):
                    guest.vehicle_number = data['vehicleNumber']
                if data.get('notes'):
                    guest.notes = data['notes']
            
            db.session.commit()
            return guest.to_dict()
        except ValueError:
            raise
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to check in guest: {str(e)}")
    
    @staticmethod
    def check_out_guest(guest_id, notes=None):
        """Check out a guest (mark departure)"""
        try:
            guest = GuestList.query.get(guest_id)
            if not guest:
                raise ValueError(f"Guest entry with ID {guest_id} not found")
            
            if guest.status != GuestStatus.CHECKED_IN:
                raise ValueError("Guest must be checked in before checking out")
            
            guest.out_time = datetime.now()
            guest.status = GuestStatus.CHECKED_OUT
            
            if notes:
                guest.notes = f"{guest.notes}\n{notes}" if guest.notes else notes
            
            db.session.commit()
            return guest.to_dict()
        except ValueError:
            raise
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to check out guest: {str(e)}")
    
    @staticmethod
    def update_guest(guest_id, data):
        """Update guest entry details"""
        try:
            guest = GuestList.query.get(guest_id)
            if not guest:
                raise ValueError(f"Guest entry with ID {guest_id} not found")
            
            # Update fields if provided
            if 'guestName' in data:
                guest.guest_name = data['guestName']
            if 'guestContact' in data:
                guest.guest_contact = data['guestContact']
            if 'guestEmail' in data:
                guest.guest_email = data['guestEmail']
            if 'guestCompany' in data:
                guest.guest_company = data['guestCompany']
            if 'meetingPerson' in data:
                guest.meeting_person = data['meetingPerson']
            if 'meetingPersonDepartment' in data:
                guest.meeting_person_department = data['meetingPersonDepartment']
            if 'meetingPersonContact' in data:
                guest.meeting_person_contact = data['meetingPersonContact']
            if 'visitDate' in data:
                guest.visit_date = datetime.strptime(data['visitDate'], '%Y-%m-%d').date() if isinstance(data['visitDate'], str) else data['visitDate']
            if 'visitTime' in data:
                if isinstance(data['visitTime'], str):
                    guest.visit_time = datetime.strptime(data['visitTime'], '%H:%M').time()
                else:
                    guest.visit_time = data['visitTime']
            if 'purpose' in data:
                guest.purpose = data['purpose']
            if 'vehicleNumber' in data:
                guest.vehicle_number = data['vehicleNumber']
            if 'idProofType' in data:
                guest.id_proof_type = data['idProofType']
            if 'idProofNumber' in data:
                guest.id_proof_number = data['idProofNumber']
            if 'notes' in data:
                guest.notes = data['notes']
            
            db.session.commit()
            return guest.to_dict()
        except ValueError:
            raise
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update guest: {str(e)}")
    
    @staticmethod
    def cancel_guest(guest_id, reason=None):
        """Cancel a guest visit"""
        try:
            guest = GuestList.query.get(guest_id)
            if not guest:
                raise ValueError(f"Guest entry with ID {guest_id} not found")
            
            if guest.status == GuestStatus.CHECKED_OUT:
                raise ValueError("Cannot cancel a visit that has already been completed")
            
            guest.status = GuestStatus.CANCELLED
            if reason:
                guest.notes = f"{guest.notes}\nCancellation Reason: {reason}" if guest.notes else f"Cancellation Reason: {reason}"
            
            db.session.commit()
            return guest.to_dict()
        except ValueError:
            raise
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to cancel guest: {str(e)}")
    
    @staticmethod
    def delete_guest(guest_id):
        """Delete a guest entry"""
        try:
            guest = GuestList.query.get(guest_id)
            if not guest:
                raise ValueError(f"Guest entry with ID {guest_id} not found")
            
            db.session.delete(guest)
            db.session.commit()
            return {'message': 'Guest entry deleted successfully'}
        except ValueError:
            raise
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to delete guest: {str(e)}")
    
    @staticmethod
    def get_guest_summary():
        """Get summary statistics for guest visits"""
        try:
            today = date.today()

            # Today's stats
            todays_scheduled = GuestList.query.filter(
                and_(GuestList.visit_date == today, GuestList.status == GuestStatus.SCHEDULED)
            ).count()

            todays_checked_in = GuestList.query.filter(
                and_(GuestList.visit_date == today, GuestList.status == GuestStatus.CHECKED_IN)
            ).count()

            todays_checked_out = GuestList.query.filter(
                and_(GuestList.visit_date == today, GuestList.status == GuestStatus.CHECKED_OUT)
            ).count()

            todays_cancelled = GuestList.query.filter(
                and_(GuestList.visit_date == today, GuestList.status == GuestStatus.CANCELLED)
            ).count()

            # Total stats
            total_scheduled = GuestList.query.filter(GuestList.status == GuestStatus.SCHEDULED).count()
            total_checked_in = GuestList.query.filter(GuestList.status == GuestStatus.CHECKED_IN).count()
            total_checked_out = GuestList.query.filter(GuestList.status == GuestStatus.CHECKED_OUT).count()

            return {
                'todayGuests': GuestList.query.count(),
                'checkedIn': total_checked_in,
                'scheduled': total_scheduled,
                'checkedOut': total_checked_out
            }
        except Exception as e:
            raise Exception(f"Failed to fetch guest summary: {str(e)}")
