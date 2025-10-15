"""
Guest List Model
Database model for visitor/guest management in security department
"""
from models import db
from datetime import datetime
import enum

class GuestStatus(enum.Enum):
    """Guest visit status enumeration"""
    SCHEDULED = 'scheduled'
    CHECKED_IN = 'checked_in'
    CHECKED_OUT = 'checked_out'
    CANCELLED = 'cancelled'

class GuestList(db.Model):
    """Guest List model for tracking visitors"""
    __tablename__ = 'guest_list'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    guest_name = db.Column(db.String(255), nullable=False)
    guest_contact = db.Column(db.String(20))
    guest_email = db.Column(db.String(255))
    guest_company = db.Column(db.String(255))
    meeting_person = db.Column(db.String(255), nullable=False)
    meeting_person_department = db.Column(db.String(100))
    meeting_person_contact = db.Column(db.String(20))
    visit_date = db.Column(db.Date, nullable=False)
    visit_time = db.Column(db.Time)
    purpose = db.Column(db.String(500), nullable=False)
    in_time = db.Column(db.DateTime)
    out_time = db.Column(db.DateTime)
    vehicle_number = db.Column(db.String(50))
    id_proof_type = db.Column(db.String(50))
    id_proof_number = db.Column(db.String(100))
    visitor_photo_path = db.Column(db.String(500))
    status = db.Column(db.Enum(GuestStatus), default=GuestStatus.SCHEDULED, nullable=False)
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert guest list entry to dictionary"""
        return {
            'id': self.id,
            'guestName': self.guest_name,
            'guestContact': self.guest_contact,
            'guestEmail': self.guest_email,
            'guestCompany': self.guest_company,
            'meetingPerson': self.meeting_person,
            'meetingPersonDepartment': self.meeting_person_department,
            'meetingPersonContact': self.meeting_person_contact,
            'visitDate': self.visit_date.isoformat() if self.visit_date else None,
            'visitTime': self.visit_time.strftime('%H:%M') if self.visit_time else None,
            'purpose': self.purpose,
            'inTime': self.in_time.isoformat() if self.in_time else None,
            'outTime': self.out_time.isoformat() if self.out_time else None,
            'vehicleNumber': self.vehicle_number,
            'idProofType': self.id_proof_type,
            'idProofNumber': self.id_proof_number,
            'visitorPhotoPath': self.visitor_photo_path,
            'status': self.status.value if isinstance(self.status, GuestStatus) else self.status,
            'notes': self.notes,
            'createdBy': self.created_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<GuestList {self.id}: {self.guest_name} visiting {self.meeting_person}>'