"""
Gate Entry Routes - Updated to use database
"""
from flask import Blueprint, request, jsonify, send_file
from datetime import date, datetime
from services.gate_entry_service_db import gate_entry_service_db
from services.attendance_integration_service import AttendanceIntegrationService
from utils.face_recognition_utils import recognize_face_from_database, is_face_recognition_available
from models.gate_entry import GateUser
import pandas as pd
from io import BytesIO

gate_entry_bp = Blueprint('gate_entry', __name__)
attendance_service = AttendanceIntegrationService()


@gate_entry_bp.route('/gate-entry/register', methods=['POST'])
def register_user():
    """Register a new user"""
    data = request.get_json() or {}
    name = data.get('name')
    phone = data.get('phone')
    photos = data.get('photos')  # array of base64 images
    face_encoding = data.get('face_encoding')

    if not name or not phone:
        return jsonify({'success': False, 'message': 'Name and phone are required'}), 400

    result = gate_entry_service_db.register_user(name, phone, photos, face_encoding)

    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400


@gate_entry_bp.route('/gate-entry/users', methods=['GET'])
def get_users():
    """Get all registered users"""
    status = request.args.get('status')
    users = gate_entry_service_db.get_users(status=status)
    return jsonify(users)


@gate_entry_bp.route('/gate-entry/users/<phone>', methods=['GET'])
def get_user(phone):
    """Get user by phone"""
    user = gate_entry_service_db.get_user_by_phone(phone)
    if user:
        return jsonify(user.to_dict())
    else:
        return jsonify({'success': False, 'message': 'User not found'}), 404


@gate_entry_bp.route('/gate-entry/users/<phone>', methods=['PUT'])
def update_user(phone):
    """Update user information"""
    data = request.get_json() or {}
    result = gate_entry_service_db.update_user(phone, **data)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400


@gate_entry_bp.route('/gate-entry/users/<phone>', methods=['DELETE'])
def delete_user(phone):
    """Delete a user"""
    result = gate_entry_service_db.delete_user(phone)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 404


@gate_entry_bp.route('/gate-entry/manual-entry', methods=['POST'])
def manual_entry():
    """Record manual entry"""
    data = request.get_json() or {}
    phone = data.get('phone')
    details = data.get('details', '')
    override_cooling = data.get('override_cooling', False)
    
    if not phone:
        return jsonify({'success': False, 'message': 'Phone is required'}), 400
    
    result = gate_entry_service_db.manual_entry(phone, details, override_cooling)
    
    if result['success']:
        return jsonify(result)
    else:
        status_code = 400 if result.get('status') in ['COOLING', 'BLOCKED', 'ALREADY_INSIDE'] else 400
        return jsonify(result), status_code


@gate_entry_bp.route('/gate-entry/manual-exit', methods=['POST'])
def manual_exit():
    """Record manual exit"""
    data = request.get_json() or {}
    phone = data.get('phone')
    details = data.get('details', '')
    override_cooling = data.get('override_cooling', False)
    
    if not phone:
        return jsonify({'success': False, 'message': 'Phone is required'}), 400
    
    result = gate_entry_service_db.manual_exit(phone, details, override_cooling)
    
    if result['success']:
        return jsonify(result)
    else:
        status_code = 400 if result.get('status') in ['COOLING', 'NOT_INSIDE', 'ALREADY_EXITED'] else 400
        return jsonify(result), status_code


@gate_entry_bp.route('/gate-entry/going-out', methods=['POST'])
def going_out():
    """Record going out"""
    data = request.get_json() or {}
    phone = data.get('phone')
    reason_type = data.get('reason_type') or data.get('reason')  # Support both field names
    reason_details = data.get('reason_details') or data.get('details', '')
    
    if not phone or not reason_type:
        return jsonify({'success': False, 'message': 'Phone and reason are required'}), 400
    
    result = gate_entry_service_db.going_out(phone, reason_type, reason_details)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400


@gate_entry_bp.route('/gate-entry/coming-back', methods=['POST'])
def coming_back():
    """Record coming back"""
    data = request.get_json() or {}
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'success': False, 'message': 'Phone is required'}), 400
    
    result = gate_entry_service_db.coming_back(phone)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400


@gate_entry_bp.route('/gate-entry/logs', methods=['GET'])
def get_gate_logs():
    """Get gate entry logs"""
    limit = request.args.get('limit', 100, type=int)
    date_str = request.args.get('date')
    
    date_filter = None
    if date_str:
        try:
            date_filter = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    logs = gate_entry_service_db.get_gate_logs(limit=limit, date_filter=date_filter)
    return jsonify(logs)


