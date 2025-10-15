"""
Store and inventory management API routes
"""
from flask import Blueprint, request, jsonify
from services import InventoryService, PurchaseService

store_bp = Blueprint('store', __name__)

# Inventory management routes
@store_bp.route('/store/inventory', methods=['GET'])
def get_store_inventory():
    """Get store inventory with optional search"""
    try:
        search = request.args.get('search', '')
        inventory = InventoryService.get_all_inventory(search)
        return jsonify(inventory), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/inventory', methods=['POST'])
def add_inventory_item():
    """Add new inventory item"""
    try:
        data = request.get_json()
        result = InventoryService.add_inventory_item(data)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/inventory/<int:item_id>', methods=['PUT'])
def update_inventory_item(item_id):
    """Update inventory item"""
    try:
        data = request.get_json()
        item = InventoryService.update_inventory_item(item_id, data)
        return jsonify(item), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/inventory/<int:item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    """Delete inventory item"""
    try:
        result = InventoryService.delete_inventory_item(item_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/inventory/bulk', methods=['POST'])
def bulk_add_inventory_items():
    """Bulk add inventory items from Excel import"""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'error': 'Expected a list of items'}), 400
        result = InventoryService.bulk_add_inventory_items(data)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Store operations routes
@store_bp.route('/store/orders/pending', methods=['GET'])
def get_pending_store_orders():
    """Get orders that need store attention"""
    try:
        orders = PurchaseService.get_pending_store_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/orders/<int:purchase_order_id>/check-stock', methods=['POST'])
def check_stock_for_order(purchase_order_id):
    """Check stock availability for an order"""
    try:
        result = InventoryService.check_stock_availability(purchase_order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/orders/<int:purchase_order_id>/verify-purchase', methods=['POST'])
def verify_purchase_and_add_to_inventory(purchase_order_id):
    """Verify purchase and add materials to inventory"""
    try:
        # Process purchase verification (adds to inventory and allocates original requirements)
        result = InventoryService.process_purchase_verification(purchase_order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@store_bp.route('/store/initialize-sample-data', methods=['POST'])
def initialize_sample_inventory():
    """Initialize sample inventory data"""
    try:
        result = InventoryService.initialize_sample_data()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500