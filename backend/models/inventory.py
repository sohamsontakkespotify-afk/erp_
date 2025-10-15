"""
Inventory-related database models
"""
from datetime import datetime
from . import db

class StoreInventory(db.Model):
    """Model for store inventory items"""
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    category = db.Column(db.String(50), nullable=False, default='Raw Material')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'quantity': self.quantity,
            'category': self.category,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def is_sufficient_for(self, required_quantity):
        """Check if current stock is sufficient for required quantity"""
        return self.quantity >= required_quantity
    
    def allocate(self, quantity):
        """Allocate specified quantity from inventory"""
        if quantity > self.quantity:
            raise ValueError(f"Insufficient stock. Available: {self.quantity}, Required: {quantity}")
        
        self.quantity -= quantity
        self.updated_at = datetime.utcnow()
        return self.quantity
    
    def add_stock(self, quantity):
        """Add stock to inventory"""
        self.quantity += quantity
        self.updated_at = datetime.utcnow()
        return self.quantity