@gate_entry_bp.route('/gate-entry/going-out-logs', methods=['GET'])
def get_going_out_logs():
    """Get going out logs"""
    limit = request.args.get('limit', 100, type=int)
    date_str = request.args.get('date')
    status = request.args.get('status')
    
    date_filter = None
    if date_str:
        try:
            date_filter = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    logs = gate_entry_service_db.get_going_out_logs(limit=limit, date_filter=date_filter, status=status)
    return jsonify(logs)


@gate_entry_bp.route('/gate-entry/today-logs', methods=['GET'])
def get_today_logs():
    """Get today's summary"""
    summary = gate_entry_service_db.get_today_logs()
    return jsonify(summary)


@gate_entry_bp.route('/gate-entry/export-logs', methods=['GET'])
def export_gate_logs():
    """Export gate logs to Excel"""
    try:
        # Get parameters
        date_str = request.args.get('date')
        log_type = request.args.get('type', 'all')  # all, entry, going_out
        
        date_filter = None
        if date_str:
            try:
                date_filter = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Create Excel file in memory
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Export Gate Entry/Exit Logs
            if log_type in ['all', 'entry']:
                gate_logs = gate_entry_service_db.get_gate_logs(limit=10000, date_filter=date_filter)
                if gate_logs:
                    df_gate = pd.DataFrame(gate_logs)
                    # Reorder and rename columns for better readability
                    column_mapping = {
                        'userName': 'Name',
                        'userPhone': 'Phone',
                        'action': 'Action',
                        'method': 'Method',
                        'status': 'Status',
                        'timestamp': 'Timestamp',
                        'entryTime': 'Entry Time',
                        'exitTime': 'Exit Time',
                        'details': 'Details'
                    }
                    df_gate = df_gate.rename(columns=column_mapping)
                    # Select only relevant columns
                    columns_to_export = ['Name', 'Phone', 'Action', 'Method', 'Status', 'Timestamp', 'Entry Time', 'Exit Time', 'Details']
                    df_gate = df_gate[[col for col in columns_to_export if col in df_gate.columns]]
                    df_gate.to_excel(writer, sheet_name='Gate Entry Logs', index=False)
            
            # Export Going Out Logs
            if log_type in ['all', 'going_out']:
                going_out_logs = gate_entry_service_db.get_going_out_logs(limit=10000, date_filter=date_filter)
                if going_out_logs:
                    df_going_out = pd.DataFrame(going_out_logs)
                    # Reorder and rename columns
                    column_mapping = {
                        'userName': 'Name',
                        'userPhone': 'Phone',
                        'reasonType': 'Reason Type',
                        'reasonDetails': 'Reason Details',
                        'goingOutTime': 'Going Out Time',
                        'comingBackTime': 'Coming Back Time',
                        'durationMinutes': 'Duration (Minutes)',
                        'status': 'Status'
                    }
                    df_going_out = df_going_out.rename(columns=column_mapping)
                    # Select only relevant columns
                    columns_to_export = ['Name', 'Phone', 'Reason Type', 'Reason Details', 'Going Out Time', 'Coming Back Time', 'Duration (Minutes)', 'Status']
                    df_going_out = df_going_out[[col for col in columns_to_export if col in df_going_out.columns]]
                    df_going_out.to_excel(writer, sheet_name='Going Out Logs', index=False)
        
        output.seek(0)
        
        # Generate filename
        filename = f"gate_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        if date_filter:
            filename = f"gate_logs_{date_filter.strftime('%Y%m%d')}.xlsx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error exporting logs: {str(e)}'}), 500


@gate_entry_bp.route('/gate-entry/user-history/<phone>', methods=['GET'])
def get_user_history(phone):
    """Get user's gate entry history"""
    days = request.args.get('days', 30, type=int)
    result = gate_entry_service_db.get_user_history(phone, days)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 404


@gate_entry_bp.route('/gate-entry/status/<phone>', methods=['GET'])
def get_user_status(phone):
    """Get user's current status"""
    user = gate_entry_service_db.get_user_by_phone(phone)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    user_status, has_exited_today, last_action_time = gate_entry_service_db.get_user_status_and_history(user)
    going_out_status, reason_type, going_out_time = gate_entry_service_db.get_going_out_status(user)
    
    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'gate_status': user_status,
        'has_exited_today': has_exited_today,
        'last_action_time': last_action_time.isoformat() if last_action_time else None,
        'going_out_status': going_out_status,
        'going_out_reason': reason_type,
        'going_out_time': going_out_time.isoformat() if going_out_time else None
    })


