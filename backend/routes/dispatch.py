"""
Dispatch Routes Module
API endpoints for dispatch operations
"""
from flask import Blueprint, request, jsonify
from services.dispatch_service import DispatchService

dispatch_bp = Blueprint('dispatch', __name__)


@dispatch_bp.route('/dispatch/pending', methods=['GET'])
def get_pending_dispatch_orders():
    """Get all orders pending dispatch processing"""
    try:
        orders = DispatchService.get_pending_dispatch_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/all', methods=['GET'])
def get_all_dispatch_orders():
    """Get all dispatch orders"""
    try:
        orders = DispatchService.get_all_dispatch_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/process/<int:dispatch_id>', methods=['POST'])
def process_dispatch_order(dispatch_id):
    """Process dispatch order based on delivery type"""
    try:
        data = request.get_json()
        result = DispatchService.process_dispatch_order(dispatch_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/customer-details/<int:dispatch_id>', methods=['PUT'])
def update_customer_details(dispatch_id):
    """Update customer details for dispatch request"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('partyName'):
            return jsonify({'error': 'Customer name is required'}), 400
        
        result = DispatchService.update_customer_details(dispatch_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/watchman/orders', methods=['GET'])
def get_watchman_orders():
    """Get orders assigned to watchman (self pickup)"""
    try:
        orders = DispatchService.get_watchman_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/transport/orders', methods=['GET'])
def get_transport_orders():
    """Get orders assigned to transport (company delivery)"""
    try:
        orders = DispatchService.get_transport_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/watchman/verify/<int:gate_pass_id>', methods=['PUT'])
def verify_customer_pickup(gate_pass_id):
    """Verify customer pickup at gate (watchman action)"""
    try:
        data = request.get_json()
        result = DispatchService.verify_customer_pickup(gate_pass_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/transport/update/<int:transport_job_id>', methods=['PUT'])
def update_transport_status(transport_job_id):
    """Update transport job status"""
    try:
        data = request.get_json()
        
        # Validate status is provided
        if not data.get('status'):
            return jsonify({'error': 'Status is required'}), 400
        
        result = DispatchService.update_transport_status(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/summary', methods=['GET'])
def get_dispatch_summary():
    """Get dispatch department summary statistics"""
    try:
        summary = DispatchService.get_dispatch_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/self/loaded/<int:dispatch_id>', methods=['POST'])
def mark_loaded(dispatch_id):
    """Mark loading completed for self delivery; dispatch step before release."""
    try:
        data = request.get_json() or {}
        result = DispatchService.complete_loading(dispatch_id, data.get('notes'))
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/part-load/loaded/<int:dispatch_id>', methods=['POST'])
def mark_part_load_loaded(dispatch_id):
    """Mark loading completed for part load delivery; dispatch step before release."""
    try:
        data = request.get_json() or {}
        result = DispatchService.complete_part_load_loading(dispatch_id, data.get('notes'))
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/notifications', methods=['GET'])
def get_dispatch_notifications():
    """Get notifications for dispatch department about vehicles sent in for loading"""
    try:
        notifications = DispatchService.get_dispatch_notifications()
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500