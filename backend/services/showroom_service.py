"""
Showroom Service Module
Handles business logic for showroom operations
"""
from datetime import datetime
from models import db, ShowroomProduct, AssemblyOrder, FinanceTransaction, SalesOrder
import json


class ShowroomService:
    """Service class for showroom operations"""
    
    @staticmethod
    def get_completed_assembly_products():
        """Get completed assembly orders ready for showroom"""
        completed_orders = AssemblyOrder.query.filter_by(status='completed').all()
        
        # Convert to format expected by showroom
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
    
    @staticmethod
    def get_displayed_products():
        """Get products currently displayed in showroom"""
        # Only show available products - sold products are handled by Sales department
        displayed_products = ShowroomProduct.query.filter_by(
            showroom_status='available'
        ).order_by(ShowroomProduct.created_at.desc()).all()
        
        # Convert to format expected by frontend
        products = []
        for product in displayed_products:
            # Get the original assembly order for additional details
            assembly_order = None
            if product.production_order_id:
                assembly_order = AssemblyOrder.query.filter_by(
                    production_order_id=product.production_order_id
                ).first()
            
            # Get original quantity from assembly order
            original_quantity = assembly_order.quantity if assembly_order else 1
            
            products.append({
                'id': product.id,
                'productName': product.name,
                'quantity': product.quantity,  # Current remaining quantity
                'original_qty': original_quantity,  # Original quantity from assembly
                'showroomStatus': product.showroom_status,
                'displayedAt': product.created_at.isoformat(),
                'salePrice': product.sale_price,
                'customerInterest': 8,  # Demo value - you could add this as a field
                'qualityRating': 5,  # Demo value - you could add this as a field
                'productionOrderId': product.production_order_id
            })
        
        return products
    
    @staticmethod
    def add_product_to_showroom(product_id, test_results=None):
        """Add a completed assembly product to showroom display or send back to assembly if tests fail"""
        from models import AssemblyTestResult, AssemblyOrder

        # Get the assembly order
        assembly_order = AssemblyOrder.query.get(product_id)
        if not assembly_order:
            raise ValueError('Assembly order not found')

        if assembly_order.status != 'completed':
            raise ValueError('Product must be completed first')

        # Process test results if provided
        if test_results:
            # Clear existing test results for this assembly order
            AssemblyTestResult.query.filter_by(assembly_order_id=assembly_order.id).delete()

            any_failed = False
            for test_type, passed in test_results.items():
                test_name = {
                    'UT': 'Unit Testing',
                    'IT': 'Integration Testing',
                    'ST': 'System Testing',
                    'AT': 'Acceptance Testing'
                }.get(test_type, 'Unknown Test')

                result = 'pass' if passed else 'fail'
                if not passed:
                    any_failed = True

                test_result = AssemblyTestResult(
                    assembly_order_id=assembly_order.id,
                    test_type=test_type,
                    test_name=test_name,
                    result=result
                )
                db.session.add(test_result)

            if any_failed:
                # Update assembly order status to rework
                assembly_order.status = 'rework'
                assembly_order.testing_passed = False
                db.session.commit()
                return {'message': 'Product sent back to assembly due to failed tests', 'failedTests': [k for k,v in test_results.items() if not v]}

            # If all passed, mark testing_passed True
            assembly_order.testing_passed = True
            db.session.commit()

        # Check if already in showroom
        existing = ShowroomProduct.query.filter_by(
            production_order_id=assembly_order.production_order_id
        ).first()

        if existing:
            raise ValueError('Product already in showroom')

        # Calculate sale price (cost + markup)
        estimated_cost = 100.0  # You can calculate this based on materials
        sale_price = estimated_cost * 1.5  # 50% markup

        # Create showroom product
        showroom_product = ShowroomProduct(
            name=assembly_order.product_name,
            category='Manufactured',  # Or get from production order
            cost_price=estimated_cost,
            sale_price=sale_price,
            showroom_status='available',
            production_order_id=assembly_order.production_order_id
        )

        db.session.add(showroom_product)
        db.session.commit()

        # Return in expected format
        return {
            'id': showroom_product.id,
            'productName': showroom_product.name,
            'quantity': assembly_order.quantity,  # Use actual quantity from assembly
            'showroomStatus': 'displayed',
            'displayedAt': showroom_product.created_at.isoformat(),
            'salePrice': showroom_product.sale_price,
            'customerInterest': 8,
            'qualityRating': 5,
            'productionOrderId': showroom_product.production_order_id
        }

    # Removed mark_product_sold method - selling is handled by Sales department

    @staticmethod
    def send_back_to_assembly(product_id, test_results=None):
        """Send a product back to assembly for rework due to failed tests"""
        from models import AssemblyTestResult, AssemblyOrder

        # Get the assembly order
        assembly_order = AssemblyOrder.query.get(product_id)
        if not assembly_order:
            raise ValueError('Assembly order not found')

        if assembly_order.status != 'completed':
            raise ValueError('Product must be completed first')

        # Process test results if provided
        if test_results:
            # Clear existing test results for this assembly order
            AssemblyTestResult.query.filter_by(assembly_order_id=assembly_order.id).delete()

            for test_type, passed in test_results.items():
                test_name = {
                    'UT': 'Unit Testing',
                    'IT': 'Integration Testing',
                    'ST': 'System Testing',
                    'AT': 'Acceptance Testing'
                }.get(test_type, 'Unknown Test')

                result = 'pass' if passed else 'fail'

                test_result = AssemblyTestResult(
                    assembly_order_id=assembly_order.id,
                    test_type=test_type,
                    test_name=test_name,
                    result=result
                )
                db.session.add(test_result)

            # Update assembly order status to rework
            assembly_order.status = 'rework'
            assembly_order.testing_passed = False
            db.session.commit()

        else:
            raise ValueError('Test results required to send back to assembly')

        return {'message': 'Product sent back to assembly for rework'}
