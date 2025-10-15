"""
Approval Service Module
Handles business logic for approval requests requiring admin verification
"""
from datetime import datetime
from models import db, ApprovalRequest, SalesOrder, ShowroomProduct

class ApprovalService:
    """Service class for approval operations"""
    
    @staticmethod
    def create_coupon_approval_request(sales_order_id, requested_by, coupon_code, discount_amount, request_details):
        """Create an approval request for coupon application"""
        try:
            # Check if approval request already exists for this order
            existing_request = ApprovalRequest.query.filter_by(
                sales_order_id=sales_order_id,
                request_type='coupon_applied',
                status='pending'
            ).first()
            
            if existing_request:
                return {
                    'status': 'success',
                    'message': 'Approval request already exists for this order',
                    'approvalRequest': existing_request.to_dict()
                }
            
            # Create new approval request
            approval_request = ApprovalRequest(
                sales_order_id=sales_order_id,
                request_type='coupon_applied',
                requested_by=requested_by,
                request_details=request_details,
                coupon_code=coupon_code,
                discount_amount=discount_amount,
                priority='normal'
            )
            
            db.session.add(approval_request)
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Approval request created successfully',
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error creating approval request: {str(e)}")
            
    @staticmethod
    def create_free_delivery_approval_request(sales_order_id, requested_by, request_details):
        """Create an approval request for free delivery"""
        try:
            # Check if approval request already exists for this order
            existing_request = ApprovalRequest.query.filter_by(
                sales_order_id=sales_order_id,
                request_type='free_delivery',
                status='pending'
            ).first()
            
            if existing_request:
                return {
                    'status': 'success',
                    'message': 'Free delivery approval request already exists for this order',
                    'approvalRequest': existing_request.to_dict()
                }
            
            # Create new approval request
            approval_request = ApprovalRequest(
                sales_order_id=sales_order_id,
                request_type='free_delivery',
                requested_by=requested_by,
                request_details=request_details,
                priority='normal'
            )
            
            db.session.add(approval_request)
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Free delivery approval request created successfully',
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error creating free delivery approval request: {str(e)}")
    
    @staticmethod
    def get_pending_approvals():
        """Get all pending approval requests"""
        try:
            # Get both explicit approval requests and orders pending free delivery approval
            approval_requests = ApprovalRequest.query.filter_by(status='pending').all()
            
            # Also get orders that need free delivery approval but don't have an approval request yet
            pending_free_delivery_orders = SalesOrder.query.filter_by(
                order_status='pending_free_delivery_approval'
            ).all()
            
            approvals = []
            
            # Process existing approval requests
            for request in approval_requests:
                sales_order = SalesOrder.query.get(request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id) if sales_order else None
                
                approval_data = request.to_dict()
                if sales_order:
                    approval_data['orderNumber'] = sales_order.order_number
                    approval_data['customerName'] = sales_order.customer_name
                    approval_data['finalAmount'] = sales_order.final_amount
                    approval_data['quantity'] = sales_order.quantity
                    approval_data['productName'] = showroom_product.name if showroom_product else 'Unknown Product'
                    approval_data['requestType'] = request.request_type
                    approval_data['requestDetails'] = request.request_details
                    approval_data['coupon_code'] = request.coupon_code if request.request_type == 'coupon_applied' else None
                    if request.request_type == 'free_delivery':
                        approval_data['deliveryType'] = 'free delivery'
                
                approvals.append(approval_data)
            
            # Process orders pending free delivery approval that don't have approval requests yet
            for order in pending_free_delivery_orders:
                # Check if an approval request already exists for this order
                existing_request = ApprovalRequest.query.filter_by(
                    sales_order_id=order.id,
                    request_type='free_delivery',
                    status='pending'
                ).first()
                
                if not existing_request:
                    # Create a new approval request for this order
                    approval_request = ApprovalRequest(
                        sales_order_id=order.id,
                        request_type='free_delivery',
                        requested_by=order.sales_person,
                        request_details=f"Free delivery request for order {order.order_number}",
                        priority='normal'
                    )
                    
                    db.session.add(approval_request)
                    db.session.commit()
                    
                    showroom_product = ShowroomProduct.query.get(order.showroom_product_id) if order else None
                    
                    approval_data = approval_request.to_dict()
                    approval_data.update({
                        'orderNumber': order.order_number,
                        'customerName': order.customer_name,
                        'finalAmount': order.final_amount,
                        'quantity': order.quantity,
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'requestType': 'free_delivery',
                        'deliveryType': 'free delivery',
                        'requestDetails': f"Free delivery request for order {order.order_number}"
                    })
                    
                    approvals.append(approval_data)
            
            return {
                'status': 'success',
                'approvals': approvals
            }
        except Exception as e:
            raise Exception(f"Error fetching pending approvals: {str(e)}")
    
    @staticmethod
    def approve_request(approval_id, approved_by, approval_notes=None):
        """Approve an approval request"""
        try:
            approval_request = ApprovalRequest.query.get(approval_id)
            if not approval_request:
                return {
                    'status': 'error',
                    'message': 'Approval request not found'
                }
            
            if approval_request.status != 'pending':
                return {
                    'status': 'error',
                    'message': 'Approval request is not pending'
                }
            
            # Update approval request
            approval_request.status = 'approved'
            approval_request.approved_by = approved_by
            approval_request.approval_notes = approval_notes
            approval_request.updated_at = datetime.utcnow()
            
            # Update the sales order based on approval type
            sales_order = SalesOrder.query.get(approval_request.sales_order_id)
            if sales_order:
                if approval_request.request_type == 'free_delivery':
                    # Handle free delivery approval
                    sales_order.Delivery_type = 'free delivery'  # Update delivery type
                    sales_order.transport_cost = 0  # Set transport cost to 0
                    sales_order.order_status = 'confirmed'  # Confirm the order
                    sales_order.bypass_reason = f"Admin approved free delivery. Approval ID: {approval_request.id}"
                else:
                    # Handle coupon approval
                    sales_order.finance_bypass = True
                    sales_order.bypass_reason = f"Admin approved coupon bypass. Approval ID: {approval_request.id}"
                
                sales_order.bypassed_at = datetime.utcnow()
                sales_order.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Approval request approved successfully',
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error approving request: {str(e)}")
    
    @staticmethod
    def reject_request(approval_id, approved_by, approval_notes):
        """Reject an approval request"""
        try:
            approval_request = ApprovalRequest.query.get(approval_id)
            if not approval_request:
                return {
                    'status': 'error',
                    'message': 'Approval request not found'
                }
            
            if approval_request.status != 'pending':
                return {
                    'status': 'error',
                    'message': 'Approval request is not pending'
                }
            
            # Update approval request
            approval_request.status = 'rejected'
            approval_request.approved_by = approved_by
            approval_request.approval_notes = approval_notes
            approval_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Approval request rejected',
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error rejecting request: {str(e)}")
    
    @staticmethod
    def get_all_approvals():
        """Get all approval requests (pending, approved, rejected)"""
        try:
            approval_requests = ApprovalRequest.query.order_by(ApprovalRequest.created_at.desc()).all()
            
            approvals = []
            for request in approval_requests:
                sales_order = SalesOrder.query.get(request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id) if sales_order else None
                
                approval_data = request.to_dict()
                if sales_order:
                    approval_data['orderNumber'] = sales_order.order_number
                    approval_data['customerName'] = sales_order.customer_name
                    approval_data['finalAmount'] = sales_order.final_amount
                    approval_data['productName'] = showroom_product.name if showroom_product else 'Unknown Product'
                
                approvals.append(approval_data)
            
            return approvals
        except Exception as e:
            raise Exception(f"Error fetching all approvals: {str(e)}")
