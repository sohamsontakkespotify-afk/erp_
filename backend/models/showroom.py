"""
Showroom-related database models
"""
from datetime import datetime
from . import db

class ShowroomProduct(db.Model):
    """Model for showroom products"""
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    cost_price = db.Column(db.Float, default=0.0)
    sale_price = db.Column(db.Float, default=0.0)
    showroom_status = db.Column(db.String(50), default='available')  # available, sold, reserved
    production_order_id = db.Column(db.Integer, db.ForeignKey('production_order.id'), nullable=True)
    sold_date = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'costPrice': self.cost_price,
            'salePrice': self.sale_price,
            'showroomStatus': self.showroom_status,
            'productionOrderId': self.production_order_id,
            'soldDate': self.sold_date.isoformat() if self.sold_date else None,
            'createdAt': self.created_at.isoformat()
        }
    
    # Removed mark_as_sold method - selling is handled by Sales department

class DispatchRequest(db.Model):
    """Model for dispatch requests"""

    id = db.Column(db.Integer, primary_key=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_order.id'), nullable=False)
    showroom_product_id = db.Column(db.Integer, db.ForeignKey('showroom_product.id'), nullable=False)
    party_name = db.Column(db.String(200), nullable=False)
    party_contact = db.Column(db.String(100), nullable=True)
    party_address = db.Column(db.String(400), nullable=True)
    party_email = db.Column(db.String(200), nullable=True)
    quantity = db.Column(db.Integer, nullable=False)
    delivery_type = db.Column(db.String(20), nullable=False)  # 'self' or 'transport'
    original_delivery_type = db.Column(db.String(50), nullable=True)  # Store original delivery type from sales
    status = db.Column(db.String(50), default='pending')  # pending, customer_details_required, ready_for_pickup, assigned_transport, in_transit, completed, cancelled
    dispatch_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'salesOrderId': self.sales_order_id,
            'showroomProductId': self.showroom_product_id,
            'partyName': self.party_name,
            'partyContact': self.party_contact,
            'partyAddress': self.party_address,
            'partyEmail': self.party_email,
            'quantity': self.quantity,
            'deliveryType': self.delivery_type,
            'originalDeliveryType': self.original_delivery_type,
            'status': self.status,
            'dispatchNotes': self.dispatch_notes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class TransportJob(db.Model):
    """Model for transport jobs"""
    
    id = db.Column(db.Integer, primary_key=True)
    dispatch_request_id = db.Column(db.Integer, db.ForeignKey('dispatch_request.id'), nullable=False)
    transporter_name = db.Column(db.String(200), nullable=True)
    vehicle_no = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), default='pending')  # pending, assigned, in_transit, delivered, cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'dispatchRequestId': self.dispatch_request_id,
            'transporterName': self.transporter_name,
            'vehicleNo': self.vehicle_no,
            'status': self.status,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class GatePass(db.Model):
    """Model for gate passes"""

    id = db.Column(db.Integer, primary_key=True)
    dispatch_request_id = db.Column(db.Integer, db.ForeignKey('dispatch_request.id'), nullable=False)
    party_name = db.Column(db.String(200), nullable=False)
    vehicle_no = db.Column(db.String(100), nullable=True)  # for self pickup
    driver_name = db.Column(db.String(200), nullable=True)  # Made nullable for flexibility
    driver_contact = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), default='pending')  # pending, verified, released
    issued_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'dispatchRequestId': self.dispatch_request_id,
            'partyName': self.party_name,
            'vehicleNo': self.vehicle_no,
            'driverName': self.driver_name,
            'driverContact': self.driver_contact,
            'status': self.status,
            'issuedAt': self.issued_at.isoformat(),
            'verifiedAt': self.verified_at.isoformat() if self.verified_at else None
        }

class Vehicle(db.Model):
    """Model for fleet vehicles"""
    
    id = db.Column(db.Integer, primary_key=True)
    vehicle_number = db.Column(db.String(100), unique=True, nullable=False)
    vehicle_type = db.Column(db.String(50), nullable=False)  # truck, van, pickup, etc.
    driver_name = db.Column(db.String(200), nullable=True)
    driver_contact = db.Column(db.String(100), nullable=True)
    driver_license = db.Column(db.String(100), nullable=True)
    capacity = db.Column(db.String(100), nullable=True)  # weight or volume capacity
    status = db.Column(db.String(50), default='available')  # available, assigned, maintenance, out_of_service
    current_location = db.Column(db.String(200), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'vehicleNumber': self.vehicle_number,
            'vehicleType': self.vehicle_type,
            'driverName': self.driver_name,
            'driverContact': self.driver_contact,
            'driverLicense': self.driver_license,
            'capacity': self.capacity,
            'status': self.status,
            'currentLocation': self.current_location,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
