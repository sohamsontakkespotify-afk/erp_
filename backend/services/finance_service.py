"""
Finance Service Module
Handles business logic for finance operations
"""
from datetime import datetime
from models import db, PurchaseOrder, ProductionOrder, FinanceTransaction, ShowroomProduct, SalesOrder, SalesTransaction
import json
import traceback


class FinanceService:
    """Service class for finance operations"""
    
    @staticmethod
    def get_purchase_orders_for_approval():
        """Get purchase orders that need finance approval"""
        orders = PurchaseOrder.query.filter_by(
            status='pending_finance_approval'
        ).order_by(PurchaseOrder.created_at.desc()).all()
        return [order.to_dict() for order in orders]
    
    @staticmethod
    def approve_purchase_order(order_id, approved=True):
        """Approve or reject a purchase order from finance perspective"""
        order = PurchaseOrder.query.get(order_id)
        if not order:
            raise ValueError('Purchase order not found')
        
        if approved:
            order.status = 'finance_approved'
            
            # Calculate total cost and create expense transaction
            materials = json.loads(order.materials) if order.materials else []
            total_cost = sum(
                material.get('quantity', 0) * material.get('unit_cost', 0)
                for material in materials
            )
            
            # Create expense transaction
            expense_transaction = FinanceTransaction(
                transaction_type='expense',
                amount=total_cost,
                description=f'Purchase order #{order.id} - {order.product_name}',
                reference_id=order.id,
                reference_type='purchase_order'
            )
            db.session.add(expense_transaction)
            
            # Update production order status
            production_order = ProductionOrder.query.get(order.production_order_id)
            if production_order:
                production_order.status = 'materials_approved'
        else:
            order.status = 'finance_rejected'
            
            # Update production order status
            production_order = ProductionOrder.query.get(order.production_order_id)
            if production_order:
                production_order.status = 'finance_rejected'
        
        db.session.commit()
        
        return {
            'message': f'Purchase order {"approved" if approved else "rejected"}',
            'purchaseOrder': order.to_dict()
        }
    
    @staticmethod
    def get_dashboard_data():
        """Get financial summary for dashboard"""
        try:
            # Calculate total revenue from sold products
            sold_products = ShowroomProduct.query.filter_by(showroom_status='sold').all()
            total_revenue = sum(product.sale_price or 0 for product in sold_products)

            # Calculate total expenses from approved purchase orders
            approved_orders = PurchaseOrder.query.filter(
                PurchaseOrder.status.in_(['finance_approved', 'purchased', 'verified_in_store'])
            ).all()

            total_expenses = 0
            for order in approved_orders:
                try:
                    materials = json.loads(order.materials) if order.materials else []
                    order_cost = sum(material.get('quantity', 0) * material.get('unit_cost', 0) for material in materials if isinstance(material, dict))
                    total_expenses += order_cost
                except (json.JSONDecodeError, TypeError, AttributeError) as e:
                    continue

            net_profit = total_revenue - total_expenses

            # Get recent transactions
            recent_transactions = FinanceTransaction.query.order_by(
                FinanceTransaction.created_at.desc()
            ).limit(10).all()

            # Get pending approvals count
            pending_count = PurchaseOrder.query.filter_by(status='pending_finance_approval').count()

            result = {
                'totalRevenue': float(total_revenue),
                'totalExpenses': float(total_expenses),
                'netProfit': float(net_profit),
                'recentTransactions': [txn.to_dict() for txn in recent_transactions],
                'pendingApprovals': pending_count
            }

            return result

        except Exception as e:
            # Return default values instead of raising
            return {
                'totalRevenue': 0.0,
                'totalExpenses': 0.0,
                'netProfit': 0.0,
                'recentTransactions': [],
                'pendingApprovals': 0,
                'error': str(e)
            }
    
    @staticmethod
    def get_transactions(transaction_type=None, limit=50):
        """Get all financial transactions with filtering"""
        query = FinanceTransaction.query
        
        if transaction_type:
            query = query.filter_by(transaction_type=transaction_type)
            
        transactions = query.order_by(
            FinanceTransaction.created_at.desc()
        ).limit(limit).all()
        
        return [txn.to_dict() for txn in transactions]
    
    @staticmethod
    def create_expense_transaction(amount, description, reference_id=None, reference_type=None):
        """Create an expense transaction"""
        transaction = FinanceTransaction(
            transaction_type='expense',
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction.to_dict()

    @staticmethod
    def get_sales_payments_pending_approval():
        """Sales orders payments awaiting finance approval"""
        orders = SalesOrder.query.filter_by(payment_status='pending_finance_approval').order_by(SalesOrder.created_at.desc()).all()
        enriched = []
        for o in orders:
            data = o.to_dict()
            try:
                # Find the most recent payment transaction
                payment_txns = [t for t in getattr(o, 'transactions', []) if getattr(t, 'transaction_type', '') == 'payment']
                payment_txns.sort(key=lambda t: getattr(t, 'created_at', None) or datetime.min, reverse=True)
                last_amount = float(payment_txns[0].amount) if payment_txns else 0.0
            except Exception:
                last_amount = 0.0
            data['pendingApprovalAmount'] = last_amount
            enriched.append(data)
        return enriched

    @staticmethod
    def approve_sales_payment(order_id, approved=True):
        """Approve or reject sales payment"""
        order = SalesOrder.query.get(order_id)
        if not order:
            raise ValueError('Sales order not found')

        if order.payment_status != 'pending_finance_approval':
            raise ValueError('No pending finance approval for this order')

        if approved:
            # Query database directly for accurate payment total
            total_paid = db.session.query(db.func.coalesce(db.func.sum(SalesTransaction.amount), 0)).filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).scalar() or 0
            
            if total_paid >= order.final_amount:
                order.payment_status = 'completed'
            elif total_paid > 0:
                order.payment_status = 'partial'
            else:
                order.payment_status = 'pending'
        else:
            # When finance rejects, find and delete the most recent payment transaction
            # Query for the most recent payment transaction for this order
            most_recent_payment = SalesTransaction.query.filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).order_by(SalesTransaction.created_at.desc()).first()
            
            if most_recent_payment:
                # Delete the most recent payment transaction
                db.session.delete(most_recent_payment)
                db.session.flush()  # Ensure deletion is processed
                
                # Refresh the order to get updated relationships
                db.session.refresh(order)

            # Recalculate total paid amount after deletion
            remaining_payments = SalesTransaction.query.filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).all()
            
            total_paid_remaining = sum(t.amount for t in remaining_payments)

            # Set status based on remaining payments
            if total_paid_remaining >= order.final_amount:
                order.payment_status = 'completed'
            elif total_paid_remaining > 0:
                order.payment_status = 'partial'
            else:
                order.payment_status = 'pending'

        db.session.commit()
        
        # Refresh the order one more time to ensure all relationships are current
        db.session.refresh(order)
        return order.to_dict()
    
    @staticmethod
    def create_revenue_transaction(amount, description, reference_id=None, reference_type=None):
        """Create a revenue transaction"""
        transaction = FinanceTransaction(
            transaction_type='revenue',
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction.to_dict()
