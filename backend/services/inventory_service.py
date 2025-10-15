"""
Inventory management business logic service
"""
from datetime import datetime
from models import db, StoreInventory, PurchaseOrder, ProductionOrder
from utils.validators import validate_required_fields
import json

class InventoryService:
    """Service class for inventory operations"""
    
    @staticmethod
    def get_all_inventory(search=None):
        """Get all inventory items with optional search"""
        try:
            query = StoreInventory.query
            
            if search:
                query = query.filter(StoreInventory.name.ilike(f'%{search}%'))
            
            inventory = query.order_by(StoreInventory.name).all()
            return [item.to_dict() for item in inventory]
        except Exception as e:
            raise Exception(f"Error fetching inventory: {str(e)}")
    
    @staticmethod
    def add_inventory_item(data):
        """Add new inventory item or update existing quantity"""
        try:
            required_fields = ['name', 'quantity']
            validate_required_fields(data, required_fields)
            
            # Check if item already exists
            existing_item = StoreInventory.query.filter_by(name=data['name']).first()
            
            if existing_item:
                existing_item.add_stock(int(data['quantity']))
                db.session.commit()
                return {
                    'message': f'Updated existing item: {data["name"]}',
                    'item': existing_item.to_dict()
                }
            
            # Create new item
            new_item = StoreInventory(
                name=data['name'],
                quantity=int(data['quantity']),
                category=data.get('category', 'Raw Material')
            )
            
            db.session.add(new_item)
            db.session.commit()
            
            return {
                'message': 'Inventory item added successfully',
                'item': new_item.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error adding inventory item: {str(e)}")
    
    @staticmethod
    def update_inventory_item(item_id, data):
        """Update an existing inventory item"""
        try:
            item = StoreInventory.query.get_or_404(item_id)
            
            if 'quantity' in data:
                item.quantity = int(data['quantity'])
            if 'name' in data:
                item.name = data['name']
            if 'category' in data:
                item.category = data['category']
            
            item.updated_at = datetime.utcnow()
            db.session.commit()
            
            return item.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating inventory item: {str(e)}")
    
    @staticmethod
    def delete_inventory_item(item_id):
        """Delete an inventory item"""
        try:
            item = StoreInventory.query.get_or_404(item_id)
            db.session.delete(item)
            db.session.commit()
            
            return {'message': 'Inventory item deleted successfully'}
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error deleting inventory item: {str(e)}")
    
    @staticmethod
    def check_stock_availability(purchase_order_id):
        """Check stock availability for a purchase order and allocate if possible"""
        try:
            order = PurchaseOrder.query.get_or_404(purchase_order_id)
            
            if not order.materials:
                raise Exception('No materials specified in order')

            materials = order.get_materials_list()

            # Check stock availability
            stock_check_results = []
            all_available = True
            shortages = []

            for material in materials:
                if not isinstance(material, dict) or 'name' not in material:
                    continue

                inventory_item = StoreInventory.query.filter_by(name=material['name']).first()
                required_qty = material.get('quantity', 0)
                available_qty = inventory_item.quantity if inventory_item else 0

                is_sufficient = available_qty >= required_qty
                if not is_sufficient:
                    all_available = False
                    shortages.append({
                        "name": material['name'], 
                        "quantity": required_qty - available_qty
                    })

                stock_check_results.append({
                    'material': material['name'],
                    'required': required_qty,
                    'available': available_qty,
                    'sufficient': is_sufficient
                })

            if all_available:
                # Allocate all materials
                for material in materials:
                    inventory_item = StoreInventory.query.filter_by(name=material['name']).first()
                    if inventory_item:
                        inventory_item.allocate(material.get('quantity', 0))

                order.status = 'store_allocated'
                production_order = ProductionOrder.query.get(order.production_order_id)
                if production_order:
                    production_order.status = 'materials_allocated'

                db.session.commit()
                
                return {
                    "message": "All stock sufficient. Materials allocated to Assembly.",
                    "allAvailable": True,
                    "newStatus": order.status,
                    "purchaseOrder": order.to_dict()
                }
            else:
                # Handle partial allocation
                partial_allocated = False

                for material in materials:
                    inventory_item = StoreInventory.query.filter_by(name=material['name']).first()
                    required_qty = material.get('quantity', 0)
                    available_qty = inventory_item.quantity if inventory_item else 0

                    if available_qty > 0:
                        allocated = min(required_qty, available_qty)
                        inventory_item.allocate(allocated)
                        if allocated < required_qty:
                            partial_allocated = True

                if shortages and partial_allocated:
                    order.status = 'partially_allocated'
                    order.set_materials_list(shortages)
                    # Save original requirements if not already saved
                    if not order.original_requirements:
                        order.set_original_requirements(materials)
                    
                    production_order = ProductionOrder.query.get(order.production_order_id)
                    if production_order:
                        production_order.status = 'partially_allocated'
                else:
                    order.status = 'insufficient_stock'
                    order.set_materials_list(shortages)
                    # Save original requirements if not already saved
                    if not order.original_requirements:
                        order.set_original_requirements(materials)

                db.session.commit()
                
                message = "Partial allocation done. Shortage sent to Purchase." if partial_allocated else "Stock insufficient . Sent back to Purchase"
                
                return {
                    "message": message,
                    "allAvailable": False,
                    "shortages": shortages,
                    "newStatus": order.status,
                    "purchaseOrder": order.to_dict()
                }

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error checking stock: {str(e)}")
    
    @staticmethod
    def process_purchase_verification(purchase_order_id):
        """Verify purchase and add materials to inventory, then allocate only original requirements"""
        try:
            order = PurchaseOrder.query.get_or_404(purchase_order_id)
            
            if order.status != 'finance_approved':
                raise Exception('Order must be finance approved first')
            
            if not order.materials:
                raise Exception('No materials specified in order')
            
            # Get purchased materials (full quantities)
            purchased_materials = order.get_materials_list()
            
            # Get original requirements (only what was actually needed)
            original_requirements = order.get_original_requirements()
            
            # Step 1: Add ALL purchased materials to inventory
            for material in purchased_materials:
                if not isinstance(material, dict) or 'name' not in material:
                    continue
                
                material_name = material['name']
                material_qty = material.get('quantity', 0)
                
                inventory_item = StoreInventory.query.filter_by(name=material_name).first()
                if inventory_item:
                    inventory_item.add_stock(material_qty)
                else:
                    inventory_item = StoreInventory(
                        name=material_name,
                        quantity=material_qty,
                        category=material.get('category', 'Raw Material')
                    )
                    db.session.add(inventory_item)
            
            # Step 2: Allocate only the original requirements for production
            if original_requirements:
                for requirement in original_requirements:
                    if not isinstance(requirement, dict) or 'name' not in requirement:
                        continue
                    
                    material_name = requirement['name']
                    required_qty = requirement.get('quantity', 0)
                    
                    inventory_item = StoreInventory.query.filter_by(name=material_name).first()
                    if inventory_item and inventory_item.quantity >= required_qty:
                        inventory_item.allocate(required_qty)
            
            # Mark order verified and materials allocated
            order.status = 'store_allocated'
            production_order = ProductionOrder.query.get(order.production_order_id)
            if production_order:
                production_order.status = 'materials_allocated'
            
            db.session.commit()
            
            return {
                'message': 'Purchase verified, materials added to inventory, and original requirements allocated to production',
                'allAvailable': True,
                'newStatus': order.status,
                'purchaseOrder': order.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error verifying purchase: {str(e)}")
    
    @staticmethod
    def bulk_add_inventory_items(items_data):
        """Add multiple inventory items or update existing quantities"""
        try:
            results = []
            for data in items_data:
                required_fields = ['name', 'quantity']
                validate_required_fields(data, required_fields)

                # Check if item already exists
                existing_item = StoreInventory.query.filter_by(name=data['name']).first()

                if existing_item:
                    existing_item.add_stock(int(data['quantity']))
                    results.append({
                        'action': 'updated',
                        'item': existing_item.to_dict()
                    })
                else:
                    # Create new item
                    new_item = StoreInventory(
                        name=data['name'],
                        quantity=int(data['quantity']),
                        category=data.get('category', 'Raw Material')
                    )

                    db.session.add(new_item)
                    results.append({
                        'action': 'added',
                        'item': new_item.to_dict()
                    })

            db.session.commit()

            return {
                'message': f'Successfully processed {len(results)} items',
                'results': results
            }

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error bulk adding inventory items: {str(e)}")

    @staticmethod
    def initialize_sample_data():
        """Initialize sample inventory data"""
        try:
            sample_items = [
                {'name': 'Steel Frame', 'quantity': 50, 'category': 'Raw Material'},
                {'name': 'Wooden Planks', 'quantity': 200, 'category': 'Raw Material'},
                {'name': 'Screws', 'quantity': 5000, 'category': 'Component'},
                {'name': 'Fabric Cushion', 'quantity': 100, 'category': 'Component'},
                {'name': 'Glass Panels', 'quantity': 30, 'category': 'Raw Material'},
                {'name': 'Metal Brackets', 'quantity': 150, 'category': 'Component'}
            ]

            for item_data in sample_items:
                existing = StoreInventory.query.filter_by(name=item_data['name']).first()
                if not existing:
                    item = StoreInventory(**item_data)
                    db.session.add(item)

            db.session.commit()
            return {'message': 'Sample inventory data initialized'}

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error initializing sample data: {str(e)}")
