"""
Gate Entry Service - Database Implementation
Replaces Excel-based storage with MySQL database
"""
import json
import logging
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.exc import SQLAlchemyError

from models import db
from models.gate_entry import GateUser, GateEntryLog, GoingOutLog, GateEntrySession
from utils.face_recognition_utils import generate_face_encoding, recognize_face_from_database, is_face_recognition_available
from services.attendance_integration_service import AttendanceIntegrationService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
COOLING_PERIOD_SECONDS = 120  # 2 minutes


class GateEntryServiceDB:
    """Database-based gate entry service"""
    
    def __init__(self):
        """Initialize gate entry service with attendance integration"""
        self.attendance_service = AttendanceIntegrationService()
    
    def register_user(self, name: str, phone: str, photos: list = None, face_encoding: str = None) -> Dict:
        """Register a new user for gate entry system (multi-photo)"""
        try:
            # Check if user already exists
            existing_user = GateUser.query.filter_by(phone=phone).first()
            if existing_user:
                return {
                    'success': False,
                    'message': 'User with this phone number already exists'
                }
            encodings = []
            # Generate face encodings from all photos
            if photos and is_face_recognition_available():
                logger.info(f"Generating face encodings for {name}...")
                for photo in photos:
                    encoding_result = generate_face_encoding(photo)
                    if encoding_result['success']:
                        encodings.append(encoding_result['encoding'])
                    else:
                        logger.warning(f"Face encoding failed for {name}: {encoding_result['message']}")
            # Store all encodings as JSON array
            face_encoding = json.dumps(encodings) if encodings else None
            # Store first photo for reference
            photo = photos[0] if photos else None
            # Create new user
            new_user = GateUser(
                name=name,
                phone=phone,
                photo=photo,
                face_encoding=face_encoding,
                status='active'
            )
            db.session.add(new_user)
            db.session.commit()
            has_face_encoding = bool(encodings)
            logger.info(f"New user registered: {name} ({phone}) - Face encodings: {len(encodings)}")
            return {
                'success': True,
                'message': f'User {name} registered successfully' + (f' with {len(encodings)} face images' if has_face_encoding else ''),
                'user_id': new_user.id,
                'user': new_user.to_dict(),
                'has_face_encoding': has_face_encoding
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error registering user: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error registering user: {e}")
            return {
                'success': False,
                'message': f'Error registering user: {str(e)}'
            }
    
    def get_users(self, status: str = None) -> List[Dict]:
        """Get all registered users"""
        try:
            query = GateUser.query
            
            if status:
                query = query.filter_by(status=status)
            
            users = query.order_by(GateUser.name).all()
            return [user.to_dict() for user in users]
            
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            return []
    
    def get_user_by_phone(self, phone: str) -> Optional[GateUser]:
        """Get user by phone number"""
        try:
            return GateUser.query.filter_by(phone=phone).first()
        except Exception as e:
            logger.error(f"Error getting user by phone: {e}")
            return None
    
    def get_user_by_id(self, user_id: int) -> Optional[GateUser]:
        """Get user by ID"""
        try:
            return GateUser.query.get(user_id)
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    def update_user(self, phone: str, **kwargs) -> Dict:
        """Update user information"""
        try:
            user = self.get_user_by_phone(phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found'
                }
            
            # Update allowed fields
            allowed_fields = ['name', 'photo', 'face_encoding', 'status']
            for field in allowed_fields:
                if field in kwargs:
                    setattr(user, field, kwargs[field])
            
            db.session.commit()
            
            logger.info(f"User updated: {phone}")
            return {
                'success': True,
                'message': 'User updated successfully',
                'user': user.to_dict()
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error updating user: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user: {e}")
            return {
                'success': False,
                'message': f'Error updating user: {str(e)}'
            }
    
    def delete_user(self, phone: str) -> Dict:
        """Delete a user from the system"""
        try:
            user = self.get_user_by_phone(phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found'
                }
            
            # Manually delete related records to avoid FK constraint violations
            GateEntrySession.query.filter_by(user_id=user.id).delete()
            GoingOutLog.query.filter_by(user_id=user.id).delete()
            GateEntryLog.query.filter_by(user_id=user.id).delete()
            
            # Now delete the user
            db.session.delete(user)
            db.session.commit()
            
            logger.info(f"User deleted: {phone}")
            return {
                'success': True,
                'message': 'User deleted successfully'
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error deleting user: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting user: {e}")
            return {
                'success': False,
                'message': f'Error deleting user: {str(e)}'
            }
    
    def get_user_status_and_history(self, user: GateUser) -> tuple:
        """
        Check user status and return (status, has_exited_today, last_action_time)
        Status can be: INSIDE, OUTSIDE, EXITED_TODAY
        """
        try:
            today = date.today()
            
            # Get today's session
            session = GateEntrySession.query.filter(
                and_(
                    GateEntrySession.user_id == user.id,
                    GateEntrySession.date == today
                )
            ).first()
            
            if not session:
                return "OUTSIDE", False, None
            
            last_action_time = session.last_action_time
            
            if session.status == 'inside':
                has_exited = session.exit_time is not None
                return "INSIDE", has_exited, last_action_time
            elif session.status == 'exited':
                return "EXITED_TODAY", True, last_action_time
            else:
                return "OUTSIDE", False, last_action_time
                
        except Exception as e:
            logger.error(f"Error getting user status: {e}")
            return "OUTSIDE", False, None
    
    def get_going_out_status(self, user: GateUser) -> tuple:
        """
        Check if user is currently out for work/personal reasons
        Returns: (status, reason_type, going_out_time)
        Status can be: OUT, IN_OFFICE
        """
        try:
            today = date.today()
            
            # Find open going out entry for today
            going_out = GoingOutLog.query.filter(
                and_(
                    GoingOutLog.user_id == user.id,
                    GoingOutLog.status == 'out',
                    func.date(GoingOutLog.going_out_time) == today
                )
            ).order_by(desc(GoingOutLog.going_out_time)).first()
            
            if going_out:
                return "OUT", going_out.reason_type, going_out.going_out_time
            
            return "IN_OFFICE", None, None
            
        except Exception as e:
            logger.error(f"Error getting going out status: {e}")
            return "IN_OFFICE", None, None
    
    def manual_entry(self, user_phone: str, details: str = "", override_cooling: bool = False) -> Dict:
        """Record manual entry for a user"""
        try:
            # Get user
            user = self.get_user_by_phone(user_phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }
            
            now = datetime.now()
            today = now.date()
            
            # Check user status
            user_status, has_exited_today, last_action_time = self.get_user_status_and_history(user)
            
            # Check cooling period
            if not override_cooling and last_action_time:
                time_since_last = (now - last_action_time).total_seconds()
                if time_since_last < COOLING_PERIOD_SECONDS:
                    remaining = int(COOLING_PERIOD_SECONDS - time_since_last)
                    minutes = remaining // 60
                    seconds = remaining % 60
                    return {
                        'success': False,
                        'message': f'Cooling period active. Please wait {minutes}m {seconds}s',
                        'status': 'COOLING',
                        'remaining_seconds': remaining
                    }
            
            # Check if user can enter
            if user_status == "EXITED_TODAY":
                return {
                    'success': False,
                    'message': 'User has already exited today. Cannot re-enter.',
                    'status': 'BLOCKED'
                }
            
            if user_status == "INSIDE":
                return {
                    'success': False,
                    'message': 'User is already inside.',
                    'status': 'ALREADY_INSIDE'
                }
            
            # Create or update session
            session = GateEntrySession.query.filter(
                and_(
                    GateEntrySession.user_id == user.id,
                    GateEntrySession.date == today
                )
            ).first()
            
            if not session:
                session = GateEntrySession(
                    user_id=user.id,
                    user_name=user.name,
                    user_phone=user.phone,
                    date=today,
                    entry_time=now,
                    status='inside',
                    last_action_time=now
                )
                db.session.add(session)
            else:
                session.entry_time = now
                session.status = 'inside'
                session.last_action_time = now
            
            # Create entry log
            entry_log = GateEntryLog(
                user_id=user.id,
                user_name=user.name,
                user_phone=user.phone,
                action='entry',
                method='manual',
                details=details,
                status='completed',
                entry_time=now,
                override_cooling=override_cooling,
                timestamp=now
            )
            db.session.add(entry_log)
            
            # Update user's last entry
            user.last_entry = now
            
            db.session.commit()
            
            logger.info(f"Manual entry recorded for {user.name}")
            
            # Mark attendance if user is an active employee
            attendance_result = self.attendance_service.mark_attendance_on_entry(user.phone, now)
            
            response = {
                'success': True,
                'message': f'Entry recorded for {user.name}',
                'user_name': user.name,
                'status': 'ENTRY',
                'timestamp': now.isoformat(),
                'attendance': attendance_result
            }
            
            # Add attendance info to message if applicable
            if attendance_result.get('is_employee') and attendance_result.get('success'):
                response['message'] += f" - Attendance marked"
            
            return response
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error recording entry: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording manual entry: {e}")
            return {
                'success': False,
                'message': f'Error recording entry: {str(e)}'
            }
    
    def manual_exit(self, user_phone: str, details: str = "", override_cooling: bool = False) -> Dict:
        """Record manual exit for a user"""
        try:
            # Get user
            user = self.get_user_by_phone(user_phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }
            
            now = datetime.now()
            today = now.date()
            
            # Check user status
            user_status, has_exited_today, last_action_time = self.get_user_status_and_history(user)
            
            # Check cooling period
            if not override_cooling and last_action_time:
                time_since_last = (now - last_action_time).total_seconds()
                if time_since_last < COOLING_PERIOD_SECONDS:
                    remaining = int(COOLING_PERIOD_SECONDS - time_since_last)
                    minutes = remaining // 60
                    seconds = remaining % 60
                    return {
                        'success': False,
                        'message': f'Cooling period active. Please wait {minutes}m {seconds}s',
                        'status': 'COOLING',
                        'remaining_seconds': remaining
                    }
            
            # Check if user can exit
            if user_status == "OUTSIDE":
                return {
                    'success': False,
                    'message': 'User is not inside. Cannot exit.',
                    'status': 'NOT_INSIDE'
                }
            
            if user_status == "EXITED_TODAY":
                return {
                    'success': False,
                    'message': 'User has already exited today.',
                    'status': 'ALREADY_EXITED'
                }
            
            # Update session
            session = GateEntrySession.query.filter(
                and_(
                    GateEntrySession.user_id == user.id,
                    GateEntrySession.date == today
                )
            ).first()
            
            if session:
                session.exit_time = now
                session.status = 'exited'
                session.last_action_time = now
            else:
                # Create session with exit only (edge case)
                session = GateEntrySession(
                    user_id=user.id,
                    user_name=user.name,
                    user_phone=user.phone,
                    date=today,
                    exit_time=now,
                    status='exited',
                    last_action_time=now
                )
                db.session.add(session)
            
            # Create exit log
            exit_log = GateEntryLog(
                user_id=user.id,
                user_name=user.name,
                user_phone=user.phone,
                action='exit',
                method='manual',
                details=details,
                status='completed',
                exit_time=now,
                override_cooling=override_cooling,
                timestamp=now
            )
            db.session.add(exit_log)
            
            # Update user's last exit
            user.last_exit = now
            
            db.session.commit()
            
            logger.info(f"Manual exit recorded for {user.name}")
            
            # Mark checkout if user is an active employee
            checkout_result = self.attendance_service.mark_checkout_on_exit(user.phone, now)
            
            response = {
                'success': True,
                'message': f'Exit recorded for {user.name}',
                'user_name': user.name,
                'status': 'EXIT',
                'timestamp': now.isoformat(),
                'attendance': checkout_result
            }
            
            # Add checkout info to message if applicable
            if checkout_result.get('is_employee') and checkout_result.get('success'):
                hours = checkout_result.get('hours_worked', 0)
                response['message'] += f" - Checkout marked ({hours}h worked)" if hours else " - Checkout marked"
            
            return response
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error recording exit: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording manual exit: {e}")
            return {
                'success': False,
                'message': f'Error recording exit: {str(e)}'
            }
    
    def going_out(self, user_phone: str, reason_type: str, reason_details: str = "") -> Dict:
        """Record going out for a user"""
        try:
            # Get user
            user = self.get_user_by_phone(user_phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }
            
            # Check if user is already out
            going_out_status, current_reason, _ = self.get_going_out_status(user)
            if going_out_status == "OUT":
                return {
                    'success': False,
                    'message': f'User is already out for {current_reason}'
                }
            
            now = datetime.now()
            
            # Create going out log
            going_out_log = GoingOutLog(
                user_id=user.id,
                user_name=user.name,
                user_phone=user.phone,
                reason_type=reason_type,
                reason_details=reason_details,
                going_out_time=now,
                status='out'
            )
            db.session.add(going_out_log)
            db.session.commit()
            
            logger.info(f"Going out recorded for {user.name} - {reason_type}")
            return {
                'success': True,
                'message': f'Going out recorded for {user.name}',
                'user_name': user.name,
                'reason_type': reason_type,
                'timestamp': now.isoformat()
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error recording going out: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording going out: {e}")
            return {
                'success': False,
                'message': f'Error recording going out: {str(e)}'
            }
    
    def coming_back(self, user_phone: str) -> Dict:
        """Record coming back for a user"""
        try:
            # Get user
            user = self.get_user_by_phone(user_phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found. Please register first.'
                }
            
            # Check if user is out
            going_out_status, current_reason, going_out_time = self.get_going_out_status(user)
            if going_out_status != "OUT":
                return {
                    'success': False,
                    'message': 'User is not currently out'
                }
            
            now = datetime.now()
            today = date.today()
            
            # Find the open going out log
            going_out_log = GoingOutLog.query.filter(
                and_(
                    GoingOutLog.user_id == user.id,
                    GoingOutLog.status == 'out',
                    func.date(GoingOutLog.going_out_time) == today
                )
            ).order_by(desc(GoingOutLog.going_out_time)).first()
            
            if not going_out_log:
                return {
                    'success': False,
                    'message': 'No going out record found'
                }
            
            # Update going out log
            going_out_log.coming_back_time = now
            going_out_log.status = 'returned'
            
            # Calculate duration
            duration = (now - going_out_log.going_out_time).total_seconds() / 60
            going_out_log.duration_minutes = round(duration, 1)
            
            db.session.commit()
            
            logger.info(f"Coming back recorded for {user.name}")
            return {
                'success': True,
                'message': f'Welcome back, {user.name}',
                'user_name': user.name,
                'duration_minutes': going_out_log.duration_minutes,
                'timestamp': now.isoformat()
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error recording coming back: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error recording coming back: {e}")
            return {
                'success': False,
                'message': f'Error recording return: {str(e)}'
            }
    
    def get_gate_logs(self, limit: int = 100, date_filter: date = None) -> List[Dict]:
        """Get gate entry logs"""
        try:
            query = GateEntryLog.query
            
            if date_filter:
                query = query.filter(func.date(GateEntryLog.timestamp) == date_filter)
            
            logs = query.order_by(desc(GateEntryLog.timestamp)).limit(limit).all()
            return [log.to_dict() for log in logs]
            
        except Exception as e:
            logger.error(f"Error getting gate logs: {e}")
            return []
    
    def get_going_out_logs(self, limit: int = 100, date_filter: date = None, status: str = None) -> List[Dict]:
        """Get going out logs"""
        try:
            query = GoingOutLog.query
            
            if date_filter:
                query = query.filter(func.date(GoingOutLog.going_out_time) == date_filter)
            
            if status:
                query = query.filter_by(status=status)
            
            logs = query.order_by(desc(GoingOutLog.going_out_time)).limit(limit).all()
            return [log.to_dict() for log in logs]
            
        except Exception as e:
            logger.error(f"Error getting going out logs: {e}")
            return []
    
    def get_today_logs(self) -> Dict:
        """Get summary of today's gate activities"""
        try:
            today = date.today()
            
            # Get today's sessions
            sessions = GateEntrySession.query.filter_by(date=today).all()
            
            total_entries = sum(1 for s in sessions if s.entry_time)
            total_exits = sum(1 for s in sessions if s.exit_time)
            currently_inside = sum(1 for s in sessions if s.status == 'inside')
            
            # Get going out logs
            going_out_logs = GoingOutLog.query.filter(
                func.date(GoingOutLog.going_out_time) == today
            ).all()
            
            currently_out = sum(1 for log in going_out_logs if log.status == 'out')
            
            return {
                'date': today.isoformat(),
                'total_entries': total_entries,
                'total_exits': total_exits,
                'currently_inside': currently_inside,
                'currently_out': currently_out,
                'sessions': [s.to_dict() for s in sessions],
                'going_out_logs': [log.to_dict() for log in going_out_logs]
            }
            
        except Exception as e:
            logger.error(f"Error getting today's logs: {e}")
            return {
                'date': date.today().isoformat(),
                'total_entries': 0,
                'total_exits': 0,
                'currently_inside': 0,
                'currently_out': 0,
                'sessions': [],
                'going_out_logs': []
            }
    
    def get_user_history(self, user_phone: str, days: int = 30) -> Dict:
        """Get user's gate entry history"""
        try:
            user = self.get_user_by_phone(user_phone)
            if not user:
                return {
                    'success': False,
                    'message': 'User not found'
                }
            
            start_date = date.today() - timedelta(days=days)
            
            # Get sessions
            sessions = GateEntrySession.query.filter(
                and_(
                    GateEntrySession.user_id == user.id,
                    GateEntrySession.date >= start_date
                )
            ).order_by(desc(GateEntrySession.date)).all()
            
            # Get logs
            logs = GateEntryLog.query.filter(
                and_(
                    GateEntryLog.user_id == user.id,
                    GateEntryLog.timestamp >= datetime.combine(start_date, datetime.min.time())
                )
            ).order_by(desc(GateEntryLog.timestamp)).all()
            
            # Get going out logs
            going_out_logs = GoingOutLog.query.filter(
                and_(
                    GoingOutLog.user_id == user.id,
                    GoingOutLog.going_out_time >= datetime.combine(start_date, datetime.min.time())
                )
            ).order_by(desc(GoingOutLog.going_out_time)).all()
            
            return {
                'success': True,
                'user': user.to_dict(),
                'sessions': [s.to_dict() for s in sessions],
                'logs': [log.to_dict() for log in logs],
                'going_out_logs': [log.to_dict() for log in going_out_logs]
            }
            
        except Exception as e:
            logger.error(f"Error getting user history: {e}")
            return {
                'success': False,
                'message': f'Error getting history: {str(e)}'
            }


# Create singleton instance
gate_entry_service_db = GateEntryServiceDB()