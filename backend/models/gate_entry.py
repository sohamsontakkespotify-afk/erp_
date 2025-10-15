"""
Gate Entry System Models
"""
from datetime import datetime
from models import db

class GateUser(db.Model):
    """Model for registered gate entry users"""
    __tablename__ = 'gate_users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    photo = db.Column(db.Text, nullable=True)  # Base64 encoded photo
    face_encoding = db.Column(db.Text, nullable=True)  # Serialized face encodings (JSON array)
    status = db.Column(db.String(50), default='active')  # active, inactive, blocked
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_entry = db.Column(db.DateTime, nullable=True)
    last_exit = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    gate_logs = db.relationship('GateEntryLog', backref='user', lazy='dynamic')
    going_out_logs = db.relationship('GoingOutLog', backref='user', lazy='dynamic')
    sessions = db.relationship('GateEntrySession', backref='user', lazy='dynamic')
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'photo': self.photo,
            'status': self.status,
            'registeredAt': self.registered_at.isoformat() if self.registered_at else None,
            'lastEntry': self.last_entry.isoformat() if self.last_entry else None,
            'lastExit': self.last_exit.isoformat() if self.last_exit else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class GateEntryLog(db.Model):
    """Model for gate entry/exit logs"""
    __tablename__ = 'gate_entry_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('gate_users.id'), nullable=False, index=True)
    user_name = db.Column(db.String(200), nullable=False)
    user_phone = db.Column(db.String(20), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False)  # entry, exit
    method = db.Column(db.String(50), default='manual')  # manual, face_recognition, override
    details = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='completed')  # completed, blocked, cooling
    entry_time = db.Column(db.DateTime, nullable=True)
    exit_time = db.Column(db.DateTime, nullable=True)
    override_cooling = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': self.user_name,
            'userPhone': self.user_phone,
            'action': self.action,
            'method': self.method,
            'details': self.details,
            'status': self.status,
            'entryTime': self.entry_time.isoformat() if self.entry_time else None,
            'exitTime': self.exit_time.isoformat() if self.exit_time else None,
            'overrideCooling': self.override_cooling,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class GoingOutLog(db.Model):
    """Model for going out/coming back logs"""
    __tablename__ = 'going_out_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('gate_users.id'), nullable=False, index=True)
    user_name = db.Column(db.String(200), nullable=False)
    user_phone = db.Column(db.String(20), nullable=False, index=True)
    reason_type = db.Column(db.String(100), nullable=False)  # Office Work, Personal Work, Lunch, etc.
    reason_details = db.Column(db.Text, nullable=True)
    going_out_time = db.Column(db.DateTime, nullable=False, index=True)
    coming_back_time = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(50), default='out')  # out, returned
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': self.user_name,
            'userPhone': self.user_phone,
            'reasonType': self.reason_type,
            'reasonDetails': self.reason_details,
            'goingOutTime': self.going_out_time.isoformat() if self.going_out_time else None,
            'comingBackTime': self.coming_back_time.isoformat() if self.coming_back_time else None,
            'durationMinutes': self.duration_minutes,
            'status': self.status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }


class GateEntrySession(db.Model):
    """Model for tracking daily entry/exit sessions"""
    __tablename__ = 'gate_entry_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('gate_users.id'), nullable=False, index=True)
    user_name = db.Column(db.String(200), nullable=False)
    user_phone = db.Column(db.String(20), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    entry_time = db.Column(db.DateTime, nullable=True)
    exit_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='inside')  # inside, exited, blocked
    last_action_time = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Composite index for efficient queries
    __table_args__ = (
        db.Index('idx_user_date', 'user_id', 'date'),
    )
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'userName': self.user_name,
            'userPhone': self.user_phone,
            'date': self.date.isoformat() if self.date else None,
            'entryTime': self.entry_time.isoformat() if self.entry_time else None,
            'exitTime': self.exit_time.isoformat() if self.exit_time else None,
            'status': self.status,
            'lastActionTime': self.last_action_time.isoformat() if self.last_action_time else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
