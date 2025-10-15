"""
Sales-related database models
"""
from datetime import datetime
from . import db

class SalesOrder(db.Model):
    """Model for sales orders"""
    
    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_name = db.Column(db.String(200), nullable=False)
    customer_contact = db.Column(db.String(100), nullable=True)
    customer_email = db.Column(db.String(200), nullable=True)
    customer_address = db.Column(db.String(400), nullable=True)
    showroom_product_id = db.Column(db.Integer, db.ForeignKey('showroom_product.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    discount_amount = db.Column(db.Float, default=0.0)
    transport_cost = db.Column(db.Float, default=0.0)
    final_amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)  # cash, card, bank_transfer, etc.
    payment_status = db.Column(db.String(50), default='pending')  # pending, partial, completed
    order_status = db.Column(db.String(50), default='pending')  # pending, confirmed, pending_transport_approval, delivered, cancelled
    sales_person = db.Column(db.String(100), nullable=False)
    Delivery_type = db.Column('Delivery_type', db.Enum('company delivery', 'self delivery', 'part load', 'free delivery'), default='company delivery')  # ENUM values
    notes = db.Column(db.Text, nullable=True)
    # Coupon/finance-bypass fields
    coupon_code = db.Column(db.String(50), nullable=True)
    finance_bypass = db.Column(db.Boolean, default=False)
    bypass_reason = db.Column(db.Text, nullable=True)
    bypassed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    showroom_product = db.relationship('ShowroomProduct', backref='sales_orders')
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        # Compute payment aggregates by querying database directly to ensure accuracy
        total_paid = 0.0
        try:
            # Query database directly for current payment transactions
            from . import db
            payment_sum = db.session.query(db.func.coalesce(db.func.sum(SalesTransaction.amount), 0)).filter_by(
                sales_order_id=self.id,
                transaction_type='payment'
            ).scalar()
            total_paid = float(payment_sum or 0)
        except Exception:
            total_paid = 0.0
        balance_amount = float(self.final_amount or 0) - float(total_paid or 0)

        return {
            'id': self.id,
            'orderNumber': self.order_number,
            'customerName': self.customer_name,
            'customerContact': self.customer_contact,
            'customerEmail': self.customer_email,
            'customerAddress': self.customer_address,
            'showroomProductId': self.showroom_product_id,
            'quantity': self.quantity,
            'unitPrice': self.unit_price,
            'totalAmount': self.total_amount,
            'discountAmount': self.discount_amount,
            'transportCost': self.transport_cost,
            'finalAmount': self.final_amount,
            'amountPaid': total_paid,
            'balanceAmount': max(balance_amount, 0.0),
            'paymentMethod': self.payment_method,
            'paymentStatus': self.payment_status,
            'orderStatus': self.order_status,
            'salesPerson': self.sales_person,
            'deliveryType': self.Delivery_type,
            'notes': self.notes,
            'couponCode': self.coupon_code,
            'financeBypass': self.finance_bypass,
            'bypassReason': self.bypass_reason,
            'bypassedAt': self.bypassed_at.isoformat() if self.bypassed_at else None,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'showroomProduct': self.showroom_product.to_dict() if self.showroom_product else None
        }

class Customer(db.Model):
    """Model for customer information"""
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    contact = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(200), nullable=True)
    address = db.Column(db.String(400), nullable=True)
    customer_type = db.Column(db.String(50), default='retail')  # retail, wholesale, corporate
    credit_limit = db.Column(db.Float, default=0.0)
    current_balance = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'contact': self.contact,
            'email': self.email,
            'address': self.address,
            'customerType': self.customer_type,
            'creditLimit': self.credit_limit,
            'currentBalance': self.current_balance,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class TransportApprovalRequest(db.Model):
    """Model for transport approval requests for orders with part load and company delivery"""
    
    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_order.id'), nullable=False)
    delivery_type = db.Column(db.String(50), nullable=False)  # 'part load' or 'company delivery'
    original_transport_cost = db.Column(db.Float, default=0.0)
    requested_transport_cost = db.Column(db.Float, nullable=True)  # Transport's demanded cost
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected, awaiting_sales_confirmation
    transport_notes = db.Column(db.Text, nullable=True)  # Transport's rejection reason or notes
    demand_amount = db.Column(db.Float, nullable=True)  # Amount demanded by transport
    approved_by = db.Column(db.String(100), nullable=True)  # Transport user who approved/rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    sales_order = db.relationship('SalesOrder', backref='transport_approval_requests')
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'salesOrderId': self.sales_order_id,
            'deliveryType': self.delivery_type,
            'originalTransportCost': self.original_transport_cost,
            'requestedTransportCost': self.requested_transport_cost,
            'status': self.status,
            'transportNotes': self.transport_notes,
            'demandAmount': self.demand_amount,
            'approvedBy': self.approved_by,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'salesOrder': self.sales_order.to_dict() if self.sales_order else None
        }


class SalesTransaction(db.Model):
    """Model for sales transactions/payments"""
    
    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_order.id'), nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)  # payment, refund, adjustment
    amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    reference_number = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    sales_order = db.relationship('SalesOrder', backref='transactions')
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'salesOrderId': self.sales_order_id,
            'transactionType': self.transaction_type,
            'amount': self.amount,
            'paymentMethod': self.payment_method,
            'referenceNumber': self.reference_number,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat()
        }
