from datetime import datetime
from . import db


class PartLoadDetail(db.Model):
    __tablename__ = 'part_load_detail'

    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_order.id'), nullable=False)
    customer_name = db.Column(db.String(200), nullable=True)  # Moved up after sales_order_id
    product_name = db.Column(db.String(200), nullable=True)   # Moved up after customer_name
    lr_no = db.Column(db.String(100), nullable=True)
    loading_date = db.Column(db.DateTime, nullable=True)
    unloading_date = db.Column(db.DateTime, nullable=True)
    expected_delivery_date = db.Column(db.DateTime, nullable=True)
    actual_delivery_date = db.Column(db.DateTime, nullable=True)
    payment_type = db.Column(db.Enum('to_pay', 'paid'), nullable=False, default='to_pay')
    transporter_name = db.Column(db.String(200), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'salesOrderId': self.sales_order_id,
            'lrNo': self.lr_no,
            'loadingDate': self.loading_date.isoformat() if self.loading_date else None,
            'unloadingDate': self.unloading_date.isoformat() if self.unloading_date else None,
            'expectedDeliveryDate': self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            'paymentType': self.payment_type,
            'transporterName': self.transporter_name,
            'customerName': self.customer_name,
            'productName': self.product_name,
            'notes': self.notes,
            'actualDeliveryDate': self.actual_delivery_date.isoformat() if self.actual_delivery_date else None,
        }
