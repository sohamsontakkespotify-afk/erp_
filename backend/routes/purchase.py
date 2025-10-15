"""
Purchase order API routes
"""
from flask import Blueprint, request, jsonify
from services.purchase_service import PurchaseService

purchase_bp = Blueprint('purchase', __name__)

@purchase_bp.route('/purchase-orders', methods=['GET'])
def get_purchase_orders():
    """Get all purchase orders"""
    try:
        orders = PurchaseService.get_all_purchase_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>', methods=['GET'])
def get_purchase_order(purchase_order_id):
    """Get a specific purchase order"""
    try:
        order = PurchaseService.get_purchase_order_by_id(purchase_order_id)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>/approve', methods=['PUT'])
def approve_purchase_order(purchase_order_id):
    """Approve a purchase order"""
    try:
        result = PurchaseService.approve_purchase_order(purchase_order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>', methods=['PUT'])
def update_purchase_order(purchase_order_id):
    """Update purchase order materials and quantities"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = PurchaseService.update_purchase_order(purchase_order_id, data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>/request-store-check', methods=['PUT'])
def request_store_check(purchase_order_id):
    """Request store check for purchase order"""
    try:
        result = PurchaseService.request_store_check(purchase_order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>/request-finance-approval', methods=['PUT'])
def request_finance_approval(purchase_order_id):
    """Request finance approval for purchase order"""
    try:
        result = PurchaseService.request_finance_approval(purchase_order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500