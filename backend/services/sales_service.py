"""
Sales Service Module
Handles business logic for sales operations
"""
from datetime import datetime
import uuid
from models import db, SalesOrder, Customer, SalesTransaction, ShowroomProduct, FinanceTransaction, DispatchRequest, AssemblyOrder, TransportJob , GatePass
from models.sales import TransportApprovalRequest
from services.showroom_service import ShowroomService
from services.approval_service import ApprovalService


class SalesService:
    """Service class for sales operations"""
    
    @staticmethod
    def get_available_showroom_products():
        """Get products with showroom_status == 'available'"""
        available_products = ShowroomProduct.query.filter_by(
            showroom_status='available'
        ).order_by(ShowroomProduct.created_at.desc()).all()
        
        products = []
        for product in available_products:
            # Determine original quantity from assembly order by production_order_id
            original_qty = 1
            if product.production_order_id:
                assembly_order = AssemblyOrder.query.filter_by(
                    production_order_id=product.production_order_id
                ).first()
                if assembly_order:
                    original_qty = assembly_order.quantity or 1

            # Calculate already sold quantity for this showroom product
            sold_qty = db.session.query(db.func.coalesce(db.func.sum(SalesOrder.quantity), 0)).\
                filter(SalesOrder.showroom_product_id == product.id).scalar() or 0

            remaining_qty = max(int(original_qty) - int(sold_qty), 0)

            # If none remaining, update status and skip
            if remaining_qty <= 0:
                product.showroom_status = 'sold'
                if not product.sold_date:
                    product.sold_date = datetime.utcnow()
                db.session.commit()
                continue

            products.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'quantity': remaining_qty,  # Current remaining quantity
                'original_qty': original_qty,  # Total original quantity
                'salePrice': product.sale_price,
                'costPrice': product.cost_price,
                'displayedAt': product.created_at.isoformat(),
                'productionOrderId': product.production_order_id
            })
        
        return products
    
    @staticmethod
    def get_sales_orders(status=None, sales_person=None):
        """Get sales orders with optional filtering"""
        query = SalesOrder.query
        
        if status:
            query = query.filter_by(order_status=status)
        
        if sales_person:
            query = query.filter_by(sales_person=sales_person)
        
        orders = query.order_by(SalesOrder.created_at.desc()).all()
        
        # Enhance orders with after sales status
        enhanced_orders = []
        for order in orders:
            order_dict = order.to_dict()
            
            # Check if order has been sent to dispatch
            dispatch_request = DispatchRequest.query.filter_by(sales_order_id=order.id).first()
            if dispatch_request:
                order_dict['afterSalesStatus'] = 'sent_to_dispatch'
            else:
                order_dict['afterSalesStatus'] = None
                
            enhanced_orders.append(order_dict)
        
        return enhanced_orders
    
    @staticmethod
    def get_sales_order_by_id(order_id):
        """Get a specific sales order by ID"""
        order = SalesOrder.query.get(order_id)
        if not order:
            raise ValueError('Sales order not found')
        return order.to_dict()
    
    @staticmethod
    def create_sales_order(data):
        """Create a new sales order"""
        # Validate showroom product
        showroom_product = ShowroomProduct.query.get(data['showroomProductId'])
        if not showroom_product:
            raise ValueError('Showroom product not found')
        
        if showroom_product.showroom_status != 'available':
            raise ValueError('Product is not available for sale')
        
        # Compute remaining quantity available for sale
        original_qty = 1
        if showroom_product.production_order_id:
            assembly_order = AssemblyOrder.query.filter_by(
                production_order_id=showroom_product.production_order_id
            ).first()
            if assembly_order:
                original_qty = assembly_order.quantity or 1
        sold_qty = db.session.query(db.func.coalesce(db.func.sum(SalesOrder.quantity), 0)).\
            filter(SalesOrder.showroom_product_id == showroom_product.id).scalar() or 0
        remaining_qty = max(int(original_qty) - int(sold_qty), 0)
        
        # Requested quantity must be within remaining
        quantity = int(data.get('quantity', 1))
        if quantity <= 0:
            raise ValueError('Quantity must be at least 1')
        if quantity > remaining_qty:
            raise ValueError('Requested quantity exceeds available quantity')
        
        # Generate readable order number: SO-<CustInit>-<ProdInit>-<YYYYMMDD>-<4HEX>
        cust_name = (data.get('customerName') or '').strip()
        cust_init = ''.join([part[0] for part in cust_name.split()[:2]]).upper() or 'CU'
        # Fetch product name for initials
        prod = ShowroomProduct.query.get(data['showroomProductId'])
        prod_name = (prod.name if prod else 'PROD').strip()
        prod_init = ''.join([part[0] for part in prod_name.split()[:2]]).upper() or 'PR'
        order_number = f"SO-{cust_init}-{prod_init}-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        
        # Calculate amounts
        unit_price = float(data['unitPrice'])
        transport_cost = float(data.get('transportCost', 0.0))
        total_amount = (unit_price * quantity) + transport_cost
        discount_amount = float(data.get('discountAmount', 0.0))
        final_amount = total_amount - discount_amount
        
        # Get delivery type to determine workflow
        delivery_type = data.get('deliveryType', 'self delivery')
        
        # Determine initial order status based on delivery type
        if delivery_type in ['part load', 'company delivery']:
            # These require transport approval before confirmation
            initial_order_status = 'pending_transport_approval'
        elif delivery_type == 'free delivery':
            initial_order_status = 'pending_free_delivery_approval'
        else:
            # Self delivery can be confirmed immediately
            initial_order_status = 'confirmed'
        
        # Create sales order
        sales_order = SalesOrder(
            order_number=order_number,
            customer_name=data['customerName'],
            customer_contact=data.get('customerContact'),
            customer_email=data.get('customerEmail'),
            customer_address=data.get('customerAddress'),
            showroom_product_id=data['showroomProductId'],
            quantity=quantity,
            unit_price=unit_price,
            total_amount=total_amount,
            discount_amount=discount_amount,
            transport_cost=0.0 if data.get('deliveryType') == 'free delivery' else transport_cost,
            final_amount=final_amount,
            payment_method=data.get('paymentMethod', ''),
            sales_person=data['salesPerson'],
            Delivery_type=delivery_type,
            notes=data.get('notes'),
            order_status=initial_order_status
        )
        
        db.session.add(sales_order)
        db.session.flush()  # Get the sales_order.id
        
        # Create transport approval request if needed
        if delivery_type in ['part load', 'company delivery']:
            transport_approval = TransportApprovalRequest(
                sales_order_id=sales_order.id,
                delivery_type=delivery_type,
                original_transport_cost=transport_cost,
                status='pending'
            )
            db.session.add(transport_approval)
        
        # Mark sold only if fully exhausted
        remaining_after = remaining_qty - quantity
        if remaining_after <= 0:
            showroom_product.showroom_status = 'sold'
            showroom_product.sold_date = datetime.utcnow()
        
        # Create finance transaction for revenue
        revenue_transaction = FinanceTransaction(
            transaction_type='revenue',
            amount=final_amount,
            description=f'Sales order {order_number} - {showroom_product.name}',
            reference_id=sales_order.id,
            reference_type='sales_order'
        )
        db.session.add(revenue_transaction)
        
        db.session.commit()
        
        return sales_order.to_dict()
    
    @staticmethod
    def update_sales_order(order_id, data):
        """Update an existing sales order"""
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')
        
        # Prevent editing orders with completed payments
        if sales_order.payment_status == 'completed':
            raise ValueError('Cannot edit order with completed payment')
        
        # Store old delivery type for comparison
        old_delivery_type = sales_order.Delivery_type
        
        # Update allowed fields
        if 'customerName' in data:
            sales_order.customer_name = data['customerName']
        if 'customerContact' in data:
            sales_order.customer_contact = data['customerContact']
        if 'customerEmail' in data:
            sales_order.customer_email = data['customerEmail']
        if 'customerAddress' in data:
            sales_order.customer_address = data['customerAddress']
        if 'orderStatus' in data:
            sales_order.order_status = data['orderStatus']
        if 'paymentStatus' in data:
            sales_order.payment_status = data['paymentStatus']
        if 'notes' in data:
            sales_order.notes = data['notes']
        
        # Handle delivery type changes with special logic
        new_delivery_type = data.get('deliveryType')
        if new_delivery_type and new_delivery_type != old_delivery_type:
            # Update delivery type
            sales_order.Delivery_type = new_delivery_type
            
            # Handle status changes based on delivery type transition
            if old_delivery_type == 'self delivery' and new_delivery_type in ['part load', 'company delivery']:
                # Self Delivery → Transport: Change status to pending_transport_approval
                sales_order.order_status = 'pending_transport_approval'
                
                # Create transport approval request
                existing_approval = TransportApprovalRequest.query.filter_by(
                    sales_order_id=sales_order.id
                ).first()
                
                if not existing_approval:
                    transport_approval = TransportApprovalRequest(
                        sales_order_id=sales_order.id,
                        delivery_type=new_delivery_type,
                        original_transport_cost=sales_order.transport_cost or 0.0,
                        status='pending'
                    )
                    db.session.add(transport_approval)
                
            elif old_delivery_type in ['part load', 'company delivery'] and new_delivery_type == 'self delivery':
                # Part Load/Company Delivery → Self Delivery: Delete pending transport approval requests
                pending_approvals = TransportApprovalRequest.query.filter_by(
                    sales_order_id=sales_order.id,
                    status='pending'
                ).all()
                
                for approval in pending_approvals:
                    db.session.delete(approval)
                
                # Change status back to confirmed if it was pending transport approval
                if sales_order.order_status == 'pending_transport_approval':
                    sales_order.order_status = 'confirmed'
                    
            elif old_delivery_type in ['part load', 'company delivery'] and new_delivery_type in ['part load', 'company delivery']:
                # Transport type to transport type: Update existing approval request if pending
                existing_approval = TransportApprovalRequest.query.filter_by(
                    sales_order_id=sales_order.id,
                    status='pending'
                ).first()
                
                if existing_approval:
                    existing_approval.delivery_type = new_delivery_type
                    existing_approval.updated_at = datetime.utcnow()
        
        # Update pricing fields and recalculate amounts
        if 'unitPrice' in data or 'quantity' in data or 'transportCost' in data or 'discountAmount' in data:
            unit_price = float(data.get('unitPrice', sales_order.unit_price))
            quantity = int(data.get('quantity', sales_order.quantity))
            transport_cost = float(data.get('transportCost', sales_order.transport_cost or 0))
            discount_amount = float(data.get('discountAmount', sales_order.discount_amount or 0))
            
            # Recalculate amounts
            total_amount = (unit_price * quantity) + transport_cost
            final_amount = total_amount - discount_amount
            
            # Update all amount fields
            sales_order.unit_price = unit_price
            sales_order.quantity = quantity
            sales_order.transport_cost = transport_cost
            sales_order.total_amount = total_amount
            sales_order.discount_amount = discount_amount
            sales_order.final_amount = final_amount
        
        sales_order.updated_at = datetime.utcnow()
        db.session.commit()
        
        return sales_order.to_dict()
    
    @staticmethod
    def process_payment(order_id, payment_data):
        """Process payment for a sales order.
        Does not finalize; flags order for finance approval.
        """
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')
        
        amount = float(payment_data['amount'])
        payment_method = payment_data['paymentMethod']
        
        # Create sales transaction
        transaction = SalesTransaction(
            sales_order_id=order_id,
            transaction_type='payment',
            amount=amount,
            payment_method=payment_method,
            reference_number=payment_data.get('referenceNumber'),
            notes=payment_data.get('notes')
        )
        db.session.add(transaction)
        
        # Set status to require finance approval
        sales_order.payment_status = 'pending_finance_approval'
        
        db.session.commit()
        
        return transaction.to_dict()

    @staticmethod
    def apply_coupon(order_id, data):
        """Apply a coupon code to an order and optionally bypass finance if partial or pending payment exists.
        Rules:
        - Requires a non-empty couponCode.
        - If payment_status is 'partial' or 'pending', set finance_bypass True and record reason/time.
        - Does NOT change payment_status; payments can complete later.
        - Always recalculates discount and final_amount if a discount value is provided.
        """
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')

        coupon_code = (data.get('couponCode') or '').strip()
        if not coupon_code:
            raise ValueError('couponCode is required')

        # Allow for both partial and pending
        if sales_order.payment_status not in ['partial', 'pending']:
            raise ValueError('Coupon apply failed: unsupported payment status')

        # Optional numeric discount amount to apply via coupon
        discount_value = data.get('discountAmount')
        if discount_value is not None:
            try:
                discount_value = float(discount_value)
                if discount_value < 0:
                    raise ValueError
            except Exception:
                raise ValueError('discountAmount must be a non-negative number')
        
        sales_order.coupon_code = coupon_code

        # Apply discount if provided
        if discount_value is not None:
            sales_order.discount_amount = float(discount_value)
            sales_order.final_amount = float(sales_order.total_amount or 0) - float(sales_order.discount_amount or 0)

        # Store coupon info but don't enable bypass yet - need approval
        sales_order.updated_at = datetime.utcnow()
        db.session.commit()

        # Create approval request instead of directly bypassing
        try:
            approval_result = ApprovalService.create_coupon_approval_request(
                sales_order_id=order_id,
                requested_by=data.get('requestedBy', 'Sales User'),
                coupon_code=coupon_code,
                discount_amount=discount_value or 0,
                request_details=data.get('reason') or f"Coupon bypass request for order {sales_order.order_number}. Coupon: {coupon_code}"
            )
            
            return {
                'status': 'approval_requested',
                'message': 'Coupon applied. Approval request sent to admin.',
                'salesOrder': sales_order.to_dict(),
                'approvalRequest': approval_result.get('approvalRequest')
            }
        except Exception as e:
            # If approval creation fails, still return success for coupon application
            return {
                'status': 'coupon_applied_no_approval',
                'message': f'Coupon applied but approval request failed: {str(e)}',
                'salesOrder': sales_order.to_dict()
            }

    @staticmethod
    def create_dispatch_request(order_id, delivery_type, party_contact=None, party_address=None):
        """Create a dispatch request for a sales order"""
        if delivery_type not in ['self delivery', 'company delivery']:
            raise ValueError('Invalid delivery type')

        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')

        showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
        if not showroom_product:
            raise ValueError('Related showroom product not found')

        # If a dispatch request already exists for this order, return it instead of creating a duplicate
        existing_dispatch = DispatchRequest.query.filter_by(sales_order_id=sales_order.id).first()
        if existing_dispatch:
            return existing_dispatch.to_dict()

        # Map UI label to storage value correctly
        delivery_type_value = 'self' if delivery_type == 'self delivery' else 'transport'

        dispatch = DispatchRequest(
            sales_order_id=sales_order.id,
            showroom_product_id=showroom_product.id,
            party_name=sales_order.customer_name or 'Customer',
            party_contact=party_contact or sales_order.customer_contact,
            party_address=party_address or sales_order.customer_address,
            party_email=sales_order.customer_email,
            quantity=sales_order.quantity,
            delivery_type=delivery_type_value,
            status='pending'
        )

        db.session.add(dispatch)
        db.session.commit()

        return dispatch.to_dict()
    
    @staticmethod
    def get_customers():
        """Get all customers"""
        customers = Customer.query.filter_by(is_active=True).order_by(Customer.name).all()
        return [customer.to_dict() for customer in customers]
    
    @staticmethod
    def create_customer(data):
        """Create a new customer"""
        customer = Customer(
            name=data['name'],
            contact=data.get('contact'),
            email=data.get('email'),
            address=data.get('address'),
            customer_type=data.get('customerType', 'retail'),
            credit_limit=float(data.get('creditLimit', 0.0))
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return customer.to_dict()
    
    @staticmethod
    def get_sales_summary():
        """Get sales summary statistics"""
        total_orders = SalesOrder.query.count()
        total_revenue = db.session.query(db.func.sum(SalesOrder.final_amount)).scalar() or 0
        pending_orders = SalesOrder.query.filter_by(order_status='pending').count()
        completed_orders = SalesOrder.query.filter_by(order_status='delivered').count()
        
        # Today's sales
        today = datetime.now().date()
        today_orders = SalesOrder.query.filter(
            db.func.date(SalesOrder.created_at) == today
        ).count()
        today_revenue = db.session.query(db.func.sum(SalesOrder.final_amount)).filter(
            db.func.date(SalesOrder.created_at) == today
        ).scalar() or 0
        
        return {
            'totalOrders': total_orders,
            'totalRevenue': total_revenue,
            'pendingOrders': pending_orders,
            'completedOrders': completed_orders,
            'todayOrders': today_orders,
            'todayRevenue': today_revenue
        }
    
    @staticmethod
    def send_order_to_dispatch(order_id, delivery_type, driver_details=None):
        """Send a confirmed sales order to dispatch department"""
        try:
            # Get sales order
            sales_order = SalesOrder.query.get(order_id)
            if not sales_order:
                raise ValueError('Sales order not found')

            # Check if already sent to dispatch first
            existing_dispatch = DispatchRequest.query.filter_by(
                sales_order_id=order_id
            ).first()
            if existing_dispatch:
                return {
                    'status': 'already_dispatched',
                    'message': 'Order has already been sent to dispatch',
                    'dispatchRequestId': existing_dispatch.id,
                    'dispatchRequest': existing_dispatch.to_dict()
                }

            if sales_order.order_status != 'confirmed':
                raise ValueError('Only confirmed orders can be sent to dispatch')

            # Validate delivery type (supports new types)
            allowed_delivery_types = ['self delivery', 'company delivery', 'free delivery', 'part load']
            if delivery_type not in allowed_delivery_types:
                raise ValueError('Invalid delivery type. Must be "self delivery", "company delivery", "free delivery" or "part load"')

            # Normalize for DispatchRequest storage (only 'self' or 'transport')
            normalized_delivery_type = 'self' if delivery_type == 'self delivery' else 'transport'

            # Get showroom product
            showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
            if not showroom_product:
                raise ValueError('Related showroom product not found')

            # Create dispatch request
            dispatch_request = DispatchRequest(
                sales_order_id=sales_order.id,
                showroom_product_id=sales_order.showroom_product_id,
                party_name=sales_order.customer_name,
                party_contact=sales_order.customer_contact,
                party_address=sales_order.customer_address,
                party_email=sales_order.customer_email,
                quantity=sales_order.quantity,
                delivery_type=normalized_delivery_type,
                status='pending',
                dispatch_notes=f'Order from sales - {delivery_type} delivery requested',
                original_delivery_type=delivery_type  # Store the original delivery type
            )

            db.session.add(dispatch_request)
            # Flush to get the dispatch_request.id
            db.session.flush()

            # If self delivery, create gate pass with driver details
            if normalized_delivery_type == 'self':
                gate_pass = GatePass(
                    dispatch_request_id=dispatch_request.id,
                    party_name=sales_order.customer_name,
                    vehicle_no=driver_details.get('vehicleNumber') if driver_details else None,
                    driver_name=driver_details.get('driverName') if driver_details else None,
                    driver_contact=driver_details.get('driverNumber') if driver_details else None,
                    status='pending'
                )
                db.session.add(gate_pass)

            # If transport-like delivery (company/free/part load), create a transport job
            if normalized_delivery_type == 'transport':
                transport_job = TransportJob(
                    dispatch_request_id=dispatch_request.id,
                    status='pending'
                )
                db.session.add(transport_job)

            # Update sales order status to indicate it's in dispatch
            sales_order.order_status = 'in_dispatch'
            sales_order.updated_at = datetime.utcnow()

            db.session.commit()

            result = {
                'status': 'sent_to_dispatch',
                'message': f'Order successfully sent to dispatch for {delivery_type} delivery',
                'dispatchRequestId': dispatch_request.id,
                'dispatchRequest': dispatch_request.to_dict(),
                'salesOrder': sales_order.to_dict()
            }
            if delivery_type == 'transport':
                # Include minimal transport job info for frontend if needed
                result['transportJob'] = transport_job.to_dict()
            elif normalized_delivery_type == 'self':
                result['gatePass'] = gate_pass.to_dict()
            return result

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error sending order to dispatch: {str(e)}")
    
    @staticmethod
    def confirm_transport_demand(approval_id, confirm_data):
        """Confirm or modify order after transport rejection with demand amount"""
        try:
            approval_request = TransportApprovalRequest.query.get(approval_id)
            if not approval_request:
                raise ValueError('Transport approval request not found')
            
            if approval_request.status != 'rejected':
                raise ValueError('Can only confirm demands for rejected transport requests')
            
            sales_order = SalesOrder.query.get(approval_request.sales_order_id)
            if not sales_order:
                raise ValueError('Related sales order not found')
            
            action = confirm_data.get('action')  # 'accept_demand' or 'modify_order'
            
            if action == 'accept_demand':
                # Accept transport's demand amount and update order
                new_transport_cost = approval_request.demand_amount
                
                # Update sales order with new transport cost
                sales_order.transport_cost = new_transport_cost
                sales_order.total_amount = (sales_order.unit_price * sales_order.quantity) + new_transport_cost
                sales_order.final_amount = sales_order.total_amount - (sales_order.discount_amount or 0)
                sales_order.order_status = 'confirmed'
                sales_order.updated_at = datetime.utcnow()
                
                # Update approval request
                approval_request.status = 'approved'
                approval_request.requested_transport_cost = new_transport_cost
                approval_request.updated_at = datetime.utcnow()
                
            elif action == 'modify_order':
                # Customer agreed to modified terms, update order accordingly
                new_transport_cost = float(confirm_data.get('agreedTransportCost', approval_request.demand_amount))
                
                # Update sales order
                sales_order.transport_cost = new_transport_cost
                sales_order.total_amount = (sales_order.unit_price * sales_order.quantity) + new_transport_cost
                sales_order.final_amount = sales_order.total_amount - (sales_order.discount_amount or 0)
                sales_order.order_status = 'confirmed'
                sales_order.updated_at = datetime.utcnow()
                
                # Update approval request
                approval_request.status = 'approved'
                approval_request.requested_transport_cost = new_transport_cost
                approval_request.updated_at = datetime.utcnow()
            
            else:
                raise ValueError('Invalid action. Must be "accept_demand" or "modify_order"')
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Transport demand {action.replace("_", " ")} successfully',
                'salesOrder': sales_order.to_dict(),
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error confirming transport demand: {str(e)}")
    
    @staticmethod
    def renegotiate_transport_cost(approval_id, renegotiation_data):
        """Send negotiated amount back to transport for verification"""
        try:
            approval_request = TransportApprovalRequest.query.get(approval_id)
            if not approval_request:
                raise ValueError('Transport approval request not found')
            
            if approval_request.status != 'rejected':
                raise ValueError('Can only renegotiate rejected transport requests')
            
            sales_order = SalesOrder.query.get(approval_request.sales_order_id)
            if not sales_order:
                raise ValueError('Related sales order not found')
            
            negotiated_amount = renegotiation_data.get('negotiatedAmount')
            customer_notes = renegotiation_data.get('customerNotes', '')
            sales_person = renegotiation_data.get('salesPerson', 'Sales Department')
            
            # Validate negotiated amount
            if not negotiated_amount or negotiated_amount <= 0:
                raise ValueError('Negotiated amount must be greater than 0')
            
            # Update approval request with negotiated amount and reset to pending
            # The negotiated amount becomes the new "original" amount for transport to review
            approval_request.original_transport_cost = float(negotiated_amount)  # Update this as the new baseline
            approval_request.requested_transport_cost = float(negotiated_amount)
            approval_request.transport_notes = f"Customer negotiation: {customer_notes} (Sales: {sales_person})"
            approval_request.status = 'pending'  # Send back to transport for review
            approval_request.approved_by = None  # Clear previous approval/rejection
            approval_request.demand_amount = None  # Clear previous demand amount
            approval_request.updated_at = datetime.utcnow()
            
            # Keep sales order in pending_transport_approval status
            # Update sales order transport cost to the negotiated amount
            sales_order.transport_cost = float(negotiated_amount)
            sales_order.total_amount = (sales_order.unit_price * sales_order.quantity) + float(negotiated_amount)
            sales_order.final_amount = sales_order.total_amount - (sales_order.discount_amount or 0)
            sales_order.order_status = 'pending_transport_approval'
            sales_order.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Negotiated amount ₹{negotiated_amount} sent to transport for verification',
                'approvalRequest': approval_request.to_dict(),
                'salesOrder': sales_order.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error renegotiating transport cost: {str(e)}")


