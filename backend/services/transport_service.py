"""
Transport Service Module
Handles business logic for transport operations (company delivery orders)
"""
from datetime import datetime, timedelta
from models import db, TransportJob, DispatchRequest, SalesOrder, ShowroomProduct, Vehicle
from models.sales import TransportApprovalRequest, SalesTransaction
from models.showroom import GatePass
from models.transport import PartLoadDetail
from services.notification_service import NotificationService


class TransportService:
    @staticmethod
    def fill_part_load_after_delivery(order_identifier, delivery_data):
        """Fill after-delivery details for completed part load order using various identifiers"""
        from models import db, TransportJob, DispatchRequest, SalesOrder
        
        # Try to find the order using different approaches
        transport_job = None
        dispatch_request = None
        sales_order = None
        
        # First, try to get it as a transport job ID
        if isinstance(order_identifier, int) or (isinstance(order_identifier, str) and order_identifier.isdigit()):
            transport_job = TransportJob.query.get(int(order_identifier))
        
        # If not found as transport job, try as dispatch request ID
        if not transport_job:
            dispatch_request = DispatchRequest.query.get(int(order_identifier)) if str(order_identifier).isdigit() else None
            if dispatch_request:
                # Find the corresponding transport job
                transport_job = TransportJob.query.filter_by(dispatch_request_id=dispatch_request.id).first()
        
        # If still not found, try to find by order number
        if not transport_job and isinstance(order_identifier, str):
            # Try to find sales order by order number
            sales_order = SalesOrder.query.filter_by(order_number=order_identifier).first()
            if sales_order:
                # Find dispatch request for this sales order
                dispatch_request = DispatchRequest.query.filter_by(sales_order_id=sales_order.id).first()
                if dispatch_request:
                    # Find transport job for this dispatch request
                    transport_job = TransportJob.query.filter_by(dispatch_request_id=dispatch_request.id).first()
        
        # If we found a transport job, get the related records
        if transport_job:
            if not dispatch_request:
                dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id)
            if not sales_order and dispatch_request:
                sales_order = SalesOrder.query.get(dispatch_request.sales_order_id) if dispatch_request.sales_order_id else None
        
        # If we still don't have what we need, try a different approach
        if not sales_order:
            # Try to find completed part load orders directly
            completed_dispatches = DispatchRequest.query.filter(
                DispatchRequest.original_delivery_type == 'part load',
                DispatchRequest.status == 'completed'
            ).all()
            
            # Also check verified gate passes
            from models.showroom import GatePass
            verified_dispatch_ids = (
                db.session.query(GatePass.dispatch_request_id)
                .filter(GatePass.status == 'verified')
                .distinct()
            )
            verified_dispatches = DispatchRequest.query.filter(
                DispatchRequest.original_delivery_type == 'part load',
                DispatchRequest.id.in_(verified_dispatch_ids)
            ).all()
            
            # Combine all completed dispatches
            all_dispatches = {d.id: d for d in completed_dispatches}
            for d in verified_dispatches:
                all_dispatches[d.id] = d
            
            # Try to match by ID or order number
            for dispatch in all_dispatches.values():
                if (str(dispatch.id) == str(order_identifier) or 
                    (dispatch.sales_order_id and 
                     SalesOrder.query.get(dispatch.sales_order_id) and
                     SalesOrder.query.get(dispatch.sales_order_id).order_number == str(order_identifier))):
                    dispatch_request = dispatch
                    if dispatch_request.sales_order_id:
                        sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    break
        
        # Final validation
        if not dispatch_request:
            raise Exception(f'No completed part load order found for identifier: {order_identifier}')
        
        if not dispatch_request.sales_order_id:
            raise Exception('No sales order associated with this dispatch request')
        
        if not sales_order:
            sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
            if not sales_order:
                raise Exception('Sales order not found')
        
        # Get customer and product names from sales order if available
        customer_name = sales_order.customer_name if sales_order else dispatch_request.party_name
        product_name = None
        if sales_order and sales_order.showroom_product_id:
            showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
            if showroom_product:
                product_name = showroom_product.name
        
        # Map frontend field names to backend expected names
        mapped_data = {
            'lrNo': delivery_data.get('lrNumber'),
            'loadingDate': delivery_data.get('loadingDate'),
            'unloadingDate': delivery_data.get('unloadingDate'),
            'actualDeliveryDate': delivery_data.get('deliveryDate'),
            'customerName': customer_name,
            'productName': product_name,
            'notes': delivery_data.get('notes')
        }
        
        # Call the update function with the sales order ID
        return TransportService.update_part_load_delivery_details(sales_order.id, mapped_data)
    """Service class for transport operations"""

    @staticmethod
    def create_part_load_detail(data):
        from models import db
        from models.transport import PartLoadDetail
        try:
            detail = PartLoadDetail(
                sales_order_id=data['salesOrderId'],
                lr_no=data['lrNo'],
                loading_date=data.get('loadingDate'),
                unloading_date=data.get('unloadingDate'),
                expected_delivery_date=data.get('expectedDeliveryDate'),
                actual_delivery_date=data.get('actualDeliveryDate'),
                payment_type=data.get('paymentType', 'to_pay'),
                transporter_name=data.get('transporterName'),
                customer_name=data.get('customerName'),
                product_name=data.get('productName'),
                notes=data.get('notes')
            )
            db.session.add(detail)
            db.session.commit()
            return detail.to_dict()
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error creating part load detail: {str(e)}")

    @staticmethod
    def get_completed_part_load_orders():
        """Get all completed part load orders: (1) completed in dispatch, or (2) with a verified gate pass."""
        try:
            # 1. Completed in dispatch
            completed_dispatches = DispatchRequest.query.filter(
                DispatchRequest.original_delivery_type == 'part load',
                DispatchRequest.status == 'completed'
            ).all()

            # 2. Verified by security (gate pass)
            verified_dispatch_ids = (
                db.session.query(GatePass.dispatch_request_id)
                .filter(GatePass.status == 'verified')
                .distinct()
            )
            verified_dispatches = DispatchRequest.query.filter(
                DispatchRequest.original_delivery_type == 'part load',
                DispatchRequest.id.in_(verified_dispatch_ids)
            ).all()

            # Combine and deduplicate
            all_dispatches = {d.id: d for d in completed_dispatches}
            for d in verified_dispatches:
                all_dispatches[d.id] = d

            orders = []
            for request in all_dispatches.values():
                # Get sales order if available
                sales_order = None
                if request.sales_order_id:
                    sales_order = SalesOrder.query.get(request.sales_order_id)

                # Get showroom product if available
                showroom_product = None
                if hasattr(request, 'showroom_product_id') and request.showroom_product_id:
                    showroom_product = ShowroomProduct.query.get(request.showroom_product_id)

                # Get part load details if exists
                part_load_detail = None
                if sales_order:
                    part_load_detail = PartLoadDetail.query.filter_by(sales_order_id=sales_order.id).first()

                # Find the transport job for this dispatch request
                transport_job = TransportJob.query.filter_by(dispatch_request_id=request.id).first()

                # Get gate pass for driver details
                gate_pass = GatePass.query.filter_by(dispatch_request_id=request.id).first()
                
                order_data = {
                    'id': request.id,  # Add this for compatibility
                    'dispatchId': request.id,
                    'transportJobId': transport_job.id if transport_job else request.id,  # Fallback to dispatch ID
                    'orderNumber': sales_order.order_number if sales_order else f'DR-{request.id}',
                    'customerName': request.party_name,
                    'customerContact': request.party_contact,
                    'customerAddress': request.party_address,
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': request.quantity,
                    'transporterName': getattr(request, 'transporter_name', None),
                    'vehicleNo': getattr(request, 'vehicle_no', None),
                    'completedAt': request.updated_at.isoformat() if request.updated_at else None,
                    'hasDeliveryDetails': False,
                    'status': request.status,
                    # Add driver details from gate pass
                    'driverName': gate_pass.driver_name if gate_pass else None,
                    'driverNumber': gate_pass.driver_contact if gate_pass else None,
                    'vehicleNumber': gate_pass.vehicle_no if gate_pass else None
                }

                # Add part load details if they exist
                if part_load_detail:
                    # Only mark as having delivery details if the required fields are filled
                    has_delivery_details = bool(
                        part_load_detail.lr_no and 
                        part_load_detail.loading_date and 
                        part_load_detail.unloading_date and 
                        part_load_detail.actual_delivery_date
                    )
                    order_data.update({
                        'hasDeliveryDetails': has_delivery_details,
                        'lrNo': part_load_detail.lr_no,
                        'loadingDate': part_load_detail.loading_date.isoformat() if part_load_detail.loading_date else None,
                        'unloadingDate': part_load_detail.unloading_date.isoformat() if part_load_detail.unloading_date else None,
                        'actualDeliveryDate': part_load_detail.actual_delivery_date.isoformat() if part_load_detail.actual_delivery_date else None,
                        'customerName': part_load_detail.customer_name or order_data['customerName'],
                        'productName': part_load_detail.product_name or order_data['productName'],
                        'notes': part_load_detail.notes
                    })

                orders.append(order_data)

            return orders
        except Exception as e:
            raise Exception(f"Error fetching completed part load orders: {str(e)}")

    @staticmethod
    def update_part_load_delivery_details(sales_order_id, delivery_data):
        """Update or create after-delivery details for a completed part load order"""
        from models import db
        from models.transport import PartLoadDetail
        try:
            # Validate required fields
            required_fields = ['lrNo', 'loadingDate', 'unloadingDate', 'actualDeliveryDate']
            for field in required_fields:
                if not delivery_data.get(field):
                    raise ValueError(f'{field} is required')
            
            # Get sales order for customer and product info if not provided
            if not delivery_data.get('customerName') or not delivery_data.get('productName'):
                sales_order = SalesOrder.query.get(sales_order_id)
                if sales_order:
                    if not delivery_data.get('customerName'):
                        delivery_data['customerName'] = sales_order.customer_name
                    if not delivery_data.get('productName') and sales_order.showroom_product_id:
                        showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
                        if showroom_product:
                            delivery_data['productName'] = showroom_product.name
            
            # Get existing part load detail or create new one
            part_load_detail = PartLoadDetail.query.filter_by(sales_order_id=sales_order_id).first()
            
            if not part_load_detail:
                # Create new part load detail
                part_load_detail = PartLoadDetail(sales_order_id=sales_order_id)
                db.session.add(part_load_detail)
            
            # Update fields
            part_load_detail.lr_no = delivery_data['lrNo']
            part_load_detail.loading_date = delivery_data['loadingDate']
            part_load_detail.unloading_date = delivery_data['unloadingDate']
            part_load_detail.actual_delivery_date = delivery_data['actualDeliveryDate']
            part_load_detail.notes = delivery_data.get('notes')
            part_load_detail.customer_name = delivery_data.get('customerName')
            part_load_detail.product_name = delivery_data.get('productName')
            part_load_detail.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Part load delivery details updated successfully',
                'deliveryDetails': part_load_detail.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating part load delivery details: {str(e)}")

    @staticmethod
    def get_pending_transport_approvals():
        """Get all pending transport approval requests"""
        try:
            approval_requests = TransportApprovalRequest.query.filter_by(status='pending').order_by(TransportApprovalRequest.created_at.desc()).all()
            
            approvals = []
            for request in approval_requests:
                sales_order = SalesOrder.query.get(request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id) if sales_order else None
                
                approval_data = request.to_dict()
                if sales_order:
                    approval_data['orderNumber'] = sales_order.order_number
                    approval_data['customerName'] = sales_order.customer_name
                    approval_data['customerContact'] = sales_order.customer_contact
                    approval_data['customerAddress'] = sales_order.customer_address
                    approval_data['finalAmount'] = sales_order.final_amount
                    approval_data['quantity'] = sales_order.quantity
                    approval_data['salesPerson'] = sales_order.sales_person
                    # Add transport cost mapping for frontend compatibility
                    approval_data['transportCost'] = request.original_transport_cost
                    approval_data['paymentStatus'] = sales_order.payment_status
                    approval_data['orderStatus'] = sales_order.order_status
                    
                if showroom_product:
                    approval_data['productName'] = showroom_product.name
                    
                approvals.append(approval_data)
            
            return approvals
        except Exception as e:
            raise Exception(f"Error fetching pending transport approvals: {str(e)}")
    
    @staticmethod
    def approve_transport_request(approval_id, approved_by=None):
        """Approve a transport approval request"""
        try:
            approval_request = TransportApprovalRequest.query.get(approval_id)
            if not approval_request:
                raise ValueError('Transport approval request not found')
            
            if approval_request.status != 'pending':
                raise ValueError('Request has already been processed')
            
            # Update approval request
            approval_request.status = 'approved'
            approval_request.approved_by = approved_by or 'Transport Department'
            approval_request.updated_at = datetime.utcnow()
            
            # Update sales order status to confirmed
            sales_order = SalesOrder.query.get(approval_request.sales_order_id)
            if sales_order:
                sales_order.order_status = 'confirmed'
                sales_order.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Transport approval request approved successfully',
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error approving transport request: {str(e)}")
    
    @staticmethod
    def reject_transport_request(approval_id, rejection_data):
        """Reject a transport approval request with demand amount"""
        try:
            approval_request = TransportApprovalRequest.query.get(approval_id)
            if not approval_request:
                raise ValueError('Transport approval request not found')
            
            if approval_request.status != 'pending':
                raise ValueError('Request has already been processed')
            
            # Extract rejection details
            demand_amount = float(rejection_data.get('demandAmount', 0))
            transport_notes = rejection_data.get('transportNotes', '')
            approved_by = rejection_data.get('rejectedBy', 'Transport Department')
            
            # Update approval request
            approval_request.status = 'rejected'
            approval_request.demand_amount = demand_amount
            approval_request.transport_notes = transport_notes
            approval_request.approved_by = approved_by
            approval_request.updated_at = datetime.utcnow()
            
            # Sales order remains in pending_transport_approval status
            # Sales team needs to review and either accept the demand or negotiate
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': 'Transport approval request rejected with demand amount',
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error rejecting transport request: {str(e)}")
    
    @staticmethod
    def get_rejected_transport_approvals():
        """Get all rejected transport approval requests for sales review"""
        try:
            approval_requests = TransportApprovalRequest.query.filter_by(status='rejected').order_by(TransportApprovalRequest.updated_at.desc()).all()
            
            approvals = []
            for request in approval_requests:
                sales_order = SalesOrder.query.get(request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id) if sales_order else None
                
                approval_data = request.to_dict()
                if sales_order:
                    approval_data['orderNumber'] = sales_order.order_number
                    approval_data['customerName'] = sales_order.customer_name
                    approval_data['customerContact'] = sales_order.customer_contact
                    approval_data['customerAddress'] = sales_order.customer_address
                    approval_data['finalAmount'] = sales_order.final_amount
                    approval_data['quantity'] = sales_order.quantity
                    approval_data['salesPerson'] = sales_order.sales_person
                    
                if showroom_product:
                    approval_data['productName'] = showroom_product.name
                    
                approvals.append(approval_data)
            
            return approvals
        except Exception as e:
            raise Exception(f"Error fetching rejected transport approvals: {str(e)}")
    
    @staticmethod
    def get_part_load_orders_needing_driver_details():
        """Get part load orders from dispatch that need driver details to be filled by transport"""
        try:
            # Get transport jobs for part load orders that are pending and need driver details
            transport_jobs = TransportJob.query.filter_by(status='pending').all()
            
            part_load_orders = []
            for job in transport_jobs:
                dispatch_request = DispatchRequest.query.get(job.dispatch_request_id)
                if not dispatch_request:
                    continue
                    
                # Check if this is a part load order
                if dispatch_request.original_delivery_type != 'part load':
                    continue
                    
                # Get related sales order and product info
                sales_order = SalesOrder.query.get(dispatch_request.sales_order_id) if dispatch_request.sales_order_id else None
                showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id) if dispatch_request.showroom_product_id else None
                
                part_load_orders.append({
                    'transportJobId': job.id,
                    'dispatchId': dispatch_request.id,
                    'orderNumber': sales_order.order_number if sales_order else f'DR-{dispatch_request.id}',
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': dispatch_request.quantity,
                    'customerName': dispatch_request.party_name,
                    'customerContact': dispatch_request.party_contact,
                    'customerAddress': dispatch_request.party_address,
                    'originalDeliveryType': dispatch_request.original_delivery_type,
                    'transportCost': sales_order.transport_cost if sales_order else 0,
                    'status': job.status,
                    'createdAt': job.created_at.isoformat(),
                    'updatedAt': job.updated_at.isoformat()
                })
            
            return part_load_orders
        except Exception as e:
            raise Exception(f"Error fetching part load orders needing driver details: {str(e)}")
    
    @staticmethod
    def fill_part_load_driver_details(transport_job_id, driver_details):
        """Fill driver details for part load order and send to watchman"""
        try:
            # Get the transport job
            transport_job = TransportJob.query.get(transport_job_id)
            if not transport_job:
                raise ValueError('Transport job not found')
            
            # Get related dispatch request
            dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id)
            if not dispatch_request:
                raise ValueError('Related dispatch request not found')
            
            # Get sales order to fetch payment type and product details
            sales_order = None
            showroom_product = None
            if dispatch_request.sales_order_id:
                sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                if not sales_order:
                    raise ValueError('Related sales order not found')
                # Get product details
                if sales_order.showroom_product_id:
                    showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
            
            # Verify this is a part load order
            if dispatch_request.original_delivery_type != 'part load':
                raise ValueError('This operation is only valid for part load orders')
            
            # Validate driver details
            required_fields = ['driverName', 'driverNumber', 'vehicleNumber', 'companyName']
            for field in required_fields:
                if not driver_details.get(field):
                    raise ValueError(f'{field} is required')
            
            # Update transport job with driver details
            transport_job.transporter_name = driver_details.get('transporterName')  # Use transporterName instead of companyName
            transport_job.vehicle_no = driver_details.get('vehicleNumber')
            
            # Create or update part load details
            part_load_detail = PartLoadDetail.query.filter_by(sales_order_id=dispatch_request.sales_order_id).first()
            if not part_load_detail:
                try:
                    # Parse the expected delivery date, ensuring it's in a valid format
                    expected_delivery_date = None
                    if driver_details.get('expectedDeliveryDate'):
                        date_str = driver_details.get('expectedDeliveryDate')
                        try:
                            expected_delivery_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        except Exception as e:
                            print(f"Error parsing date {date_str}: {str(e)}")
                            raise ValueError(f"Invalid date format for expectedDeliveryDate: {date_str}")

                    # Determine payment type based on transport cost for part load
                    payment_type = 'to_pay'  # default
                    if sales_order:
                        # Debug print
                        print(f"Order {sales_order.order_number} Details:")
                        print(f"Delivery Type: {sales_order.Delivery_type}")
                        print(f"Transport Cost: {sales_order.transport_cost}")

                        # For part load orders, check transport cost
                        if sales_order.Delivery_type == 'part load':
                            if sales_order.transport_cost and float(sales_order.transport_cost) > 0:
                                payment_type = 'paid'
                            else:
                                payment_type = 'to_pay'
                        
                        print(f"Determined Payment Type: {payment_type}")

                    # Get product name from showroom product
                    product_name = 'Unknown Product'
                    if showroom_product:
                        product_name = showroom_product.name

                    part_load_detail = PartLoadDetail(
                        sales_order_id=dispatch_request.sales_order_id,
                        transporter_name=driver_details.get('transporterName'),
                        expected_delivery_date=expected_delivery_date,
                        payment_type=payment_type,  # Use payment type from sales order
                        customer_name=dispatch_request.party_name,
                        product_name=product_name  # Use the product name we got from showroom product
                    )
                    db.session.add(part_load_detail)
                except Exception as e:
                    print(f"Error creating PartLoadDetail: {str(e)}")
                    raise
            else:
                # Update existing record
                try:
                    part_load_detail.transporter_name = driver_details.get('transporterName')
                    if driver_details.get('expectedDeliveryDate'):
                        date_str = driver_details.get('expectedDeliveryDate')
                        try:
                            expected_delivery_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                            part_load_detail.expected_delivery_date = expected_delivery_date
                        except Exception as e:
                            print(f"Error parsing date {date_str}: {str(e)}")
                            raise ValueError(f"Invalid date format for expectedDeliveryDate: {date_str}")
                    
                    # Update payment type based on transport cost for part load
                    if sales_order:
                        print(f"Update - Order {sales_order.order_number} Details:")
                        print(f"Delivery Type: {sales_order.Delivery_type}")
                        print(f"Transport Cost: {sales_order.transport_cost}")

                        # For part load orders, check transport cost
                        if sales_order.Delivery_type == 'part load':
                            if sales_order.transport_cost and float(sales_order.transport_cost) > 0:
                                part_load_detail.payment_type = 'paid'
                            else:
                                part_load_detail.payment_type = 'to_pay'

                        print(f"Update - Determined Payment Type: {part_load_detail.payment_type}")
                except Exception as e:
                    print(f"Error updating PartLoadDetail: {str(e)}")
                    raise
            transport_job.status = 'driver_assigned'  # New status for part load with driver details
            transport_job.updated_at = datetime.utcnow()
            
            # Import GatePass here to avoid circular imports
            from models.showroom import GatePass
            
            # Create gate pass for watchman
            gate_pass = GatePass(
                dispatch_request_id=dispatch_request.id,
                party_name=dispatch_request.party_name,
                vehicle_no=driver_details.get('vehicleNumber'),
                driver_name=driver_details.get('driverName'),
                driver_contact=driver_details.get('driverNumber'),
                status='pending'
            )
            
            db.session.add(gate_pass)
            
            # Update dispatch request status to indicate it's ready for watchman
            dispatch_request.status = 'ready_for_pickup'
            dispatch_request.dispatch_notes = f"{dispatch_request.dispatch_notes or ''} | Transport filled driver details: {driver_details.get('driverName')} ({driver_details.get('vehicleNumber')})"
            dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Driver details filled and order sent to watchman for {dispatch_request.party_name}',
                'transportJob': transport_job.to_dict(),
                'gatePass': gate_pass.to_dict(),
                'dispatchRequest': dispatch_request.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error filling part load driver details: {str(e)}")
    
    @staticmethod
    def get_pending_transport_jobs():
        """Get all transport jobs pending assignment (excluding part load orders)"""
        try:
            transport_jobs = TransportJob.query.filter_by(status='pending').order_by(TransportJob.created_at.desc()).all()
            
            jobs = []
            for job in transport_jobs:
                # Get related dispatch request
                dispatch_request = DispatchRequest.query.get(job.dispatch_request_id)
                if not dispatch_request:
                    continue
                
                # Skip part load orders - they have their own separate section
                if dispatch_request.original_delivery_type == 'part load':
                    continue
                
                # Get sales order if available
                sales_order = None
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                
                # Get showroom product if available
                showroom_product = None
                if dispatch_request.showroom_product_id:
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                
                jobs.append({
                    'transportJobId': job.id,
                    'dispatchId': dispatch_request.id,
                    'orderNumber': sales_order.order_number if sales_order else f'DR-{dispatch_request.id}',
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': dispatch_request.quantity,
                    'customerName': dispatch_request.party_name,
                    'customerContact': dispatch_request.party_contact,
                    'customerAddress': dispatch_request.party_address,
                    'customerEmail': dispatch_request.party_email,
                    'transporterName': job.transporter_name,
                    'vehicleNo': job.vehicle_no,
                    'status': job.status,
                    'createdAt': job.created_at.isoformat(),
                    'finalAmount': sales_order.final_amount if sales_order else 0,
                    'salesPerson': sales_order.sales_person if sales_order else 'Unknown',
                    'priority': 'high' if dispatch_request.created_at and \
                               (datetime.utcnow() - dispatch_request.created_at).days > 1 else 'normal'
                })
            
            return jobs
        except Exception as e:
            raise Exception(f"Error fetching pending transport jobs: {str(e)}")
    
    @staticmethod
    def get_all_transport_jobs():
        """Get all transport jobs with all statuses (excluding part load orders)"""
        try:
            transport_jobs = TransportJob.query.order_by(TransportJob.created_at.desc()).all()
            
            jobs = []
            for job in transport_jobs:
                # Get related dispatch request
                dispatch_request = DispatchRequest.query.get(job.dispatch_request_id)
                if not dispatch_request:
                    continue
                
                # Skip part load orders - they have their own separate section
                if dispatch_request.original_delivery_type == 'part load':
                    continue
                
                # Get sales order if available
                sales_order = None
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                
                # Get showroom product if available
                showroom_product = None
                if dispatch_request.showroom_product_id:
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                
                jobs.append({
                    'transportJobId': job.id,
                    'dispatchId': dispatch_request.id,
                    'orderNumber': sales_order.order_number if sales_order else f'DR-{dispatch_request.id}',
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': dispatch_request.quantity,
                    'customerName': dispatch_request.party_name,
                    'customerContact': dispatch_request.party_contact,
                    'customerAddress': dispatch_request.party_address,
                    'customerEmail': dispatch_request.party_email,
                    'transporterName': job.transporter_name,
                    'vehicleNo': job.vehicle_no,
                    'status': job.status,
                    'createdAt': job.created_at.isoformat(),
                    'updatedAt': job.updated_at.isoformat(),
                    'finalAmount': sales_order.final_amount if sales_order else 0,
                    'salesPerson': sales_order.sales_person if sales_order else 'Unknown',
                    # Add delivery type fields for frontend compatibility
                    'deliveryType': (getattr(sales_order, 'Delivery_type', None) or getattr(dispatch_request, 'original_delivery_type', None) or getattr(dispatch_request, 'delivery_type', None) or '').lower(),
                    'originalDeliveryType': getattr(dispatch_request, 'original_delivery_type', None) or ''
                })
            
            return jobs
        except Exception as e:
            raise Exception(f"Error fetching transport jobs: {str(e)}")
    
    @staticmethod
    def assign_transporter(transport_job_id, transporter_data):
        """Assign a transporter to a transport job"""
        try:
            # Validate input
            if not transport_job_id:
                raise ValueError('Transport job ID is required')
            
            if not transporter_data or not isinstance(transporter_data, dict):
                raise ValueError('Transporter data must be provided as a dictionary')
            
            # Get transport job
            transport_job = TransportJob.query.get(transport_job_id)
            if not transport_job:
                raise ValueError('Transport job not found')
            
            if transport_job.status != 'pending':
                raise ValueError('Transport job has already been assigned or completed')
            
            # Validate required transporter details
            if not transporter_data.get('transporterName'):
                raise ValueError('Transporter name is required')
            
            transporter_name = transporter_data['transporterName'].strip()
            if len(transporter_name) < 2:
                raise ValueError('Transporter name must be at least 2 characters long')
            
            # Validate vehicle number if provided
            vehicle_no = transporter_data.get('vehicleNo', '').strip()
            if vehicle_no and len(vehicle_no) < 4:
                raise ValueError('Vehicle number must be at least 4 characters long if provided')
            
            # Check if vehicle is from fleet and update its status
            fleet_vehicle = None
            if vehicle_no:
                fleet_vehicle = Vehicle.query.filter_by(vehicle_number=vehicle_no).first()
                if fleet_vehicle:
                    if fleet_vehicle.status != 'available':
                        raise ValueError(f'Vehicle {vehicle_no} is not available (status: {fleet_vehicle.status})')
                    # Store old status for notification
                    old_status = fleet_vehicle.status
                    # Mark fleet vehicle as assigned
                    fleet_vehicle.status = 'assigned'
                    fleet_vehicle.updated_at = datetime.utcnow()
                    
                    # Create notification for vehicle status change
                    NotificationService.notify_vehicle_status_change(
                        vehicle_number=fleet_vehicle.vehicle_number,
                        driver_name=fleet_vehicle.driver_name,
                        old_status=old_status,
                        new_status='assigned',
                        context='Assigned to delivery'
                    )
            
            # Update transport job
            transport_job.transporter_name = transporter_name
            transport_job.vehicle_no = vehicle_no
            transport_job.status = 'assigned'
            transport_job.updated_at = datetime.utcnow()
            
            # Update dispatch request status
            dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id)
            if dispatch_request:
                dispatch_request.status = 'assigned_transport'
                dispatch_request.dispatch_notes = f"Assigned to {transport_job.transporter_name}"
                if transport_job.vehicle_no:
                    dispatch_request.dispatch_notes += f" (Vehicle: {transport_job.vehicle_no})"
                dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            # Create notification for driver assignment
            if fleet_vehicle and dispatch_request:
                # Get order number for notification
                sales_order = None
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                
                order_number = sales_order.order_number if sales_order else f'DR-{dispatch_request.id}'
                
                NotificationService.notify_driver_assigned(
                    driver_name=fleet_vehicle.driver_name,
                    vehicle_number=fleet_vehicle.vehicle_number,
                    order_number=order_number,
                    customer_name=dispatch_request.party_name
                )
            
            return {
                'status': 'success',
                'message': f'Transport job assigned to {transport_job.transporter_name}',
                'transportJob': transport_job.to_dict(),
                'dispatchRequest': dispatch_request.to_dict() if dispatch_request else None
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error assigning transporter: {str(e)}")
    
    @staticmethod
    def update_delivery_status(transport_job_id, status_data):
        """Update delivery status of transport job"""
        try:
            # Validate input
            if not transport_job_id:
                raise ValueError('Transport job ID is required')
            
            if not status_data or not isinstance(status_data, dict):
                raise ValueError('Status data must be provided as a dictionary')
            
            # Get transport job
            transport_job = TransportJob.query.get(transport_job_id)
            if not transport_job:
                raise ValueError('Transport job not found')
            
            # Validate status
            valid_statuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled', 'failed']
            new_status = status_data.get('status')
            
            if not new_status:
                raise ValueError('Status is required')
            
            if new_status not in valid_statuses:
                raise ValueError(f'Invalid status. Must be one of: {valid_statuses}')
            
            # Prevent invalid status transitions
            current_status = transport_job.status
            if current_status == 'delivered' and new_status != 'delivered':
                raise ValueError('Cannot change status of delivered orders')
            
            # Update transport job status
            transport_job.status = new_status
            transport_job.updated_at = datetime.utcnow()
            
            # Update vehicle and transporter if provided
            if status_data.get('transporterName'):
                transport_job.transporter_name = status_data['transporterName'].strip()
            if status_data.get('vehicleNo'):
                transport_job.vehicle_no = status_data['vehicleNo'].strip()
            
            # Update fleet vehicle status if applicable
            fleet_vehicle = None
            if transport_job.vehicle_no:
                fleet_vehicle = Vehicle.query.filter_by(vehicle_number=transport_job.vehicle_no).first()
                if fleet_vehicle:
                    old_vehicle_status = fleet_vehicle.status
                    new_vehicle_status = old_vehicle_status
                    
                    # Do not auto-available on delivered; set to 'returning'.
                    if new_status in ['delivered']:
                        new_vehicle_status = 'returning'
                    elif new_status in ['cancelled', 'failed']:
                        new_vehicle_status = 'available'
                    elif new_status == 'in_transit':
                        new_vehicle_status = 'assigned'
                    
                    # Update vehicle status if it changed
                    if old_vehicle_status != new_vehicle_status:
                        fleet_vehicle.status = new_vehicle_status
                        fleet_vehicle.updated_at = datetime.utcnow()
                        
                        # Create notification for vehicle status change
                        context = f'Delivery status changed to {new_status}'
                        NotificationService.notify_vehicle_status_change(
                            vehicle_number=fleet_vehicle.vehicle_number,
                            driver_name=fleet_vehicle.driver_name,
                            old_status=old_vehicle_status,
                            new_status=new_vehicle_status,
                            context=context
                        )
            
            # Update dispatch request status based on transport status
            dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id)
            if dispatch_request:
                if new_status == 'delivered':
                    dispatch_request.status = 'completed'
                    # Also update sales order status if linked
                    if dispatch_request.sales_order_id:
                        sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                        if sales_order:
                            sales_order.order_status = 'delivered'
                            sales_order.updated_at = datetime.utcnow()
                elif new_status == 'in_transit':
                    dispatch_request.status = 'in_transit'
                elif new_status in ['cancelled', 'failed']:
                    dispatch_request.status = 'transport_failed'
                elif new_status == 'assigned':
                    dispatch_request.status = 'assigned_transport'
                
                # Update dispatch notes with status change info
                # Accept both 'notes' and 'remarks' from frontend; include optional 'location'
                notes = status_data.get('notes') or status_data.get('remarks') or ''
                location = status_data.get('location', '').strip()

                note_parts = [f"Status: {new_status}"]
                if location:
                    note_parts.append(f"Location: {location}")
                if notes:
                    note_parts.append(f"Notes: {notes}")
                dispatch_request.dispatch_notes = " - ".join(note_parts) if note_parts else f"Status updated to: {new_status}"
                
                dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            # Create notifications after successful database commit
            if dispatch_request:
                # Get order number for notifications
                sales_order = None
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                
                order_number = sales_order.order_number if sales_order else f'DR-{dispatch_request.id}'
                
                # Notify delivery status change
                if fleet_vehicle:
                    NotificationService.notify_delivery_status_change(
                        order_number=order_number,
                        old_status=current_status,
                        new_status=new_status,
                        driver_name=fleet_vehicle.driver_name,
                        vehicle_number=fleet_vehicle.vehicle_number
                    )
                
                # Notify when driver becomes available
                if new_status in ['cancelled', 'failed'] and fleet_vehicle:
                    NotificationService.notify_driver_available(
                        driver_name=fleet_vehicle.driver_name,
                        vehicle_number=fleet_vehicle.vehicle_number,
                        order_number=order_number,
                        delivery_status=new_status
                    )
            
            return {
                'status': 'success',
                'message': f'Delivery status updated to {new_status}',
                'transportJob': transport_job.to_dict(),
                'dispatchRequest': dispatch_request.to_dict() if dispatch_request else None
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating delivery status: {str(e)}")
    
    @staticmethod
    def get_in_transit_deliveries():
        """Get all deliveries currently in transit (excluding part load orders)"""
        try:
            transport_jobs = TransportJob.query.filter_by(status='in_transit').order_by(TransportJob.updated_at.desc()).all()
            
            deliveries = []
            for job in transport_jobs:
                dispatch_request = DispatchRequest.query.get(job.dispatch_request_id)
                if not dispatch_request:
                    continue
                
                # Skip part load orders - they have their own separate section
                if dispatch_request.original_delivery_type == 'part load':
                    continue
                
                # Get sales order if available
                sales_order = None
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                
                # Get showroom product if available
                showroom_product = None
                if dispatch_request.showroom_product_id:
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                
                # Calculate days in transit
                days_in_transit = (datetime.utcnow() - job.updated_at).days
                
                deliveries.append({
                    'transportJobId': job.id,
                    'orderNumber': sales_order.order_number if sales_order else f'DR-{dispatch_request.id}',
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': dispatch_request.quantity,
                    'customerName': dispatch_request.party_name,
                    'customerContact': dispatch_request.party_contact,
                    'customerAddress': dispatch_request.party_address,
                    'transporterName': job.transporter_name,
                    'vehicleNo': job.vehicle_no,
                    'startedTransitAt': job.updated_at.isoformat(),
                    'daysInTransit': days_in_transit,
                    'priority': 'urgent' if days_in_transit > 3 else 'high' if days_in_transit > 1 else 'normal'
                })
            
            return deliveries
        except Exception as e:
            raise Exception(f"Error fetching in-transit deliveries: {str(e)}")
    
    @staticmethod
    def get_transport_summary():
        """Get transport department summary statistics (excluding part load orders)"""
        try:
            # Get all transport jobs and filter out part load orders
            # We need to join with DispatchRequest to check original_delivery_type
            from sqlalchemy import and_
            
            # Subquery to get dispatch request IDs that are NOT part load
            non_part_load_dispatch_ids = db.session.query(DispatchRequest.id).filter(
                (DispatchRequest.original_delivery_type != 'part load') | 
                (DispatchRequest.original_delivery_type.is_(None))
            ).subquery()
            
            # Count jobs by status (excluding part load orders)
            pending_jobs = TransportJob.query.filter(
                TransportJob.status == 'pending',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            assigned_jobs = TransportJob.query.filter(
                TransportJob.status == 'assigned',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            in_transit_jobs = TransportJob.query.filter(
                TransportJob.status == 'in_transit',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            delivered_jobs = TransportJob.query.filter(
                TransportJob.status == 'delivered',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            cancelled_jobs = TransportJob.query.filter(
                TransportJob.status == 'cancelled',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            failed_jobs = TransportJob.query.filter(
                TransportJob.status == 'failed',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            # Today's activity
            today = datetime.now().date()
            today_assigned = TransportJob.query.filter(
                db.func.date(TransportJob.updated_at) == today,
                TransportJob.status == 'assigned',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            today_delivered = TransportJob.query.filter(
                db.func.date(TransportJob.updated_at) == today,
                TransportJob.status == 'delivered',
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            # Overdue deliveries (in transit for more than 3 days)
            three_days_ago = datetime.utcnow() - timedelta(days=3)
            overdue_deliveries = TransportJob.query.filter(
                TransportJob.status == 'in_transit',
                TransportJob.updated_at < three_days_ago,
                TransportJob.dispatch_request_id.in_(non_part_load_dispatch_ids)
            ).count()
            
            return {
                'pendingJobs': pending_jobs,
                'assignedJobs': assigned_jobs,
                'inTransitJobs': in_transit_jobs,
                'deliveredJobs': delivered_jobs,
                'cancelledJobs': cancelled_jobs,
                'failedJobs': failed_jobs,
                'todayAssigned': today_assigned,
                'todayDelivered': today_delivered,
                'overdueDeliveries': overdue_deliveries,
                'totalActive': pending_jobs + assigned_jobs + in_transit_jobs
            }
        except Exception as e:
            raise Exception(f"Error getting transport summary: {str(e)}")
    
    @staticmethod
    def get_transporter_performance():
        """Get performance statistics for transporters"""
        try:
            # Get transporter performance data
            transporter_stats = db.session.query(
                TransportJob.transporter_name,
                db.func.count(TransportJob.id).label('total_jobs'),
                db.func.sum(db.case((TransportJob.status == 'delivered', 1), else_=0)).label('delivered'),
                db.func.sum(db.case((TransportJob.status == 'cancelled', 1), else_=0)).label('cancelled'),
                db.func.sum(db.case((TransportJob.status == 'failed', 1), else_=0)).label('failed')
            ).filter(
                TransportJob.transporter_name.isnot(None)
            ).group_by(TransportJob.transporter_name).all()
            
            performance = []
            for stat in transporter_stats:
                total_jobs = stat.total_jobs or 0
                delivered = stat.delivered or 0
                cancelled = stat.cancelled or 0
                failed = stat.failed or 0
                
                success_rate = (delivered / total_jobs * 100) if total_jobs > 0 else 0
                
                performance.append({
                    'transporterName': stat.transporter_name,
                    'totalJobs': total_jobs,
                    'delivered': delivered,
                    'cancelled': cancelled,
                    'failed': failed,
                    'successRate': round(success_rate, 1),
                    'rating': 'excellent' if success_rate >= 95 else 'good' if success_rate >= 85 else 'average' if success_rate >= 70 else 'poor'
                })
            
            # Sort by success rate
            performance.sort(key=lambda x: x['successRate'], reverse=True)
            
            return performance
        except Exception as e:
            raise Exception(f"Error getting transporter performance: {str(e)}")
    
    @staticmethod
    def search_transport_jobs(search_term):
        """Search transport jobs by order number, customer name, or transporter"""
        try:
            if not search_term or not search_term.strip():
                raise ValueError('Search term is required')
            
            search_term = search_term.strip()
            
            # Search transport jobs by transporter or vehicle
            transport_jobs = TransportJob.query.filter(
                db.or_(
                    TransportJob.transporter_name.ilike(f'%{search_term}%'),
                    TransportJob.vehicle_no.ilike(f'%{search_term}%')
                )
            ).order_by(TransportJob.created_at.desc()).all()
            
            results = []
            for job in transport_jobs:
                dispatch_request = DispatchRequest.query.get(job.dispatch_request_id)
                if not dispatch_request:
                    continue
                
                # Get sales order if available
                sales_order = None
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                
                # Get showroom product if available
                showroom_product = None
                if dispatch_request.showroom_product_id:
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                
                # Check if search term matches any relevant field
                if (search_term.lower() in dispatch_request.party_name.lower()) or \
                   (sales_order and search_term.upper() in sales_order.order_number.upper()) or \
                   (job.transporter_name and search_term.lower() in job.transporter_name.lower()) or \
                   (job.vehicle_no and search_term.upper() in job.vehicle_no.upper()):
                    
                    results.append({
                        'transportJobId': job.id,
                        'orderNumber': sales_order.order_number if sales_order else f'DR-{dispatch_request.id}',
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'customerName': dispatch_request.party_name,
                        'customerAddress': dispatch_request.party_address,
                        'transporterName': job.transporter_name,
                        'vehicleNo': job.vehicle_no,
                        'status': job.status,
                        'createdAt': job.created_at.isoformat(),
                        'updatedAt': job.updated_at.isoformat()
                    })
            
            return results
        except Exception as e:
            raise Exception(f"Error searching transport jobs: {str(e)}")
    
    # Fleet Management Methods
    @staticmethod
    def get_fleet_vehicles():
        """Get all fleet vehicles"""
        try:
            vehicles = Vehicle.query.order_by(Vehicle.created_at.desc()).all()
            return [vehicle.to_dict() for vehicle in vehicles]
        except Exception as e:
            raise Exception(f"Error fetching fleet vehicles: {str(e)}")
    
    @staticmethod
    def add_fleet_vehicle(vehicle_data):
        """Add a new vehicle to the fleet"""
        try:
            # Validate input
            if not vehicle_data or not isinstance(vehicle_data, dict):
                raise ValueError('Vehicle data must be provided as a dictionary')
            
            # Validate required fields
            required_fields = ['vehicleNumber', 'vehicleType', 'driverName']
            for field in required_fields:
                if not vehicle_data.get(field):
                    raise ValueError(f'{field} is required')
            
            vehicle_number = vehicle_data['vehicleNumber'].strip()
            vehicle_type = vehicle_data['vehicleType'].strip()
            driver_name = vehicle_data['driverName'].strip()
            
            # Validate field lengths
            if len(vehicle_number) < 3:
                raise ValueError('Vehicle number must be at least 3 characters long')
            if len(vehicle_type) < 2:
                raise ValueError('Vehicle type must be at least 2 characters long')
            if len(driver_name) < 2:
                raise ValueError('Driver name must be at least 2 characters long')
            
            # Check if vehicle number already exists
            existing_vehicle = Vehicle.query.filter_by(vehicle_number=vehicle_number).first()
            if existing_vehicle:
                raise ValueError(f'Vehicle number {vehicle_number} already exists')
            
            # Create new vehicle
            vehicle = Vehicle(
                vehicle_number=vehicle_number,
                vehicle_type=vehicle_type,
                driver_name=driver_name,
                driver_contact=vehicle_data.get('driverContact', '').strip(),
                capacity=vehicle_data.get('capacity', '').strip(),
                status=vehicle_data.get('status', 'available'),
                current_location=vehicle_data.get('currentLocation', '').strip(),
                notes=vehicle_data.get('notes', '').strip()
            )
            
            db.session.add(vehicle)
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Vehicle {vehicle.vehicle_number} added to fleet successfully',
                'vehicle': vehicle.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error adding vehicle to fleet: {str(e)}")
    
    @staticmethod
    def update_fleet_vehicle(vehicle_id, vehicle_data):
        """Update a fleet vehicle"""
        try:
            # Validate input
            if not vehicle_id:
                raise ValueError('Vehicle ID is required')
            
            if not vehicle_data or not isinstance(vehicle_data, dict):
                raise ValueError('Vehicle data must be provided as a dictionary')
            
            # Get vehicle
            vehicle = Vehicle.query.get(vehicle_id)
            if not vehicle:
                raise ValueError('Vehicle not found')
            
            # Update vehicle fields
            if 'vehicleType' in vehicle_data:
                vehicle.vehicle_type = vehicle_data['vehicleType'].strip()
            if 'driverName' in vehicle_data:
                vehicle.driver_name = vehicle_data['driverName'].strip()
            if 'driverContact' in vehicle_data:
                vehicle.driver_contact = vehicle_data['driverContact'].strip()
            if 'driverLicense' in vehicle_data:
                vehicle.driver_license = vehicle_data['driverLicense'].strip()
            if 'capacity' in vehicle_data:
                vehicle.capacity = vehicle_data['capacity'].strip()
            if 'status' in vehicle_data:
                valid_statuses = ['available', 'assigned', 'maintenance', 'out_of_service']
                if vehicle_data['status'] not in valid_statuses:
                    raise ValueError(f'Invalid status. Must be one of: {valid_statuses}')
                vehicle.status = vehicle_data['status']
            if 'currentLocation' in vehicle_data:
                vehicle.current_location = vehicle_data['currentLocation'].strip()
            if 'notes' in vehicle_data:
                vehicle.notes = vehicle_data['notes'].strip()
            
            vehicle.updated_at = datetime.utcnow()
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Vehicle {vehicle.vehicle_number} updated successfully',
                'vehicle': vehicle.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating vehicle: {str(e)}")
    
    @staticmethod
    def delete_fleet_vehicle(vehicle_id):
        """Delete a vehicle from the fleet"""
        try:
            # Validate input
            if not vehicle_id:
                raise ValueError('Vehicle ID is required')
            
            # Get vehicle
            vehicle = Vehicle.query.get(vehicle_id)
            if not vehicle:
                raise ValueError('Vehicle not found')
            
            # Check if vehicle is currently assigned
            active_jobs = TransportJob.query.filter(
                TransportJob.vehicle_no == vehicle.vehicle_number,
                TransportJob.status.in_(['assigned', 'in_transit'])
            ).count()
            
            if active_jobs > 0:
                raise ValueError(f'Cannot delete vehicle {vehicle.vehicle_number} - it has active transport jobs')
            
            vehicle_number = vehicle.vehicle_number
            db.session.delete(vehicle)
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Vehicle {vehicle_number} deleted successfully'
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error deleting vehicle: {str(e)}")
    
    @staticmethod
    def get_available_vehicles():
        """Get all available vehicles for transport assignment"""
        try:
            vehicles = Vehicle.query.filter_by(status='available').order_by(Vehicle.vehicle_number).all()
            return [vehicle.to_dict() for vehicle in vehicles]
        except Exception as e:
            raise Exception(f"Error fetching available vehicles: {str(e)}")
    
    @staticmethod
    def get_active_transport_orders():
        """Get active transport orders (not delivered) for dashboard"""
        try:
            # Get all sales orders with company delivery type that are not delivered
            sales_orders = SalesOrder.query.filter(
                SalesOrder.Delivery_type == 'company delivery',
                SalesOrder.order_status != 'delivered'
            ).order_by(SalesOrder.created_at.desc()).all()
            
            orders = []
            for order in sales_orders:
                # Determine color status based on payment and order status
                color_status = 'green'  # Default: pending payment
                
                # Yellow: partial payment
                if order.payment_status == 'partial':
                    color_status = 'yellow'
                # Red: completed payment OR in_dispatch status
                elif (order.payment_status == 'completed' or 
                      order.order_status == 'in_dispatch'):
                    color_status = 'red'
                # Green: pending payment
                elif order.payment_status == 'pending':
                    color_status = 'green'
                
                orders.append({
                    'orderId': order.id,
                    'orderNumber': order.order_number,
                    'customerName': order.customer_name,
                    'customerContact': order.customer_contact,
                    'customerAddress': order.customer_address,
                    'finalAmount': order.final_amount,
                    'transportCost': order.transport_cost or 0,
                    'paymentStatus': order.payment_status,
                    'orderStatus': order.order_status,
                    'deliveryType': order.Delivery_type,
                    'salesPerson': order.sales_person,
                    'createdAt': order.created_at.isoformat(),
                    'updatedAt': order.updated_at.isoformat(),
                    'colorStatus': color_status,
                    'priority': 'high' if color_status == 'red' else 'medium' if color_status == 'yellow' else 'normal'
                })
            
            return orders
        except Exception as e:
            raise Exception(f"Error fetching active transport orders: {str(e)}")
    
    @staticmethod
    def get_completed_transport_orders():
        """Get completed transport orders (delivered) for dashboard"""
        try:
            # Get all sales orders with company delivery type that are delivered
            sales_orders = SalesOrder.query.filter(
                SalesOrder.Delivery_type == 'company delivery',
                SalesOrder.order_status == 'delivered'
            ).order_by(SalesOrder.updated_at.desc()).all()
            
            orders = []
            for order in sales_orders:
                orders.append({
                    'orderId': order.id,
                    'orderNumber': order.order_number,
                    'customerName': order.customer_name,
                    'customerContact': order.customer_contact,
                    'customerAddress': order.customer_address,
                    'finalAmount': order.final_amount,
                    'transportCost': order.transport_cost or 0,
                    'paymentStatus': order.payment_status,
                    'orderStatus': order.order_status,
                    'deliveryType': order.Delivery_type,
                    'salesPerson': order.sales_person,
                    'createdAt': order.created_at.isoformat(),
                    'updatedAt': order.updated_at.isoformat(),
                    'colorStatus': 'gray',  # Completed orders are gray
                    'priority': 'normal'
                })
            
            return orders
        except Exception as e:
            raise Exception(f"Error fetching completed transport orders: {str(e)}")

    @staticmethod
    def mark_driver_reached(vehicle_id: int):
        """Mark a driver/vehicle as reached back to base; set vehicle available."""
        try:
            vehicle = Vehicle.query.get(vehicle_id)
            if not vehicle:
                raise ValueError('Vehicle not found')
            old_status = vehicle.status
            vehicle.status = 'available'
            vehicle.updated_at = datetime.utcnow()
            db.session.commit()

            NotificationService.notify_vehicle_status_change(
                vehicle_number=vehicle.vehicle_number,
                driver_name=vehicle.driver_name,
                old_status=old_status,
                new_status='available',
                context='Driver marked as reached'
            )

            NotificationService.notify_driver_available(
                driver_name=vehicle.driver_name,
                vehicle_number=vehicle.vehicle_number,
                order_number='-',
                delivery_status='reached'
            )

            return {
                'status': 'success',
                'message': f'Vehicle {vehicle.vehicle_number} marked as reached and available',
                'vehicle': vehicle.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error marking driver reached: {str(e)}")
