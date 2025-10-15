"""
Production order business logic service
"""
import json
from models import db, ProductionOrder, PurchaseOrder, AssemblyOrder
from utils.validators import validate_required_fields

class ProductionService:
    """Service class for production order operations"""
    
    @staticmethod
    def get_all_orders():
        """Get all production orders"""
        try:
            orders = ProductionOrder.query.order_by(ProductionOrder.created_at.desc()).all()
            return [order.to_dict() for order in orders]
        except Exception as e:
            raise Exception(f"Error fetching production orders: {str(e)}")
    
    @staticmethod
    def create_production_order(data):
        """Create a new production order with related purchase and assembly orders"""
        try:
            # Validate required fields
            required_fields = ['productName', 'category', 'quantity', 'materials']
            validate_required_fields(data, required_fields)
            
            # Create production order
            production_order = ProductionOrder(
                product_name=data['productName'],
                category=data['category'],
                quantity=data['quantity'],
                created_by=data.get('createdBy', 'Unknown')
            )
            
            db.session.add(production_order)
            db.session.flush()  # Get the ID without committing
            
            # Create purchase order
            purchase_order = PurchaseOrder(
                production_order_id=production_order.id,
                product_name=data['productName'],
                quantity=data['quantity'],
                materials=json.dumps(data['materials']),
                original_requirements=json.dumps(data['materials'])  # Save original requirements
            )
            
            # Create assembly order
            assembly_order = AssemblyOrder(
                production_order_id=production_order.id,
                product_name=data['productName'],
                quantity=data['quantity']
            )
            
            db.session.add(purchase_order)
            db.session.add(assembly_order)
            db.session.commit()
            
            return {
                'message': 'Production order created successfully',
                'productionOrder': production_order.to_dict(),
                'purchaseOrder': purchase_order.to_dict(),
                'assemblyOrder': assembly_order.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error creating production order: {str(e)}")
    
    @staticmethod
    def update_production_order(order_id, data):
        """Update an existing production order"""
        try:
            order = ProductionOrder.query.get_or_404(order_id)
            
            if 'status' in data:
                order.status = data['status']
            if 'quantity' in data:
                order.quantity = data['quantity']
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating production order: {str(e)}")
    
    @staticmethod
    def delete_production_order(order_id):
        """Delete a production order and its related records"""
        try:
            order = ProductionOrder.query.get_or_404(order_id)
            
            # Delete related orders
            PurchaseOrder.query.filter_by(production_order_id=order_id).delete()
            AssemblyOrder.query.filter_by(production_order_id=order_id).delete()
            
            # Delete production order
            db.session.delete(order)
            db.session.commit()
            
            return {'message': 'Production order deleted successfully'}
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error deleting production order: {str(e)}")
    
    @staticmethod
    def get_order_by_id(order_id):
        """Get a specific production order by ID"""
        try:
            order = ProductionOrder.query.get_or_404(order_id)
            return order.to_dict()
        except Exception as e:
            raise Exception(f"Error fetching production order: {str(e)}")