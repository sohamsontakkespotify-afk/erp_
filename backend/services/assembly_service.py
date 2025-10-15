"""
Assembly order business logic service
"""
from datetime import datetime
from models import db, AssemblyOrder, PurchaseOrder
from utils.validators import validate_positive_integer, validate_status

class AssemblyService:
    """Service class for assembly order operations"""
    
    VALID_STATUSES = ['pending', 'in_progress', 'paused', 'completed', 'sent_to_showroom']
    
    @staticmethod
    def get_ready_assembly_orders():
        """Get assembly orders ready for processing (materials allocated)"""
        try:
            ready_statuses = ['store_allocated', 'verified_in_store']
            orders = (
                db.session.query(AssemblyOrder)
                .join(PurchaseOrder, AssemblyOrder.production_order_id == PurchaseOrder.production_order_id)
                .filter(PurchaseOrder.status.in_(ready_statuses))
                .order_by(AssemblyOrder.created_at.desc())
                .all()
            )
            return [order.to_dict() for order in orders]
        except Exception as e:
            raise Exception(f"Error fetching assembly orders: {str(e)}")
    
    @staticmethod
    def get_all_assembly_orders():
        """Get all assembly orders"""
        try:
            orders = AssemblyOrder.query.order_by(AssemblyOrder.created_at.desc()).all()
            return [order.to_dict() for order in orders]
        except Exception as e:
            raise Exception(f"Error fetching all assembly orders: {str(e)}")
    
    @staticmethod
    def update_assembly_order(order_id, data):
        """Update assembly order with comprehensive field support"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            
            # Update status
            if 'status' in data:
                status = validate_status(data['status'], AssemblyService.VALID_STATUSES)
                order.status = status
            
            # Update progress - FIXED LOGIC
            if 'progress' in data:
                try:
                    progress = int(data['progress'])
                except (ValueError, TypeError):
                    raise Exception("Progress must be a valid integer")
                
                # Validate progress is in range 0-100 (0 is valid for assembly)
                if not (0 <= progress <= 100):
                    raise Exception("Progress must be between 0 and 100")
                
                order.progress = progress
            
            # Update timestamp fields
            if 'startedAt' in data:
                try:
                    order.started_at = datetime.fromisoformat(data['startedAt'].replace('Z', '+00:00'))
                except:
                    order.started_at = datetime.utcnow()
            
            if 'completedAt' in data:
                try:
                    order.completed_at = datetime.fromisoformat(data['completedAt'].replace('Z', '+00:00'))
                except:
                    order.completed_at = datetime.utcnow()
            
            if 'pausedAt' in data:
                try:
                    order.paused_at = datetime.fromisoformat(data['pausedAt'].replace('Z', '+00:00'))
                except:
                    order.paused_at = datetime.utcnow()
            
            if 'resumedAt' in data:
                try:
                    order.resumed_at = datetime.fromisoformat(data['resumedAt'].replace('Z', '+00:00'))
                except:
                    order.resumed_at = datetime.utcnow()
            
            # Update quality fields
            if 'qualityCheck' in data:
                order.quality_check = bool(data['qualityCheck'])
            
            if 'testingPassed' in data:
                order.testing_passed = bool(data['testingPassed'])
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating assembly order: {str(e)}")
    
    @staticmethod
    def update_assembly_status(order_id, status):
        """Update assembly order status only"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            
            validated_status = validate_status(status, AssemblyService.VALID_STATUSES)
            order.status = validated_status
            
            # Set appropriate timestamps based on status
            if validated_status == 'in_progress' and not order.started_at:
                order.started_at = datetime.utcnow()
            elif validated_status == 'completed' and not order.completed_at:
                order.completed_at = datetime.utcnow()
                order.progress = 100  # Ensure progress is 100% when completed
            elif validated_status == 'paused':
                order.paused_at = datetime.utcnow()
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating assembly status: {str(e)}")
    
    @staticmethod
    def update_assembly_progress(order_id, progress):
        """Update assembly progress only"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            
            try:
                progress = int(progress)
            except (ValueError, TypeError):
                raise Exception("Progress must be a valid integer")
            
            # Validate progress is in range 0-100 (0 is valid for assembly)
            if not (0 <= progress <= 100):
                raise Exception("Progress must be between 0 and 100")
            
            order.progress = progress
            
            # Auto-update status based on progress
            if order.progress == 0 and order.status != 'pending':
                order.status = 'pending'
            elif 0 < order.progress < 100 and order.status == 'pending':
                order.status = 'in_progress'
                if not order.started_at:
                    order.started_at = datetime.utcnow()
            elif order.progress == 100 and order.status != 'completed':
                order.status = 'completed'
                order.completed_at = datetime.utcnow()
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating assembly progress: {str(e)}")
    
    @staticmethod
    def get_completed_products():
        """Get completed assembly products ready for showroom"""
        try:
            from models import ShowroomProduct
            
            completed_orders = AssemblyOrder.query.filter_by(status='completed').all()
            
            products = []
            for order in completed_orders:
                # Check if already in showroom
                existing_showroom = ShowroomProduct.query.filter_by(
                    production_order_id=order.production_order_id
                ).first()
                
                if not existing_showroom:  # Only show if not already in showroom
                    products.append({
                        'id': order.id,
                        'productName': order.product_name,
                        'quantity': order.quantity,
                        'completedAt': order.completed_at.isoformat() if order.completed_at else order.created_at.isoformat(),
                        'qualityRating': 5,  # Default quality rating
                        'productionOrderId': order.production_order_id
                    })
            
            return products
        except Exception as e:
            raise Exception(f"Error fetching completed products: {str(e)}")
    
    @staticmethod
    def get_assembly_order_by_id(order_id):
        """Get a specific assembly order by ID"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            return order.to_dict()
        except Exception as e:
            raise Exception(f"Error fetching assembly order: {str(e)}")