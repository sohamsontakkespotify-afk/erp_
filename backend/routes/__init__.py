"""
API routes package initialization
"""
from flask import Blueprint

# Import all route blueprints
from .production import production_bp
from .purchase import purchase_bp
from .assembly import assembly_bp
from .store import store_bp
from .showroom import showroom_bp
from .finance import finance_bp
from .orders import orders_bp
from .health import health_bp
from .sales import sales_bp
from .dispatch import dispatch_bp
from .watchman import watchman_bp
from .transport import transport_bp
from .auth import auth_bp
from .gate_entry import gate_entry_bp
from .approval import approval_bp
from .hr import hr_bp

# List of all blueprints
blueprints = [
    production_bp,
    purchase_bp,
    assembly_bp,
    store_bp,
    showroom_bp,
    finance_bp,
    orders_bp,
    health_bp,
    sales_bp,
    dispatch_bp,
    watchman_bp,
    transport_bp,
    auth_bp,
    gate_entry_bp,
    approval_bp,
    hr_bp,
]

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    for blueprint in blueprints:
        # Mount sales under /api/sales to match frontend calls
        if getattr(blueprint, 'name', None) == 'sales':
            app.register_blueprint(blueprint, url_prefix='/api/sales')
        elif getattr(blueprint, 'name', None) == 'approval':
            app.register_blueprint(blueprint, url_prefix='/api/approval')
        else:
            app.register_blueprint(blueprint, url_prefix='/api')

__all__ = [
    'blueprints',
    'register_blueprints',
    'production_bp',
    'purchase_bp',
    'assembly_bp',
    'store_bp',
    'showroom_bp',
    'finance_bp',
    'orders_bp',
    'health_bp',
    'sales_bp',
    'dispatch_bp',
    'watchman_bp',
    'transport_bp',
    'auth_bp',
    'gate_entry_bp',
    'approval_bp',
    'unified_tracking_bp'
]
