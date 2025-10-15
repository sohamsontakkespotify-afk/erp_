"""
Production-related database models
"""
from datetime import datetime
from . import db

class ProductionOrder(db.Model):
    """Model for production orders"""
    
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending_materials')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))
    
    def to_dict(self):
        """Convert model instance to dictionary with fixed IST timestamp"""
        try:
            from zoneinfo import ZoneInfo
            ist = ZoneInfo("Asia/Kolkata")
            created_utc = self.created_at
            if created_utc.tzinfo is None:
                from datetime import timezone
                created_utc = created_utc.replace(tzinfo=timezone.utc)
            created_ist = created_utc.astimezone(ist)
            created_fixed = created_ist.strftime("%Y-%m-%d %H:%M:%S %Z")
        except Exception:
            created_fixed = self.created_at.isoformat()

        return {
            'id': self.id,
            'productName': self.product_name,
            'category': self.category,
            'quantity': self.quantity,
            'status': self.status,
            'createdAt': created_fixed,
            'createdBy': self.created_by
        }

class AssemblyOrder(db.Model):
    """Model for assembly orders"""

    id = db.Column(db.Integer, primary_key=True)
    production_order_id = db.Column(db.Integer, db.ForeignKey('production_order.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending')
    progress = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Optional tracking fields
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    paused_at = db.Column(db.DateTime, nullable=True)
    resumed_at = db.Column(db.DateTime, nullable=True)
    quality_check = db.Column(db.Boolean, default=False)
    testing_passed = db.Column(db.Boolean, default=False)

    # Test results relationship
    test_results = db.relationship('AssemblyTestResult', backref='assembly_order', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert model instance to dictionary with fixed IST created timestamp"""
        # Format createdAt as a fixed Asia/Kolkata time string to match Purchase
        try:
            from zoneinfo import ZoneInfo
            ist = ZoneInfo("Asia/Kolkata")
            created_utc = self.created_at
            if created_utc.tzinfo is None:
                from datetime import timezone
                created_utc = created_utc.replace(tzinfo=timezone.utc)
            created_ist = created_utc.astimezone(ist)
            created_fixed = created_ist.strftime("%Y-%m-%d %H:%M:%S %Z")
        except Exception:
            created_fixed = self.created_at.isoformat()

        return {
            'id': self.id,
            'productionOrderId': self.production_order_id,
            'productName': self.product_name,
            'quantity': self.quantity,
            'status': self.status,
            'progress': self.progress if self.progress is not None else 0,
            'createdAt': created_fixed,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'pausedAt': self.paused_at.isoformat() if self.paused_at else None,
            'resumedAt': self.resumed_at.isoformat() if self.resumed_at else None,
            'qualityCheck': self.quality_check,
            'testingPassed': self.testing_passed
        }


class AssemblyTestResult(db.Model):
    """Model for tracking individual test results for assembly orders"""

    id = db.Column(db.Integer, primary_key=True)
    assembly_order_id = db.Column(db.Integer, db.ForeignKey('assembly_order.id'), nullable=False)
    test_type = db.Column(db.String(10), nullable=False)  # UT, IT, ST, AT
    test_name = db.Column(db.String(100), nullable=False)
    result = db.Column(db.String(10), nullable=False)  # 'pass', 'fail'
    tested_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'assemblyOrderId': self.assembly_order_id,
            'testType': self.test_type,
            'testName': self.test_name,
            'result': self.result,
            'testedAt': self.tested_at.isoformat(),
            'notes': self.notes
        }
