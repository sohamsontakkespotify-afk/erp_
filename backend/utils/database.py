"""
Database utility functions
"""
from datetime import datetime
from models import db, ShowroomProduct, StoreInventory

def init_sample_data():
    """Initialize sample data for testing and development"""
    try:
        # Sample showroom products
        if ShowroomProduct.query.count() == 0:
            sample_products = [
                {
                    'name': 'Office Chair',
                    'category': 'Furniture',
                    'cost_price': 150.0,
                    'sale_price': 250.0,
                    'showroom_status': 'sold',
                    'sold_date': datetime.utcnow()
                },
                {
                    'name': 'Desk Lamp',
                    'category': 'Electronics',
                    'cost_price': 45.0,
                    'sale_price': 75.0,
                    'showroom_status': 'sold',
                    'sold_date': datetime.utcnow()
                },
                {
                    'name': 'Wooden Table',
                    'category': 'Furniture',
                    'cost_price': 200.0,
                    'sale_price': 350.0,
                    'showroom_status': 'available'
                }
            ]
            
            for product_data in sample_products:
                product = ShowroomProduct(**product_data)
                db.session.add(product)
        
        # Sample inventory items
        if StoreInventory.query.count() == 0:
            sample_inventory = [
                {'name': 'Steel Frame', 'quantity': 50, 'category': 'Raw Material'},
                {'name': 'Wooden Planks', 'quantity': 200, 'category': 'Raw Material'},
                {'name': 'Screws', 'quantity': 5000, 'category': 'Component'},
                {'name': 'Fabric Cushion', 'quantity': 100, 'category': 'Component'},
                {'name': 'Glass Panels', 'quantity': 30, 'category': 'Raw Material'},
                {'name': 'Metal Brackets', 'quantity': 150, 'category': 'Component'}
            ]
            
            for item_data in sample_inventory:
                item = StoreInventory(**item_data)
                db.session.add(item)
        
        db.session.commit()
        return True
        
    except Exception as e:
        db.session.rollback()
        raise Exception(f"Error initializing sample data: {str(e)}")

def backup_database():
    """Create a backup of critical database tables (placeholder implementation)"""
    # This would implement actual database backup logic
    # For now, it's a placeholder that could be extended
    try:
        backup_info = {
            'timestamp': datetime.utcnow().isoformat(),
            'tables': {
                'production_orders': db.session.execute(db.text("SELECT COUNT(*) FROM production_order")).scalar(),
                'purchase_orders': db.session.execute(db.text("SELECT COUNT(*) FROM purchase_order")).scalar(),
                'assembly_orders': db.session.execute(db.text("SELECT COUNT(*) FROM assembly_order")).scalar(),
                'store_inventory': db.session.execute(db.text("SELECT COUNT(*) FROM store_inventory")).scalar(),
                'showroom_products': db.session.execute(db.text("SELECT COUNT(*) FROM showroom_product")).scalar()
            }
        }
        return backup_info
    except Exception as e:
        raise Exception(f"Error creating backup: {str(e)}")

def get_database_stats():
    """Get database statistics for monitoring"""
    try:
        stats = {
            'production_orders': db.session.execute(db.text("SELECT COUNT(*) FROM production_order")).scalar(),
            'purchase_orders': db.session.execute(db.text("SELECT COUNT(*) FROM purchase_order")).scalar(),
            'assembly_orders': db.session.execute(db.text("SELECT COUNT(*) FROM assembly_order")).scalar(),
            'store_inventory_items': db.session.execute(db.text("SELECT COUNT(*) FROM store_inventory")).scalar(),
            'showroom_products': db.session.execute(db.text("SELECT COUNT(*) FROM showroom_product")).scalar(),
            'finance_transactions': db.session.execute(db.text("SELECT COUNT(*) FROM finance_transaction")).scalar(),
        }
        return stats
    except Exception as e:
        raise Exception(f"Error getting database stats: {str(e)}")