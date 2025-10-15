"""
Finance Routes Module
API endpoints for finance operations
"""
from flask import Blueprint, request, jsonify
from services.finance_service import FinanceService
from datetime import datetime

finance_bp = Blueprint('finance', __name__)


@finance_bp.route('/api/health/finance', methods=['GET'])
def finance_health_check():
    """Health check endpoint for finance module"""
    return jsonify({
        'status': 'Finance module is running',
        'timestamp': datetime.now().isoformat()
    }), 200


@finance_bp.route('/finance/purchase-orders', methods=['GET'])
def get_finance_purchase_orders():
    """Get purchase orders that need finance approval"""
    try:
        orders = FinanceService.get_purchase_orders_for_approval()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/purchase-orders/<int:order_id>/approve', methods=['PUT'])
def finance_approve_purchase_order(order_id):
    """Approve or reject a purchase order from finance perspective"""
    try:
        data = request.get_json()
        approved = data.get('approved', False)
        
        result = FinanceService.approve_purchase_order(order_id, approved)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/dashboard', methods=['GET'])
def get_finance_dashboard():
    """Get financial summary for dashboard"""
    try:
        dashboard_data = FinanceService.get_dashboard_data()
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'totalRevenue': 0.0,
            'totalExpenses': 0.0,
            'netProfit': 0.0,
            'recentTransactions': [],
            'pendingApprovals': 0
        }), 200  # Return 200 with default values to prevent frontend crashes


@finance_bp.route('/finance/transactions', methods=['GET'])
def get_finance_transactions():
    """Get all financial transactions with filtering"""
    try:
        transaction_type = request.args.get('type')  # 'revenue' or 'expense'
        limit = int(request.args.get('limit', 50))
        
        transactions = FinanceService.get_transactions(transaction_type, limit)
        return jsonify(transactions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/sales-payments/pending', methods=['GET'])
def get_sales_payments_pending():
    try:
        orders = FinanceService.get_sales_payments_pending_approval()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/sales-payments/<int:order_id>/approve', methods=['PUT'])
def approve_sales_payment(order_id):
    try:
        data = request.get_json() or {}
        approved = data.get('approved', True)
        result = FinanceService.approve_sales_payment(order_id, approved)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/transactions/expense', methods=['POST'])
def create_expense_transaction():
    """Create an expense transaction"""
    try:
        data = request.get_json()
        
        required_fields = ['amount', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        transaction = FinanceService.create_expense_transaction(
            amount=data['amount'],
            description=data['description'],
            reference_id=data.get('reference_id'),
            reference_type=data.get('reference_type')
        )
        
        return jsonify(transaction), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/transactions/revenue', methods=['POST'])
def create_revenue_transaction():
    """Create a revenue transaction"""
    try:
        data = request.get_json()
        
        required_fields = ['amount', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        transaction = FinanceService.create_revenue_transaction(
            amount=data['amount'],
            description=data['description'],
            reference_id=data.get('reference_id'),
            reference_type=data.get('reference_type')
        )
        
        return jsonify(transaction), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500