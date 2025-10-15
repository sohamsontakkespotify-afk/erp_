"""
Sales Routes Module
API endpoints for sales operations
"""
from flask import Blueprint, request, jsonify
from services.sales_service import SalesService
from services.gst_verification_service import GSTVerificationService

sales_bp = Blueprint('sales', __name__)


@sales_bp.route('/showroom/available', methods=['GET'])
def get_available_showroom_products():
    """Get all available products in showroom for sale"""
    try:
        products = SalesService.get_available_showroom_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders', methods=['GET'])
def get_sales_orders():
    """Get sales orders with optional filtering"""
    try:
        status = request.args.get('status')
        sales_person = request.args.get('sales_person')
        
        orders = SalesService.get_sales_orders(status=status, sales_person=sales_person)
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_sales_order(order_id):
    """Get a specific sales order by ID"""
    try:
        order = SalesService.get_sales_order_by_id(order_id)
        return jsonify(order), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders', methods=['POST'])
def create_sales_order():
    """Create a new sales order"""
    try:
        data = request.get_json()
        
        # Validate required fields (paymentMethod no longer required at order creation)
        required_fields = ['customerName', 'showroomProductId', 'unitPrice', 'salesPerson']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        order = SalesService.create_sales_order(data)
        return jsonify(order), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>', methods=['PUT'])
def update_sales_order(order_id):
    """Update an existing sales order"""
    try:
        data = request.get_json()
        order = SalesService.update_sales_order(order_id, data)
        return jsonify(order), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/payment', methods=['POST'])
def process_payment(order_id):
    """Process payment for a sales order"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'paymentMethod']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        transaction = SalesService.process_payment(order_id, data)
        return jsonify(transaction), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/coupon', methods=['POST'])
def apply_coupon(order_id):
    """Apply a coupon and optionally bypass finance gate if partial payment."""
    try:
        data = request.get_json() or {}
        result = SalesService.apply_coupon(order_id, data)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers', methods=['GET'])
def get_customers():
    """Get all customers"""
    try:
        customers = SalesService.get_customers()
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers', methods=['POST'])
def create_customer():
    """Create a new customer"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'name' not in data:
            return jsonify({'error': 'Customer name is required'}), 400
        
        customer = SalesService.create_customer(data)
        return jsonify(customer), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/summary', methods=['GET'])
def get_sales_summary():
    """Get sales summary statistics"""
    try:
        summary = SalesService.get_sales_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/dispatch', methods=['POST'])
def send_order_to_dispatch(order_id):
    """Send a sales order to dispatch department"""
    try:
        data = request.get_json() or {}
        delivery_type = data.get('deliveryType')  # 'self' or 'transport'
        if not delivery_type:
            return jsonify({'error': 'deliveryType is required'}), 400

        # Get driver details if provided
        driver_details = data.get('driverDetails')

        # Normalize delivery type - no changes needed as backend now accepts the full values
        # delivery_type should be 'self delivery' or 'company delivery'

        result = SalesService.send_order_to_dispatch(order_id, delivery_type, driver_details)

        # Return appropriate status code based on result
        if result.get('status') == 'already_dispatched':
            return jsonify(result), 200  # OK - informational response
        else:
            return jsonify(result), 201  # Created - new dispatch request
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Removed the driver details update route as part of revert
@sales_bp.route('/transport/approvals/<int:approval_id>/confirm', methods=['POST'])
def confirm_transport_demand(approval_id):
    """Confirm or modify order after transport rejection with demand amount"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if 'action' not in data:
            return jsonify({'error': 'Action is required (accept_demand or modify_order)'}), 400
        
        result = SalesService.confirm_transport_demand(approval_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/transport/approvals/<int:approval_id>/renegotiate', methods=['POST'])
def renegotiate_transport_cost(approval_id):
    """Send negotiated amount back to transport for verification"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        required_fields = ['negotiatedAmount', 'customerNotes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = SalesService.renegotiate_transport_cost(approval_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500



def verify_gst_number():
    """Verify GST number using government portal"""
    try:
        data = request.get_json()
        gst_number = data.get('gstNumber')

        if not gst_number:
            return jsonify({'error': 'GST number is required'}), 400

        # Verify GST number using real government portal
        result = GSTVerificationService.verify_gst_number(gst_number)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'verified': False,
            'message': f'Verification failed: {str(e)}',
            'details': None
        }), 500



