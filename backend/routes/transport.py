from flask import Blueprint, jsonify, request
from services.transport_service import TransportService

transport_ext_bp = Blueprint('transport_ext', __name__)

@transport_ext_bp.route('/transport/partload', methods=['GET'])
def list_partload():
    try:
        return jsonify(TransportService.list_part_load_details()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transport_ext_bp.route('/transport/partload', methods=['POST'])
def create_partload():
    try:
        data = request.get_json(force=True)
        return jsonify(TransportService.create_part_load_detail(data)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

"""
Transport Routes Module
API endpoints for transport operations (company delivery)
"""
from flask import Blueprint, request, jsonify
from services.transport_service import TransportService

transport_bp = Blueprint('transport', __name__)


@transport_bp.route('/transport/approvals/pending', methods=['GET'])
def get_pending_transport_approvals():
    """Get all pending transport approval requests"""
    try:
        approvals = TransportService.get_pending_transport_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/approvals/rejected', methods=['GET'])
def get_rejected_transport_approvals():
    """Get all rejected transport approval requests for sales review"""
    try:
        approvals = TransportService.get_rejected_transport_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/approvals/<int:approval_id>/approve', methods=['POST'])
def approve_transport_request(approval_id):
    """Approve a transport approval request"""
    try:
        data = request.get_json() or {}
        approved_by = data.get('approvedBy', 'Transport Department')
        
        result = TransportService.approve_transport_request(approval_id, approved_by)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/approvals/<int:approval_id>/reject', methods=['POST'])
def reject_transport_request(approval_id):
    """Reject a transport approval request with demand amount"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if 'demandAmount' not in data:
            return jsonify({'error': 'Demand amount is required'}), 400
        
        result = TransportService.reject_transport_request(approval_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500



def get_pending_transport_jobs():
    """Get all transport jobs pending assignment"""
    try:
        jobs = TransportService.get_pending_transport_jobs()
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/all', methods=['GET'])
def get_all_transport_jobs():
    """Get all transport jobs with all statuses"""
    try:
        jobs = TransportService.get_all_transport_jobs()
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/assign/<int:transport_job_id>', methods=['POST'])
def assign_transporter(transport_job_id):
    """Assign a transporter to a transport job"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if not data.get('transporterName'):
            return jsonify({'error': 'Transporter name is required'}), 400
        
        result = TransportService.assign_transporter(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/status/<int:transport_job_id>', methods=['PUT'])
def update_delivery_status(transport_job_id):
    """Update delivery status of transport job"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if not data.get('status'):
            return jsonify({'error': 'Status is required'}), 400
        
        result = TransportService.update_delivery_status(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/in-transit', methods=['GET'])
def get_in_transit_deliveries():
    """Get all deliveries currently in transit"""
    try:
        deliveries = TransportService.get_in_transit_deliveries()
        return jsonify(deliveries), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/summary', methods=['GET'])
def get_transport_summary():
    """Get transport department summary statistics"""
    try:
        summary = TransportService.get_transport_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/performance', methods=['GET'])
def get_transporter_performance():
    """Get performance statistics for transporters"""
    try:
        performance = TransportService.get_transporter_performance()
        return jsonify(performance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/search', methods=['GET'])
def search_transport_jobs():
    """Search transport jobs by order number, customer name, or transporter"""
    try:
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({'error': 'Search term is required'}), 400
        
        results = TransportService.search_transport_jobs(search_term)
        return jsonify({
            'searchTerm': search_term,
            'results': results,
            'count': len(results)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Fleet Management Endpoints
@transport_bp.route('/fleet', methods=['GET'])
def get_fleet_vehicles():
    """Get all fleet vehicles"""
    try:
        vehicles = TransportService.get_fleet_vehicles()
        return jsonify(vehicles), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/add', methods=['POST'])
def add_fleet_vehicle():
    """Add a new vehicle to the fleet"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        result = TransportService.add_fleet_vehicle(data)
        return jsonify(result), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/<int:vehicle_id>', methods=['PUT'])
def update_fleet_vehicle(vehicle_id):
    """Update a fleet vehicle"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        result = TransportService.update_fleet_vehicle(vehicle_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/<int:vehicle_id>', methods=['DELETE'])
def delete_fleet_vehicle(vehicle_id):
    """Delete a vehicle from the fleet"""
    try:
        result = TransportService.delete_fleet_vehicle(vehicle_id)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/available', methods=['GET'])
def get_available_vehicles():
    """Get all available vehicles for transport assignment"""
    try:
        vehicles = TransportService.get_available_vehicles()
        return jsonify(vehicles), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/<int:vehicle_id>/reached', methods=['POST'])
def mark_driver_reached(vehicle_id):
    """Mark a driver as reached; set vehicle to available manually."""
    try:
        result = TransportService.mark_driver_reached(vehicle_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/active-orders', methods=['GET'])
def get_active_transport_orders():
    """Get active transport orders (not delivered) for dashboard"""
    try:
        orders = TransportService.get_active_transport_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/completed-orders', methods=['GET'])
def get_completed_transport_orders():
    """Get completed transport orders (delivered) for dashboard"""
    try:
        orders = TransportService.get_completed_transport_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/pending-driver-details', methods=['GET'])
def get_part_load_orders_needing_driver_details():
    """Get part load orders that need driver details to be filled"""
    try:
        orders = TransportService.get_part_load_orders_needing_driver_details()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/<int:transport_job_id>/fill-driver-details', methods=['POST'])
def fill_part_load_driver_details(transport_job_id):
    """Fill driver details for part load order and send to watchman"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        required_fields = ['driverName', 'driverNumber', 'vehicleNumber', 'companyName']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        result = TransportService.fill_part_load_driver_details(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/completed', methods=['GET'])
def get_completed_part_load_orders():
    """Get completed and verified part load orders that need after-delivery details"""
    try:
        orders = TransportService.get_completed_part_load_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/<int:transport_job_id>/after-delivery', methods=['POST'])
def fill_part_load_after_delivery(transport_job_id):
    """Fill after-delivery details for completed part load order"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        required_fields = ['lrNumber', 'loadingDate', 'unloadingDate', 'deliveryDate']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        result = TransportService.fill_part_load_after_delivery(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