@gate_entry_bp.route('/gate-entry/recognize-face', methods=['POST'])
def recognize_face():
    """Recognize face from photo and perform entry/exit"""
    if not is_face_recognition_available():
        return jsonify({
            'success': False,
            'message': 'Face recognition is not available. Please install opencv-python.'
        }), 503
    
    data = request.get_json() or {}
    photo = data.get('photo')
    action = data.get('action', 'entry')  # 'entry' or 'exit'
    
    if not photo:
        return jsonify({'success': False, 'message': 'Photo is required'}), 400
    
    try:
        # Get all users with face encodings
        users = GateUser.query.filter(GateUser.face_encoding.isnot(None)).all()
        
        if not users:
            return jsonify({
                'success': False,
                'message': 'No registered faces in database. Please register users first.'
            }), 404
        
        # Build dictionary of face encodings
        known_faces = {user.id: user.face_encoding for user in users}
        
        # Recognize face
        result = recognize_face_from_database(photo, known_faces)
        
        if not result['success']:
            return jsonify(result), 400
        
        if not result['recognized']:
            return jsonify({
                'success': False,
                'recognized': False,
                'message': 'Face not recognized. Please try again or use manual entry.'
            }), 404
        
        # Get user details
        user = GateUser.query.get(result['user_id'])
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Perform entry or exit
        if action == 'entry':
            entry_result = gate_entry_service_db.manual_entry(
                user.phone, 
                f"Face recognition entry (confidence: {(1-result['distance'])*100:.1f}%)",
                override_cooling=False
            )
        else:
            entry_result = gate_entry_service_db.manual_exit(
                user.phone,
                f"Face recognition exit (confidence: {(1-result['distance'])*100:.1f}%)",
                override_cooling=False
            )
        
        if entry_result['success']:
            return jsonify({
                'success': True,
                'recognized': True,
                'user': user.to_dict(),
                'action': action,
                'distance': result['distance'],
                'confidence': f"{(1-result['distance'])*100:.1f}%",
                'message': f"{action.capitalize()} recorded for {user.name}"
            })
        else:
            return jsonify({
                'success': False,
                'recognized': True,
                'user': user.to_dict(),
                'message': entry_result['message']
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error recognizing face: {str(e)}'
        }), 500


@gate_entry_bp.route('/gate-entry/face-recognition-status', methods=['GET'])
def face_recognition_status():
    """Check if face recognition is available"""
    available = is_face_recognition_available()
    
    if available:
        # Count users with face encodings
        users_with_faces = GateUser.query.filter(GateUser.face_encoding.isnot(None)).count()
        total_users = GateUser.query.count()
        return jsonify({
            'success': True,
            'available': True,
            'users_with_faces': users_with_faces,
            'total_users': total_users,
            'message': f'Face recognition (OpenCV) is available. {users_with_faces}/{total_users} users have face encodings.'
        })
    else:
        return jsonify({
            'success': True,
            'available': False,
            'message': 'Face recognition library is not installed. Install with: pip install opencv-python'
        })


@gate_entry_bp.route('/gate-entry/verify-employee/<phone>', methods=['GET'])
def verify_employee(phone):
    """Verify if a phone number belongs to an active employee"""
    result = attendance_service.verify_employee_status(phone)
    return jsonify(result)


@gate_entry_bp.route('/gate-entry/attendance-status/<phone>', methods=['GET'])
def get_attendance_status(phone):
    """Get today's attendance status for an employee by phone"""
    from models.hr import Employee, Attendance
    from datetime import date
    
    employee = Employee.query.filter_by(phone=phone).first()
    
    if not employee:
        return jsonify({
            'success': False,
            'is_employee': False,
            'message': 'Not an employee'
        }), 404
    
    today = date.today()
    attendance = Attendance.query.filter(
        Attendance.employee_id == employee.id,
        Attendance.date == today
    ).first()
    
    if attendance:
        return jsonify({
            'success': True,
            'is_employee': True,
            'employee_id': employee.id,
            'employee_name': employee.full_name,
            'employee_status': employee.status,
            'attendance': attendance.to_dict()
        })
    else:
        return jsonify({
            'success': True,
            'is_employee': True,
            'employee_id': employee.id,
            'employee_name': employee.full_name,
            'employee_status': employee.status,
            'attendance': None,
            'message': 'No attendance marked for today'
        }) 