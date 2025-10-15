"""
Watchman Routes Module
API endpoints for watchman operations (gate security)
"""
from flask import Blueprint, request, jsonify
from services.watchman_service import WatchmanService
from services.guest_list_service import GuestListService

watchman_bp = Blueprint('watchman', __name__)


@watchman_bp.route('/watchman/pending-pickups', methods=['GET'])
def get_pending_pickups():
    """Get all pending customer pickups waiting for verification"""
    try:
        pickups = WatchmanService.get_pending_pickups()
        return jsonify(pickups), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/gate-passes', methods=['GET'])
def get_all_gate_passes():
    """Get all gate passes (completed and pending)"""
    try:
        passes = WatchmanService.get_all_gate_passes()
        return jsonify(passes), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/verify/<int:gate_pass_id>', methods=['POST'])
def verify_customer_pickup(gate_pass_id):
    """Verify customer identity and complete pickup or send in"""
    try:
        data = request.get_json() or {}
        action = data.get('action', 'release')  # Default to 'release' for backward compatibility
        result = WatchmanService.verify_customer_identity(gate_pass_id, data, action)

        # Handle identity mismatch case
        if result.get('status') == 'identity_mismatch':
            return jsonify(result), 409  # Conflict status code

        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/reject/<int:gate_pass_id>', methods=['POST'])
def reject_customer_pickup(gate_pass_id):
    """Reject customer pickup for security reasons"""
    try:
        data = request.get_json() or {}
        rejection_reason = data.get('rejectionReason', 'No reason provided')
        
        result = WatchmanService.reject_pickup(gate_pass_id, rejection_reason)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/summary', methods=['GET'])
def get_daily_summary():
    """Get daily summary of watchman activities"""
    try:
        summary = WatchmanService.get_daily_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/search', methods=['GET'])
def search_gate_passes():
    """Search gate passes by customer name, order number, or vehicle number"""
    try:
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({'error': 'Search term is required'}), 400
        
        results = WatchmanService.search_gate_pass(search_term)
        return jsonify({
            'searchTerm': search_term,
            'results': results,
            'count': len(results)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Guest List Routes
@watchman_bp.route('/watchman/guests', methods=['GET'])
def get_all_guests():
    """Get all guest entries with optional filters"""
    try:
        filters = {
            'status': request.args.get('status'),
            'startDate': request.args.get('startDate'),
            'endDate': request.args.get('endDate'),
            'search': request.args.get('search')
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        guests = GuestListService.get_all_guests(filters if filters else None)
        return jsonify(guests), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/today', methods=['GET'])
def get_todays_guests():
    """Get all guests scheduled for today"""
    try:
        guests = GuestListService.get_todays_guests()
        return jsonify(guests), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/summary', methods=['GET'])
def get_guest_summary():
    """Get summary statistics for guest visits"""
    try:
        summary = GuestListService.get_guest_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>', methods=['GET'])
def get_guest_by_id(guest_id):
    """Get a specific guest entry by ID"""
    try:
        guest = GuestListService.get_guest_by_id(guest_id)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests', methods=['POST'])
def create_guest():
    """Create a new guest entry"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['guestName', 'meetingPerson', 'visitDate', 'purpose']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        created_by = request.headers.get('X-User-Email', 'security')
        guest = GuestListService.create_guest_entry(data, created_by)
        return jsonify(guest), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    """Update guest entry details"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        guest = GuestListService.update_guest(guest_id, data)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>/check-in', methods=['POST'])
def check_in_guest(guest_id):
    """Check in a guest (mark arrival)"""
    try:
        data = request.get_json() or {}
        guest = GuestListService.check_in_guest(guest_id, data)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>/check-out', methods=['POST'])
def check_out_guest(guest_id):
    """Check out a guest (mark departure)"""
    try:
        data = request.get_json() or {}
        notes = data.get('notes')
        guest = GuestListService.check_out_guest(guest_id, notes)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>/cancel', methods=['POST'])
def cancel_guest(guest_id):
    """Cancel a guest visit"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason')
        guest = GuestListService.cancel_guest(guest_id, reason)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>', methods=['DELETE'])
def delete_guest(guest_id):
    """Delete a guest entry"""
    try:
        result = GuestListService.delete_guest(guest_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
