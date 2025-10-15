"""
Dispatch Service Module
Handles business logic for dispatch operations
"""
from datetime import datetime
from models import db, DispatchRequest, SalesOrder, ShowroomProduct, TransportJob, GatePass


class DispatchService:
    """Service class for dispatch operations"""
    
    @staticmethod
    def get_pending_dispatch_orders():
        """Get all orders pending dispatch processing"""
        try:
            dispatch_requests = DispatchRequest.query.filter_by(status='pending').order_by(DispatchRequest.created_at.desc()).all()
            
            orders = []
            for request in dispatch_requests:
                # Get related sales order
                sales_order = SalesOrder.query.get(request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(request.showroom_product_id)
                
                orders.append({
                    'id': request.id,
                    'salesOrderId': request.sales_order_id,
                    'orderNumber': sales_order.order_number if sales_order else f'SO-{request.sales_order_id}',
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': request.quantity,
                    'customerName': request.party_name,
                    'customerContact': request.party_contact,
                    'customerAddress': request.party_address,
                    'customerEmail': request.party_email,
                    'deliveryType': request.delivery_type,
                    'status': request.status,
                    'salePrice': showroom_product.sale_price if showroom_product else 0,
                    'finalAmount': sales_order.final_amount if sales_order else 0,
                    'createdAt': request.created_at.isoformat(),
                    'dispatchNotes': request.dispatch_notes
                })
            
            return orders
        except Exception as e:
            raise Exception(f"Error fetching pending dispatch orders: {str(e)}")
    
    @staticmethod
    def get_all_dispatch_orders():
        """Get all dispatch orders with status filtering"""
        try:
            dispatch_requests = DispatchRequest.query.order_by(DispatchRequest.created_at.desc()).all()

            orders = []
            for request in dispatch_requests:
                # Get related sales order and showroom product
                sales_order = SalesOrder.query.get(request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(request.showroom_product_id)
                # Get gate pass for vehicle information
                gate_pass = GatePass.query.filter_by(dispatch_request_id=request.id).first()

                # Get company name from sales order or transport job
                company_name = '-'
                if sales_order and hasattr(sales_order, 'transporter_name') and sales_order.transporter_name:
                    company_name = sales_order.transporter_name
                elif request.delivery_type == 'transport':
                    # Try to get from transport job
                    transport_job = TransportJob.query.filter_by(dispatch_request_id=request.id).first()
                    if transport_job and transport_job.transporter_name:
                        company_name = transport_job.transporter_name

                orders.append({
                    'id': request.id,
                    'salesOrderId': request.sales_order_id,
                    'orderNumber': sales_order.order_number if sales_order else f'SO-{request.sales_order_id}',
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'quantity': request.quantity,
                    'customerName': request.party_name,
                    'customerContact': request.party_contact,
                    'customerAddress': request.party_address,
                    'customerEmail': request.party_email,
                    'deliveryType': request.delivery_type,
                    'originalDeliveryType': getattr(sales_order, 'Delivery_type', None),
                    'status': request.status,
                    'salePrice': showroom_product.sale_price if showroom_product else 0,
                    'finalAmount': sales_order.final_amount if sales_order else 0,
                    'createdAt': request.created_at.isoformat(),
                    'updatedAt': request.updated_at.isoformat(),
                    'dispatchNotes': request.dispatch_notes,
                    'customerVehicle': gate_pass.vehicle_no if gate_pass and gate_pass.vehicle_no else None,
                    'driverName': gate_pass.driver_name if gate_pass and gate_pass.driver_name else None,
                    'companyName': company_name
                })

            return orders
        except Exception as e:
            raise Exception(f"Error fetching dispatch orders: {str(e)}")
    
    @staticmethod
    def process_dispatch_order(dispatch_id, action_data):
        """Process dispatch order based on delivery type"""
        try:
            if not action_data:
                raise ValueError('Action data is required')
            dispatch_request = DispatchRequest.query.get(dispatch_id)
            if not dispatch_request:
                raise ValueError('Dispatch request not found')
            
            # Validate required fields for self delivery
            if dispatch_request.delivery_type == 'self':
                if 'notes' not in action_data:
                    raise ValueError('Notes are required for self delivery processing')
                return DispatchService._process_self_delivery(dispatch_request, action_data)
            else:  # transport/company delivery
                # Validate required fields for company delivery
                if 'notes' not in action_data or 'transporterName' not in action_data or 'vehicleNo' not in action_data:
                    raise ValueError('Notes, transporter name, and vehicle number are required for company delivery processing')
                return DispatchService._process_company_delivery(dispatch_request, action_data)
                
        except Exception as e:
            raise Exception(f"Error processing dispatch order: {str(e)}")
    
    @staticmethod
    def _process_self_delivery(dispatch_request, action_data):
        """Process self delivery - send to watchman"""
        try:
            # Validate customer details are complete
            if not dispatch_request.party_contact or not dispatch_request.party_address:
                dispatch_request.status = 'customer_details_required'
                db.session.commit()
                return {
                    'status': 'customer_details_required',
                    'message': 'Customer details (contact and address) required before sending to watchman'
                }
            
            # Mark as processed and ready for loading (vehicle not yet inside)
            dispatch_request.status = 'ready_for_load'
            dispatch_request.dispatch_notes = action_data.get('notes', 'Processed by dispatch - Ready for loading')
            dispatch_request.updated_at = datetime.utcnow()
            
            # Check if gate pass already exists (created by Sales Department)
            existing_gate_pass = GatePass.query.filter_by(dispatch_request_id=dispatch_request.id).first()

            if existing_gate_pass:
                # Ensure driver details are up-to-date if provided during processing
                if action_data.get('driverName'):
                    existing_gate_pass.driver_name = action_data.get('driverName')
                if action_data.get('driverContact'):
                    existing_gate_pass.driver_contact = action_data.get('driverContact')
                if action_data.get('customerVehicleNo'):
                    existing_gate_pass.vehicle_no = action_data.get('customerVehicleNo')
            else:
                # Try to link an orphan gate pass (created earlier without dispatch_request_id)
                orphan_query = GatePass.query.filter(
                    GatePass.party_name == dispatch_request.party_name,
                    GatePass.dispatch_request_id == None  # Orphaned gate pass
                )
                # If vehicle number provided, use it to narrow down
                if action_data.get('customerVehicleNo'):
                    orphan_query = orphan_query.filter(GatePass.vehicle_no == action_data.get('customerVehicleNo'))
                orphan_pass = orphan_query.order_by(GatePass.issued_at.desc()).first()

                if orphan_pass:
                    # Attach orphan to this dispatch and update driver details
                    orphan_pass.dispatch_request_id = dispatch_request.id
                    if action_data.get('driverName'):
                        orphan_pass.driver_name = action_data.get('driverName')
                    if action_data.get('driverContact'):
                        orphan_pass.driver_contact = action_data.get('driverContact')
                    if action_data.get('customerVehicleNo'):
                        orphan_pass.vehicle_no = action_data.get('customerVehicleNo')
                    existing_gate_pass = orphan_pass
                else:
                    # Create new gate pass (fallback for orders not from Sales)
                    gate_pass = GatePass(
                        dispatch_request_id=dispatch_request.id,
                        party_name=dispatch_request.party_name,
                        vehicle_no=action_data.get('customerVehicleNo'),  # Customer's vehicle for pickup
                        driver_name=action_data.get('driverName'),       # Added driver name
                        driver_contact=action_data.get('driverContact'), # Added driver contact
                        status='pending'
                    )
                    db.session.add(gate_pass)

            db.session.commit()
            
            return {
                'status': 'ready_for_load',
                'message': 'Dispatch processed. Order is ready for loading when vehicle arrives',
                'dispatchRequest': dispatch_request.to_dict(),
                'gatePass': existing_gate_pass.to_dict() if existing_gate_pass else gate_pass.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error processing self delivery: {str(e)}")
    
    @staticmethod
    def _process_company_delivery(dispatch_request, action_data):
        """Process company delivery - send to transport"""
        try:
            # Validate customer details are complete
            if not dispatch_request.party_contact or not dispatch_request.party_address:
                dispatch_request.status = 'customer_details_required'
                db.session.commit()
                return {
                    'status': 'customer_details_required',
                    'message': 'Customer details (contact and address) required before assigning transport'
                }
            
            # Mark as awaiting transport assignment
            dispatch_request.status = 'assigned_transport'
            dispatch_request.dispatch_notes = action_data.get('notes', 'Ready for company transport delivery')
            dispatch_request.updated_at = datetime.utcnow()
            
            # Reuse existing transport job if one already exists for this dispatch
            existing_job = TransportJob.query.filter_by(dispatch_request_id=dispatch_request.id).first()
            if existing_job:
                # Update transporter/vehicle if provided
                if action_data.get('transporterName'):
                    existing_job.transporter_name = action_data.get('transporterName')
                if action_data.get('vehicleNo'):
                    existing_job.vehicle_no = action_data.get('vehicleNo')
                # Ensure status is at least pending
                if existing_job.status in (None, ''):
                    existing_job.status = 'pending'
                existing_job.updated_at = datetime.utcnow()

                db.session.commit()
                return {
                    'status': 'sent_to_transport',
                    'message': f'Order already had a transport job. Updated Transport Job #{existing_job.id}',
                    'transportJobId': existing_job.id,
                    'dispatchRequest': dispatch_request.to_dict(),
                    'transportJob': existing_job.to_dict()
                }
            
            # Create transport job (no existing job)
            transport_job = TransportJob(
                dispatch_request_id=dispatch_request.id,
                transporter_name=action_data.get('transporterName'),
                vehicle_no=action_data.get('vehicleNo'),
                status='pending'
            )
            
            db.session.add(transport_job)
            db.session.commit()
            
            return {
                'status': 'sent_to_transport',
                'message': f'Order assigned to transport - Transport Job #{transport_job.id} created',
                'transportJobId': transport_job.id,
                'dispatchRequest': dispatch_request.to_dict(),
                'transportJob': transport_job.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error processing company delivery: {str(e)}")
    
    @staticmethod
    def update_customer_details(dispatch_id, customer_data):
        """Update customer details for dispatch request"""
        try:
            if not customer_data:
                raise ValueError('Customer data is required')
            dispatch_request = DispatchRequest.query.get(dispatch_id)
            if not dispatch_request:
                raise ValueError('Dispatch request not found')
            
            # Update customer details
            if 'partyName' in customer_data:
                dispatch_request.party_name = customer_data['partyName']
            if 'partyContact' in customer_data:
                dispatch_request.party_contact = customer_data['partyContact']
            if 'partyAddress' in customer_data:
                dispatch_request.party_address = customer_data['partyAddress']
            if 'partyEmail' in customer_data:
                dispatch_request.party_email = customer_data['partyEmail']
            
            # Check if all required details are now complete
            if dispatch_request.party_contact and dispatch_request.party_address:
                if dispatch_request.status == 'customer_details_required':
                    dispatch_request.status = 'pending'  # Ready for processing
            
            dispatch_request.updated_at = datetime.utcnow()
            db.session.commit()
            
            return dispatch_request.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating customer details: {str(e)}")
    
    @staticmethod
    def get_watchman_orders():
        """Get orders assigned to watchman (self pickup)"""
        try:
            gate_passes = GatePass.query.filter(
                GatePass.status.in_(['pending', 'verified'])
            ).order_by(GatePass.issued_at.desc()).all()
            
            orders = []
            for gate_pass in gate_passes:
                dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
                if dispatch_request:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                    
                    orders.append({
                        'gatePassId': gate_pass.id,
                        'dispatchId': dispatch_request.id,
                        'orderNumber': sales_order.order_number if sales_order else f'SO-{dispatch_request.sales_order_id}',
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'quantity': dispatch_request.quantity,
                        'customerName': gate_pass.party_name,
                        'customerContact': dispatch_request.party_contact,
                        'customerVehicle': gate_pass.vehicle_no,
                        'status': gate_pass.status,
                        'issuedAt': gate_pass.issued_at.isoformat(),
                        'verifiedAt': gate_pass.verified_at.isoformat() if gate_pass.verified_at else None
                    })
            
            return orders
        except Exception as e:
            raise Exception(f"Error fetching watchman orders: {str(e)}")
    
    @staticmethod
    def get_transport_orders():
        """Get orders assigned to transport (company delivery)"""
        try:
            transport_jobs = TransportJob.query.filter(
                TransportJob.status.in_(['pending', 'assigned', 'in_transit'])
            ).order_by(TransportJob.created_at.desc()).all()
            
            orders = []
            for transport_job in transport_jobs:
                dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id)
                if dispatch_request:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                    
                    orders.append({
                        'transportJobId': transport_job.id,
                        'dispatchId': dispatch_request.id,
                        'orderNumber': sales_order.order_number if sales_order else f'SO-{dispatch_request.sales_order_id}',
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'quantity': dispatch_request.quantity,
                        'customerName': dispatch_request.party_name,
                        'customerContact': dispatch_request.party_contact,
                        'customerAddress': dispatch_request.party_address,
                        'transporterName': transport_job.transporter_name,
                        'vehicleNo': transport_job.vehicle_no,
                        'status': transport_job.status,
                        'createdAt': transport_job.created_at.isoformat(),
                        'updatedAt': transport_job.updated_at.isoformat()
                    })
            
            return orders
        except Exception as e:
            raise Exception(f"Error fetching transport orders: {str(e)}")
    
    @staticmethod
    def verify_customer_pickup(gate_pass_id, verification_data):
        """Verify customer pickup at gate (watchman action)"""
        try:
            gate_pass = GatePass.query.get(gate_pass_id)
            if not gate_pass:
                raise ValueError('Gate pass not found')
            
            # Update gate pass
            gate_pass.status = 'verified'
            gate_pass.verified_at = datetime.utcnow()
            if 'vehicleNo' in verification_data:
                gate_pass.vehicle_no = verification_data['vehicleNo']
            
            # Update dispatch request
            dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
            if dispatch_request:
                dispatch_request.status = 'completed'
                dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'pickup_verified',
                'message': 'Customer pickup verified and completed',
                'gatePass': gate_pass.to_dict(),
                'dispatchRequest': dispatch_request.to_dict() if dispatch_request else None
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error verifying customer pickup: {str(e)}")
    
    @staticmethod
    def update_transport_status(transport_job_id, status_data):
        """Update transport job status"""
        try:
            transport_job = TransportJob.query.get(transport_job_id)
            if not transport_job:
                raise ValueError('Transport job not found')
            
            # Valid transport statuses
            valid_statuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled']
            new_status = status_data.get('status')
            
            if new_status not in valid_statuses:
                raise ValueError(f'Invalid status. Must be one of: {valid_statuses}')
            
            transport_job.status = new_status
            transport_job.updated_at = datetime.utcnow()
            
            # Update transporter details if provided
            if 'transporterName' in status_data:
                transport_job.transporter_name = status_data['transporterName']
            if 'vehicleNo' in status_data:
                transport_job.vehicle_no = status_data['vehicleNo']
            
            # Update dispatch request status based on transport status
            dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id)
            if dispatch_request:
                if new_status == 'delivered':
                    dispatch_request.status = 'completed'
                elif new_status == 'in_transit':
                    dispatch_request.status = 'in_transit'
                elif new_status == 'cancelled':
                    dispatch_request.status = 'cancelled'
                
                dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'transport_updated',
                'message': f'Transport status updated to {new_status}',
                'transportJob': transport_job.to_dict(),
                'dispatchRequest': dispatch_request.to_dict() if dispatch_request else None
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating transport status: {str(e)}")
    
    @staticmethod
    def get_dispatch_summary():
        """Get dispatch department summary statistics"""
        try:
            # Count orders by status
            pending_orders = DispatchRequest.query.filter_by(status='pending').count()
            customer_details_required = DispatchRequest.query.filter_by(status='customer_details_required').count()
            ready_for_pickup = DispatchRequest.query.filter_by(status='ready_for_pickup').count()
            in_transit = DispatchRequest.query.filter_by(status='in_transit').count()
            completed_orders = DispatchRequest.query.filter_by(status='completed').count()
            
            # Count self-delivery loading queue (ready_for_load or entered_for_pickup with delivery_type='self')
            self_delivery_loading_queue = DispatchRequest.query.filter(
                DispatchRequest.delivery_type == 'self',
                DispatchRequest.status.in_(['ready_for_load', 'entered_for_pickup'])
            ).count()
            
            # Count part load delivery loading queue (ready_for_pickup or entered_for_pickup with part load delivery type)
            # Need to join with SalesOrder to check original delivery type
            part_load_loading_queue = db.session.query(DispatchRequest).join(
                SalesOrder, DispatchRequest.sales_order_id == SalesOrder.id
            ).filter(
                SalesOrder.Delivery_type == 'part load',
                DispatchRequest.status.in_(['ready_for_pickup', 'entered_for_pickup'])
            ).count()
            
            # Count by delivery type
            self_delivery = DispatchRequest.query.filter_by(delivery_type='self').count()
            transport_delivery = DispatchRequest.query.filter_by(delivery_type='transport').count()
            
            # Today's dispatch activity
            today = datetime.now().date()
            today_dispatches = DispatchRequest.query.filter(
                db.func.date(DispatchRequest.created_at) == today
            ).count()
            today_completed = DispatchRequest.query.filter(
                db.func.date(DispatchRequest.updated_at) == today,
                DispatchRequest.status == 'completed'
            ).count()
            
            return {
                'pendingOrders': pending_orders,
                'customerDetailsRequired': customer_details_required,
                'readyForPickup': ready_for_pickup,
                'selfDeliveryLoadingQueue': self_delivery_loading_queue,
                'partLoadLoadingQueue': part_load_loading_queue,
                'inTransit': in_transit,
                'completedOrders': completed_orders,
                'selfDelivery': self_delivery,
                'transportDelivery': transport_delivery,
                'todayDispatches': today_dispatches,
                'todayCompleted': today_completed
            }
        except Exception as e:
            raise Exception(f"Error getting dispatch summary: {str(e)}")

    @staticmethod
    def complete_loading(dispatch_id, notes=None):
        """Mark loading completed for a self delivery order. Dispatch step before watchman release."""
        try:
            dispatch_request = DispatchRequest.query.get(dispatch_id)
            if not dispatch_request:
                raise ValueError('Dispatch request not found')
            if dispatch_request.delivery_type != 'self':
                raise ValueError('Loading completion is only valid for self delivery orders')
            # Only allow after vehicle has entered for pickup
            if dispatch_request.status not in ['entered_for_pickup', 'ready_for_load']:
                # Allow marking loaded if just processed but vehicle not marked entered yet
                pass
            dispatch_request.status = 'loaded'
            if notes:
                dispatch_request.dispatch_notes = (dispatch_request.dispatch_notes or '') + f" | Loaded: {notes}"
            dispatch_request.updated_at = datetime.utcnow()
            db.session.commit()
            return {
                'status': 'loaded',
                'message': 'Loading completed. Awaiting gate release',
                'dispatchRequest': dispatch_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error completing loading: {str(e)}")

    @staticmethod
    def complete_part_load_loading(dispatch_id, notes=None):
        """Mark loading completed for a part load order. Dispatch step before watchman release."""
        try:
            dispatch_request = DispatchRequest.query.get(dispatch_id)
            if not dispatch_request:
                raise ValueError('Dispatch request not found')
            
            # Verify this is a part load order by checking the sales order
            sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
            if not sales_order or getattr(sales_order, 'Delivery_type', None) != 'part load':
                raise ValueError('Loading completion is only valid for part load orders')
            
            # Allow marking as loaded if status is 'ready_for_pickup' or 'entered_for_pickup'
            if dispatch_request.status not in ['ready_for_pickup', 'entered_for_pickup']:
                raise ValueError(f'Part load order must be in ready_for_pickup or entered_for_pickup status, currently: {dispatch_request.status}')
            
            # Mark as loaded
            dispatch_request.status = 'loaded'
            if notes:
                dispatch_request.dispatch_notes = (dispatch_request.dispatch_notes or '') + f" | Part Load Loaded: {notes}"
            dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'loaded',
                'message': 'Part Load loading completed. Awaiting watchman verification and release',
                'dispatchRequest': dispatch_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error completing part load loading: {str(e)}")

    @staticmethod
    def get_dispatch_notifications():
        """Get notifications for dispatch department about vehicles sent in for loading"""
        try:
            # Get orders that have been sent in for pickup (entered_for_pickup status)
            dispatch_requests = DispatchRequest.query.filter(
                DispatchRequest.status == 'entered_for_pickup',
                DispatchRequest.delivery_type == 'self'
            ).order_by(DispatchRequest.updated_at.desc()).all()
            
            notifications = []
            for dispatch_request in dispatch_requests:
                sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                gate_pass = GatePass.query.filter_by(dispatch_request_id=dispatch_request.id).first()
                
                notifications.append({
                    'id': dispatch_request.id,
                    'orderNumber': sales_order.order_number if sales_order else f'SO-{dispatch_request.sales_order_id}',
                    'customerName': dispatch_request.party_name,
                    'productName': showroom_product.name if showroom_product else 'Unknown Product',
                    'vehicleNo': gate_pass.vehicle_no if gate_pass else 'N/A',
                    'driverName': gate_pass.driver_name if gate_pass else 'N/A',
                    'enteredAt': dispatch_request.updated_at.isoformat(),
                    'message': f'Vehicle {gate_pass.vehicle_no or "N/A"} for {dispatch_request.party_name} has been verified and sent in for loading',
                    'type': 'vehicle_entered',
                    'isNew': True
                })
            
            return notifications
        except Exception as e:
            raise Exception(f"Error fetching dispatch notifications: {str(e)}")
