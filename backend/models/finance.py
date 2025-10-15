"""
Finance-related database models
"""
from datetime import datetime
from . import db

class FinanceTransaction(db.Model):
    """Model for financial transactions"""
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'revenue' or 'expense'
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(500))
    reference_id = db.Column(db.Integer)  # Can reference purchase_order_id or showroom_product_id
    reference_type = db.Column(db.String(50))  # 'purchase_order' or 'product_sale'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'transactionType': self.transaction_type,
            'amount': self.amount,
            'description': self.description,
            'referenceId': self.reference_id,
            'referenceType': self.reference_type,
            'createdAt': self.created_at.isoformat()
        }
    
    @classmethod
    def create_expense(cls, amount, description, reference_id=None, reference_type=None):
        """Create an expense transaction"""
        return cls(
            transaction_type='expense',
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type
        )
    
    @classmethod
    def create_revenue(cls, amount, description, reference_id=None, reference_type=None):
        """Create a revenue transaction"""
        return cls(
            transaction_type='revenue',
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type
        )