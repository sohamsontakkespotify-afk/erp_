"""
Order tracking and status API routes
"""
from flask import Blueprint, jsonify, request
from services import OrderTrackingService

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/orders/current-log', methods=['GET'])
def get_current_order_log():
    """Get comprehensive order log showing current status across all departments"""
    try:
        result = OrderTrackingService.get_current_order_log()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/orders/<int:order_id>/details', methods=['GET'])
def get_order_detailed_status(order_id):
    """Get detailed status information for a specific order"""
    try:
        result = OrderTrackingService.get_order_detailed_status(order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@orders_bp.route('/orders/status-tracking', methods=['GET'])
def get_order_status_tracking():
    """Get real-time order status tracking across all departments"""
    try:
        query = request.args.get('q')
        result = OrderTrackingService.get_order_status_tracking(query)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
