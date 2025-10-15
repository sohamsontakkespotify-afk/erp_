"""
Production order API routes
"""
from flask import Blueprint, request, jsonify
from services import ProductionService

production_bp = Blueprint('production', __name__)

@production_bp.route('/production-orders', methods=['GET'])
def get_production_orders():
    """Get all production orders"""
    try:
        orders = ProductionService.get_all_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders', methods=['POST'])
def create_production_order():
    """Create a new production order"""
    try:
        data = request.get_json()
        result = ProductionService.create_production_order(data)
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders/<int:order_id>', methods=['GET'])
def get_production_order(order_id):
    """Get a specific production order"""
    try:
        order = ProductionService.get_order_by_id(order_id)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders/<int:order_id>', methods=['PUT'])
def update_production_order(order_id):
    """Update a production order"""
    try:
        data = request.get_json()
        order = ProductionService.update_production_order(order_id, data)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders/<int:order_id>', methods=['DELETE'])
def delete_production_order(order_id):
    """Delete a production order"""
    try:
        result = ProductionService.delete_production_order(order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500