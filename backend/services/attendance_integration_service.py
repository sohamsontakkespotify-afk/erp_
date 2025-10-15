"""
Attendance Integration Service
Links gate entry system with HR attendance tracking
"""
import logging
from datetime import datetime, date, time
from typing import Dict, Optional
from sqlalchemy.exc import SQLAlchemyError

from models import db
from models.hr import Employee, Attendance, AttendanceStatus

logger = logging.getLogger(__name__)


class AttendanceIntegrationService:
    """Service to integrate gate entry with attendance tracking"""
    
    def mark_attendance_on_entry(self, phone: str, entry_time: datetime) -> Dict:
        """
        Mark attendance when an employee enters through the gate
        
        Args:
            phone: Employee phone number (unique identifier)
            entry_time: Time of gate entry
            
        Returns:
            Dict with success status and message
        """
        try:
            # Find employee by phone number
            employee = Employee.query.filter_by(phone=phone).first()
            
            if not employee:
                logger.info(f"No employee found with phone {phone} - skipping attendance")
                return {
                    'success': False,
                    'message': 'Not an employee - attendance not marked',
                    'is_employee': False
                }
            
            # Check if employee is active
            if employee.status.lower() != 'active':
                logger.warning(f"Employee {employee.full_name} is not active (status: {employee.status})")
                return {
                    'success': False,
                    'message': f'Employee is {employee.status} - attendance not marked',
                    'is_employee': True,
                    'employee_status': employee.status
                }
            
            # Check if attendance already exists for today
            today = entry_time.date()
            existing_attendance = Attendance.query.filter(
                Attendance.employee_id == employee.id,
                Attendance.date == today
            ).first()
            
            if existing_attendance:
                # Set name if not already set
                if not existing_attendance.name:
                    existing_attendance.name = employee.full_name
                
                # Update check-in time if this is earlier
                if not existing_attendance.check_in_time or entry_time.time() < existing_attendance.check_in_time:
                    existing_attendance.check_in_time = entry_time.time()
                    existing_attendance.status = AttendanceStatus.PRESENT
                    db.session.commit()
                    
                    logger.info(f"Updated check-in time for {employee.full_name} to {entry_time.time()}")
                    return {
                        'success': True,
                        'message': f'Check-in time updated for {employee.full_name}',
                        'is_employee': True,
                        'employee_id': employee.id,
                        'employee_name': employee.full_name,
                        'attendance_id': existing_attendance.id,
                        'check_in_time': entry_time.time().strftime('%H:%M:%S'),
                        'action': 'updated'
                    }
                else:
                    logger.info(f"Attendance already marked for {employee.full_name}")
                    return {
                        'success': True,
                        'message': f'Attendance already marked for {employee.full_name}',
                        'is_employee': True,
                        'employee_id': employee.id,
                        'employee_name': employee.full_name,
                        'attendance_id': existing_attendance.id,
                        'check_in_time': existing_attendance.check_in_time.strftime('%H:%M:%S') if existing_attendance.check_in_time else None,
                        'action': 'already_marked'
                    }
            
            # Create new attendance record
            new_attendance = Attendance(
                employee_id=employee.id,
                name=employee.full_name,
                date=today,
                check_in_time=entry_time.time(),
                status=AttendanceStatus.PRESENT,
                notes=f'Auto-marked via gate entry at {entry_time.strftime("%H:%M:%S")}'
            )
            
            db.session.add(new_attendance)
            db.session.commit()
            
            logger.info(f"Attendance marked for {employee.full_name} at {entry_time.time()}")
            return {
                'success': True,
                'message': f'Attendance marked for {employee.full_name}',
                'is_employee': True,
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'attendance_id': new_attendance.id,
                'check_in_time': entry_time.time().strftime('%H:%M:%S'),
                'action': 'created'
            }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error marking attendance: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error marking attendance: {e}")
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }
    
    def mark_checkout_on_exit(self, phone: str, exit_time: datetime) -> Dict:
        """
        Mark checkout time when an employee exits through the gate
        
        Args:
            phone: Employee phone number
            exit_time: Time of gate exit
            
        Returns:
            Dict with success status and message
        """
        try:
            # Find employee by phone number
            employee = Employee.query.filter_by(phone=phone).first()
            
            if not employee:
                return {
                    'success': False,
                    'message': 'Not an employee - checkout not marked',
                    'is_employee': False
                }
            
            # Check if employee is active
            if employee.status.lower() != 'active':
                return {
                    'success': False,
                    'message': f'Employee is {employee.status} - checkout not marked',
                    'is_employee': True,
                    'employee_status': employee.status
                }
            
            # Find today's attendance record
            today = exit_time.date()
            attendance = Attendance.query.filter(
                Attendance.employee_id == employee.id,
                Attendance.date == today
            ).first()
            
            if not attendance:
                logger.warning(f"No attendance record found for {employee.full_name} on {today}")
                return {
                    'success': False,
                    'message': 'No check-in record found for today',
                    'is_employee': True,
                    'employee_id': employee.id,
                    'employee_name': employee.full_name
                }
            
            # Update checkout time
            if not attendance.check_out_time or exit_time.time() > attendance.check_out_time:
                attendance.check_out_time = exit_time.time()
                
                # Calculate hours worked if both check-in and check-out exist
                if attendance.check_in_time and attendance.check_out_time:
                    check_in_datetime = datetime.combine(today, attendance.check_in_time)
                    check_out_datetime = datetime.combine(today, attendance.check_out_time)
                    hours_worked = (check_out_datetime - check_in_datetime).total_seconds() / 3600
                    attendance.hours_worked = round(hours_worked, 2)
                
                db.session.commit()
                
                logger.info(f"Checkout time updated for {employee.full_name} to {exit_time.time()}")
                return {
                    'success': True,
                    'message': f'Checkout time updated for {employee.full_name}',
                    'is_employee': True,
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'attendance_id': attendance.id,
                    'check_out_time': exit_time.time().strftime('%H:%M:%S'),
                    'hours_worked': attendance.hours_worked
                }
            else:
                return {
                    'success': True,
                    'message': 'Checkout already recorded',
                    'is_employee': True,
                    'employee_id': employee.id,
                    'employee_name': employee.full_name,
                    'attendance_id': attendance.id,
                    'check_out_time': attendance.check_out_time.strftime('%H:%M:%S') if attendance.check_out_time else None
                }
            
        except SQLAlchemyError as e:
            db.session.rollback()
            logger.error(f"Database error marking checkout: {e}")
            return {
                'success': False,
                'message': f'Database error: {str(e)}'
            }
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error marking checkout: {e}")
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }
    
    def verify_employee_status(self, phone: str) -> Dict:
        """
        Verify if a phone number belongs to an active employee
        
        Args:
            phone: Phone number to verify
            
        Returns:
            Dict with verification status
        """
        try:
            employee = Employee.query.filter_by(phone=phone).first()
            
            if not employee:
                return {
                    'is_employee': False,
                    'can_mark_attendance': False,
                    'message': 'Not an employee'
                }
            
            is_active = employee.status.lower() == 'active'
            
            return {
                'is_employee': True,
                'can_mark_attendance': is_active,
                'employee_id': employee.id,
                'employee_name': employee.full_name,
                'employee_status': employee.status,
                'department': employee.department,
                'designation': employee.designation,
                'message': 'Active employee' if is_active else f'Employee is {employee.status}'
            }
            
        except Exception as e:
            logger.error(f"Error verifying employee status: {e}")
            return {
                'is_employee': False,
                'can_mark_attendance': False,
                'message': f'Error: {str(e)}'
            }