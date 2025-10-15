"""
Assembly order API routes
"""
from flask import Blueprint, request, jsonify
from services import AssemblyService

assembly_bp = Blueprint('assembly', __name__)

@assembly_bp.route('/assembly-orders', methods=['GET'])
def get_assembly_orders():
    """Get assembly orders ready for processing"""
    try:
        orders = AssemblyService.get_ready_assembly_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/all', methods=['GET'])
def get_all_assembly_orders():
    """Get all assembly orders"""
    try:
        orders = AssemblyService.get_all_assembly_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>', methods=['GET'])
def get_assembly_order(order_id):
    """Get a specific assembly order"""
    try:
        order = AssemblyService.get_assembly_order_by_id(order_id)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>', methods=['PUT'])
def update_assembly_order(order_id):
    """Update assembly order (comprehensive update)"""
    try:
        data = request.get_json()
        order = AssemblyService.update_assembly_order(order_id, data)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>/status', methods=['PUT'])
def update_assembly_order_status(order_id):
    """Update assembly order status only"""
    try:
        data = request.get_json()
        if 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
            
        order = AssemblyService.update_assembly_status(order_id, data['status'])
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>/progress', methods=['PUT'])
def update_assembly_progress(order_id):
    """Update assembly progress only"""
    try:
        data = request.get_json()
        if 'progress' not in data:
            return jsonify({'error': 'Progress value required'}), 400
            
        order = AssemblyService.update_assembly_progress(order_id, data['progress'])
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly/completed', methods=['GET'])
def get_completed_assembly_products():
    """Get completed assembly products ready for showroom"""
    try:
        products = AssemblyService.get_completed_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
