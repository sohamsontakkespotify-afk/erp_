"""
Watchman Service Module
Handles business logic for watchman operations (gate security for self-pickup orders)
"""
from datetime import datetime
from models import db, GatePass, DispatchRequest, SalesOrder, ShowroomProduct, TransportJob


class WatchmanService:
    """Service class for watchman operations"""
    
    @staticmethod
    def get_pending_pickups():
        """Get all pending customer pickups waiting for verification"""
        try:
            # Include both 'pending' and 'entered_for_pickup' statuses
            gate_passes = GatePass.query.filter(GatePass.status.in_(['pending', 'entered_for_pickup'])).order_by(GatePass.issued_at.desc()).all()

            pickups = []
            for gate_pass in gate_passes:
                # Get related dispatch request and order details
                dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
                if dispatch_request:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)

                    # Get company name from sales order or transport job
                    company_name = '-'
                    if sales_order and hasattr(sales_order, 'transporter_name') and sales_order.transporter_name:
                        company_name = sales_order.transporter_name
                    elif dispatch_request.delivery_type == 'transport':
                        # Try to get from transport job
                        transport_job = TransportJob.query.filter_by(dispatch_request_id=dispatch_request.id).first()
                        if transport_job and transport_job.transporter_name:
                            company_name = transport_job.transporter_name

                    pickups.append({
                        'gatePassId': gate_pass.id,
                        'dispatchId': dispatch_request.id,
                        'orderNumber': sales_order.order_number if sales_order else f'SO-{dispatch_request.sales_order_id}',
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'quantity': dispatch_request.quantity,
                        'customerName': gate_pass.party_name,
                        'customerContact': dispatch_request.party_contact,
                        'customerAddress': dispatch_request.party_address,
                        'customerEmail': dispatch_request.party_email,
                        'customerVehicle': gate_pass.vehicle_no,
                        'driverName': gate_pass.driver_name,
                        'driverContact': gate_pass.driver_contact,
                        'issuedAt': gate_pass.issued_at.isoformat(),
                        'status': gate_pass.status,  # Use gate pass status for consistency
                        'dispatchStatus': dispatch_request.status,  # Also include dispatch status
                        'companyName': company_name,
                        'finalAmount': sales_order.final_amount if sales_order else 0,
                        'salesPerson': sales_order.sales_person if sales_order else 'Unknown'
                    })

            return pickups
        except Exception as e:
            raise Exception(f"Error fetching pending pickups: {str(e)}")
    
    @staticmethod
    def get_all_gate_passes():
        """Get all gate passes (completed and pending)"""
        try:
            gate_passes = GatePass.query.order_by(GatePass.issued_at.desc()).all()
            
            passes = []
            for gate_pass in gate_passes:
                # Get related dispatch request and order details
                dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
                if dispatch_request:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                    
                    passes.append({
                        'gatePassId': gate_pass.id,
                        'dispatchId': dispatch_request.id,
                        'orderNumber': sales_order.order_number if sales_order else f'SO-{dispatch_request.sales_order_id}',
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'quantity': dispatch_request.quantity,
                        'customerName': gate_pass.party_name,
                        'customerContact': dispatch_request.party_contact,
                        'customerVehicle': gate_pass.vehicle_no,
                        'driverName': gate_pass.driver_name,
                        'driverContact': gate_pass.driver_contact,
                        'issuedAt': gate_pass.issued_at.isoformat(),
                        'verifiedAt': gate_pass.verified_at.isoformat() if gate_pass.verified_at else None,
                        'status': gate_pass.status,
                        'finalAmount': sales_order.final_amount if sales_order else 0,
                        'salesPerson': sales_order.sales_person if sales_order else 'Unknown',
                        'deliveryType': (getattr(sales_order, 'Delivery_type', None) or getattr(dispatch_request, 'original_delivery_type', None) or getattr(dispatch_request, 'delivery_type', None) or ''),
                        'originalDeliveryType': getattr(dispatch_request, 'original_delivery_type', None) or ''
                    })
            
            return passes
        except Exception as e:
            raise Exception(f"Error fetching gate passes: {str(e)}")
    
    @staticmethod
    def verify_customer_identity(gate_pass_id, verification_data, action='release'):
        """Verify customer identity and vehicle details for pickup"""
        try:
            gate_pass = GatePass.query.get(gate_pass_id)
            if not gate_pass:
                raise ValueError('Gate pass not found')

            # Allow processing if status is 'pending' or 'entered_for_pickup'
            if gate_pass.status not in ['pending', 'entered_for_pickup']:
                raise ValueError('Gate pass has already been processed')

            # Get dispatch request for additional validation
            dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
            if not dispatch_request:
                raise ValueError('Related dispatch request not found')

            # Validate customer identity (basic validation - can be enhanced)
            if verification_data.get('customerName'):
                customer_name = verification_data['customerName'].strip().lower()
                recorded_name = gate_pass.party_name.strip().lower()

                if customer_name != recorded_name:
                    return {
                        'status': 'identity_mismatch',
                        'message': f'Customer name mismatch. Expected: {gate_pass.party_name}, Provided: {verification_data["customerName"]}',
                        'requiresManager': True
                    }

            # Update gate pass with verification
            gate_pass.verified_at = datetime.utcnow()

            # Update vehicle number if provided
            if verification_data.get('vehicleNo'):
                gate_pass.vehicle_no = verification_data['vehicleNo']

            # Update driver name if provided
            if verification_data.get('driverName'):
                gate_pass.driver_name = verification_data['driverName']

            if action == 'send_in':
                # Set status to entered for pickup
                gate_pass.status = 'entered_for_pickup'
                dispatch_request.status = 'entered_for_pickup'
                dispatch_request.dispatch_notes = f"{dispatch_request.dispatch_notes or ''} | Watchman verified and sent vehicle in for loading at {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
                dispatch_request.updated_at = datetime.utcnow()

                db.session.commit()

                return {
                    'status': 'entered_for_pickup',
                    'message': f'Customer verified and sent in for pickup for {gate_pass.party_name}. Dispatch can proceed to load.',
                    'gatePass': gate_pass.to_dict(),
                    'enteredAt': gate_pass.verified_at.isoformat(),
                    'notifyDispatch': True,
                    'dispatchNotification': f'Vehicle {gate_pass.vehicle_no or "N/A"} for {gate_pass.party_name} has been verified and sent in for loading'
                }
            else:  # action == 'release' (default)
                # If dispatch already marked loaded, release; otherwise still allow but mark completed
                gate_pass.status = 'verified'
                dispatch_request.status = 'completed'
                dispatch_request.updated_at = datetime.utcnow()

                # Update sales order status to delivered
                if dispatch_request.sales_order_id:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    if sales_order:
                        sales_order.order_status = 'delivered'
                        sales_order.updated_at = datetime.utcnow()

                db.session.commit()

                return {
                    'status': 'pickup_verified',
                    'message': f'Customer pickup verified and released successfully for {gate_pass.party_name}',
                    'gatePass': gate_pass.to_dict(),
                    'completedAt': gate_pass.verified_at.isoformat()
                }

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error verifying customer pickup: {str(e)}")
    
    @staticmethod
    def reject_pickup(gate_pass_id, rejection_reason):
        """Reject customer pickup (for security reasons or missing documents)"""
        try:
            gate_pass = GatePass.query.get(gate_pass_id)
            if not gate_pass:
                raise ValueError('Gate pass not found')
            
            if gate_pass.status != 'pending':
                raise ValueError('Gate pass has already been processed')
            
            # Update gate pass status
            gate_pass.status = 'rejected'
            gate_pass.verified_at = datetime.utcnow()  # Use verified_at to track when it was processed
            
            # Update dispatch request with rejection
            dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
            if dispatch_request:
                dispatch_request.status = 'pickup_rejected'
                dispatch_request.dispatch_notes = f"Pickup rejected by watchman: {rejection_reason}"
                dispatch_request.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'pickup_rejected',
                'message': f'Customer pickup rejected: {rejection_reason}',
                'gatePass': gate_pass.to_dict(),
                'rejectionReason': rejection_reason
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error rejecting pickup: {str(e)}")
    
    @staticmethod
    def get_daily_summary():
        """Get daily summary of watchman activities"""
        try:
            today = datetime.now().date()

            # Count gate passes by status for today
            today_pending = GatePass.query.filter(
                db.func.date(GatePass.issued_at) == today,
                GatePass.status == 'pending'
            ).count()

            today_verified = GatePass.query.filter(
                db.func.date(GatePass.verified_at) == today,
                GatePass.status == 'verified'
            ).count()

            today_entered = GatePass.query.filter(
                db.func.date(GatePass.verified_at) == today,
                GatePass.status == 'entered_for_pickup'
            ).count()

            today_rejected = GatePass.query.filter(
                db.func.date(GatePass.verified_at) == today,
                GatePass.status == 'rejected'
            ).count()

            # Total gate passes ever
            total_pending = GatePass.query.filter_by(status='pending').count()
            total_verified = GatePass.query.filter_by(status='verified').count()
            total_entered = GatePass.query.filter_by(status='entered_for_pickup').count()
            total_rejected = GatePass.query.filter_by(status='rejected').count()

            return {
                'todayPending': today_pending,
                'todayVerified': today_verified,
                'todayEntered': today_entered,
                'todayRejected': today_rejected,
                'totalPending': total_pending,
                'totalVerified': total_verified,
                'totalEntered': total_entered,
                'totalRejected': total_rejected,
                'todayTotal': today_pending + today_verified + today_entered + today_rejected
            }
        except Exception as e:
            raise Exception(f"Error getting daily summary: {str(e)}")
    
    @staticmethod
    def search_gate_pass(search_term):
        """Search gate passes by customer name, order number, or vehicle number"""
        try:
            gate_passes = GatePass.query.filter(
                db.or_(
                    GatePass.party_name.ilike(f'%{search_term}%'),
                    GatePass.vehicle_no.ilike(f'%{search_term}%')
                )
            ).order_by(GatePass.issued_at.desc()).all()
            
            results = []
            for gate_pass in gate_passes:
                dispatch_request = DispatchRequest.query.get(gate_pass.dispatch_request_id)
                if dispatch_request:
                    sales_order = SalesOrder.query.get(dispatch_request.sales_order_id)
                    showroom_product = ShowroomProduct.query.get(dispatch_request.showroom_product_id)
                    
                    # Also search by order number
                    if sales_order and search_term.upper() in sales_order.order_number.upper():
                        results.append({
                            'gatePassId': gate_pass.id,
                            'orderNumber': sales_order.order_number,
                            'productName': showroom_product.name if showroom_product else 'Unknown Product',
                            'customerName': gate_pass.party_name,
                            'customerVehicle': gate_pass.vehicle_no,
                            'status': gate_pass.status,
                            'issuedAt': gate_pass.issued_at.isoformat(),
                            'verifiedAt': gate_pass.verified_at.isoformat() if gate_pass.verified_at else None
                        })
                    elif search_term.lower() in gate_pass.party_name.lower() or \
                         (gate_pass.vehicle_no and search_term.upper() in gate_pass.vehicle_no.upper()):
                        results.append({
                            'gatePassId': gate_pass.id,
                            'orderNumber': sales_order.order_number if sales_order else f'SO-{dispatch_request.sales_order_id}',
                            'productName': showroom_product.name if showroom_product else 'Unknown Product',
                            'customerName': gate_pass.party_name,
                            'customerVehicle': gate_pass.vehicle_no,
                            'status': gate_pass.status,
                            'issuedAt': gate_pass.issued_at.isoformat(),
                            'verifiedAt': gate_pass.verified_at.isoformat() if gate_pass.verified_at else None
                        })
            
            return results
        except Exception as e:
            raise Exception(f"Error searching gate passes: {str(e)}")
