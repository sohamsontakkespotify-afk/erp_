"""
Purchase order business logic service
"""
from models import db, PurchaseOrder, ProductionOrder

class PurchaseService:
    """Service class for purchase order operations"""
    
    @staticmethod
    def get_all_purchase_orders():
        """Get all purchase orders"""
        try:
            orders = PurchaseOrder.query.order_by(PurchaseOrder.created_at.desc()).all()
            return [order.to_dict() for order in orders]
        except Exception as e:
            raise Exception(f"Error fetching purchase orders: {str(e)}")
    
    @staticmethod
    def get_pending_store_orders():
        """Get orders that need store attention"""
        try:
            pending_orders = PurchaseOrder.query.filter(
                PurchaseOrder.status.in_(['pending_store_check', 'finance_approved'])
            ).order_by(PurchaseOrder.created_at.desc()).all()
            
            return [order.to_dict() for order in pending_orders]
        except Exception as e:
            raise Exception(f"Error fetching pending store orders: {str(e)}")
    
    @staticmethod
    def approve_purchase_order(purchase_order_id):
        """Approve a purchase order"""
        try:
            order = PurchaseOrder.query.get(purchase_order_id)
            if not order:
                raise Exception(f"Purchase order {purchase_order_id} not found")
            
            order.status = 'pending_store_check'
            
            # Update related production order
            production_order = ProductionOrder.query.get(order.production_order_id)
            if production_order:
                production_order.status = 'materials_requested'
            
            db.session.commit()
            
            return {
                'message': 'Purchase order approved and sent to store for inventory check',
                'purchaseOrder': order.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error approving purchase order: {str(e)}")
    
    @staticmethod
    def get_purchase_order_by_id(order_id):
        """Get a specific purchase order by ID"""
        try:
            order = PurchaseOrder.query.get(order_id)
            if not order:
                raise Exception(f"Purchase order {order_id} not found")
            return order.to_dict()
        except Exception as e:
            raise Exception(f"Error fetching purchase order: {str(e)}")
    
    @staticmethod
    def request_store_check(purchase_order_id):
        """Request store check for purchase order"""
        try:
            order = PurchaseOrder.query.get(purchase_order_id)
            if not order:
                raise Exception(f"Purchase order {purchase_order_id} not found")
            
            order.status = 'pending_store_check'
            db.session.commit()
            
            return {
                'message': 'Store check requested',
                'purchaseOrder': order.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error requesting store check: {str(e)}")
    
    @staticmethod
    def update_purchase_order(purchase_order_id, updates):
        """Update purchase order materials and quantities before finance approval"""
        try:
            order = PurchaseOrder.query.get(purchase_order_id)
            if not order:
                raise Exception(f"Purchase order {purchase_order_id} not found")
            
            # Only allow editing if order is in editable states
            editable_states = ['insufficient_stock', 'partially_allocated', 'pending_request']
            if order.status not in editable_states:
                raise Exception(f"Purchase order cannot be edited in status: {order.status}")
            
            # Update materials if provided
            if 'materials' in updates:
                order.set_materials_list(updates['materials'])
            
            # Update quantity if provided
            if 'quantity' in updates:
                order.quantity = updates['quantity']
            
            # Update product name if provided
            if 'product_name' in updates:
                order.product_name = updates['product_name']
            
            db.session.commit()
            
            return {
                'message': 'Purchase order updated successfully',
                'purchaseOrder': order.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating purchase order: {str(e)}")
    
    @staticmethod
    def request_finance_approval(purchase_order_id):
        """Request finance approval for purchase order"""
        try:
            order = PurchaseOrder.query.get(purchase_order_id)
            if not order:
                raise Exception(f"Purchase order {purchase_order_id} not found")
            
            order.status = 'pending_finance_approval'
            db.session.commit()
            
            return {
                'message': 'Finance approval requested',
                'purchaseOrder': order.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error requesting finance approval: {str(e)}")