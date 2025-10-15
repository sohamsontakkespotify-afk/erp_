"""
Approval system for orders requiring admin verification
"""
from datetime import datetime
from . import db

class ApprovalRequest(db.Model):
    """Model for approval requests requiring admin verification"""
    
    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_order.id'), nullable=False)
    request_type = db.Column(db.String(50), nullable=False)  # 'coupon_applied', 'finance_bypass', etc.
    requested_by = db.Column(db.String(100), nullable=False)  # User who created the request
    request_details = db.Column(db.Text, nullable=False)  # Details about the request
    coupon_code = db.Column(db.String(50), nullable=True)  # Applied coupon code
    discount_amount = db.Column(db.Float, nullable=True)  # Discount amount applied
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    approved_by = db.Column(db.String(100), nullable=True)  # Admin who approved/rejected
    approval_notes = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(20), default='normal')  # normal, high, urgent
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    sales_order = db.relationship('SalesOrder', backref='approval_requests')
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'salesOrderId': self.sales_order_id,
            'requestType': self.request_type,
            'requestedBy': self.requested_by,
            'requestDetails': self.request_details,
            'couponCode': self.coupon_code,
            'discountAmount': self.discount_amount,
            'status': self.status,
            'approvedBy': self.approved_by,
            'approvalNotes': self.approval_notes,
            'priority': self.priority,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'salesOrder': self.sales_order.to_dict() if self.sales_order else None
        }
