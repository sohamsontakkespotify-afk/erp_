"""
Showroom Routes Module
API endpoints for showroom operations
"""
from flask import Blueprint, request, jsonify
from services.showroom_service import ShowroomService

showroom_bp = Blueprint('showroom', __name__)


@showroom_bp.route('/assembly/completed', methods=['GET'])
def get_completed_assembly_products():
    """Get completed assembly orders ready for showroom"""
    try:
        products = ShowroomService.get_completed_assembly_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/displayed', methods=['GET'])
def get_displayed_showroom_products():
    """Get products currently displayed in showroom"""
    try:
        products = ShowroomService.get_displayed_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/add', methods=['POST'])
def add_product_to_showroom():
    """Add a completed assembly product to showroom display or send back to assembly if tests fail"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')  # This is the assembly order ID
        test_results = data.get('test_results')  # Optional test results

        if not product_id:
            return jsonify({'error': 'Product ID required'}), 400

        result = ShowroomService.add_product_to_showroom(product_id, test_results)
        return jsonify(result), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/send-back', methods=['POST'])
def send_back_to_assembly():
    """Send a product back to assembly for rework due to failed tests"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        test_results = data.get('test_results')

        if not product_id:
            return jsonify({'error': 'Product ID required'}), 400

        result = ShowroomService.send_back_to_assembly(product_id, test_results)
        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Removed mark_product_sold endpoint - selling is handled by Sales department
