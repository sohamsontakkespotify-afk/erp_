"""
Health check API routes
"""
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Application health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'database': 'mysql',
        'service': 'production_management'
    }), 200