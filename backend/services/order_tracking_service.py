"""
Order tracking and status management service
"""
import json
from datetime import datetime, timedelta
from models import db, ProductionOrder, PurchaseOrder, AssemblyOrder, ShowroomProduct

class OrderTrackingService:
    """Service class for comprehensive order tracking and status management"""
    
    @staticmethod
    def get_current_order_log():
        """Get comprehensive order log showing current status across all departments"""
        try:
            # Get all production orders - showroom no longer tracks sold status
            orders = db.session.query(ProductionOrder).order_by(
                ProductionOrder.created_at.desc()
            ).all()
            
            order_log = []
            
            for order in orders:
                # Get related data
                purchase_order = PurchaseOrder.query.filter_by(production_order_id=order.id).first()
                assembly_order = AssemblyOrder.query.filter_by(production_order_id=order.id).first()
                showroom_product = ShowroomProduct.query.filter_by(production_order_id=order.id).first()
                
                # Determine current status and department
                status_info = OrderTrackingService._determine_order_status(
                    order, purchase_order, assembly_order, showroom_product
                )
                
                # Calculate estimated completion
                estimated_completion = OrderTrackingService._calculate_estimated_completion(
                    status_info['progress_percentage']
                )
                
                # Get materials list
                materials_list = []
                if purchase_order and purchase_order.materials:
                    try:
                        materials_list = json.loads(purchase_order.materials) if isinstance(purchase_order.materials, str) else purchase_order.materials
                    except:
                        materials_list = []
                
                order_log.append({
                    'id': order.id,
                    'productName': order.product_name,
                    'category': order.category,
                    'quantity': order.quantity,
                    'currentStatus': status_info['current_status'],
                    'currentDepartment': status_info['current_department'],
                    'statusColor': status_info['status_color'],
                    'progressPercentage': status_info['progress_percentage'],
                    'createdAt': order.created_at.isoformat(),
                    'createdBy': order.created_by,
                    'estimatedCompletion': estimated_completion,
                    'materials': materials_list,
                    'orderValue': len(materials_list) * 15 * order.quantity,  # Estimated value
                    'priority': OrderTrackingService._determine_priority(status_info['progress_percentage']),
                    
                    # Additional status details
                    'purchaseStatus': purchase_order.status if purchase_order else None,
                    'assemblyStatus': assembly_order.status if assembly_order else None,
                    'assemblyProgress': assembly_order.progress if assembly_order else 0,
                    'showroomStatus': showroom_product.showroom_status if showroom_product else None,
                })
            
            # Calculate summary statistics
            summary = OrderTrackingService._calculate_summary_stats(order_log)
            
            return {
                'orders': order_log,
                'totalOrders': len(order_log),
                'summary': summary
            }
            
        except Exception as e:
            raise Exception(f"Error generating order log: {str(e)}")
    
    @staticmethod
    def get_order_detailed_status(order_id):
        """Get detailed status information for a specific order"""
        try:
            order = ProductionOrder.query.get_or_404(order_id)
            purchase_order = PurchaseOrder.query.filter_by(production_order_id=order.id).first()
            assembly_order = AssemblyOrder.query.filter_by(production_order_id=order.id).first()
            showroom_product = ShowroomProduct.query.filter_by(production_order_id=order.id).first()
            
            # Build timeline
            timeline = OrderTrackingService._build_order_timeline(
                order, purchase_order, assembly_order, showroom_product
            )
            
            return {
                'order': order.to_dict(),
                'purchaseOrder': purchase_order.to_dict() if purchase_order else None,
                'assemblyOrder': assembly_order.to_dict() if assembly_order else None,
                'showroomProduct': showroom_product.to_dict() if showroom_product else None,
                'timeline': timeline
            }
            
        except Exception as e:
            raise Exception(f"Error getting order details: {str(e)}")
    
    @staticmethod
    def _determine_order_status(order, purchase_order, assembly_order, showroom_product):
        """Determine the current status, department, and progress of an order"""
        current_status = "Unknown"
        current_department = "Unknown"
        status_color = "gray"
        progress_percentage = 0
        
        # Determine status based on order progression
        if showroom_product:
            if showroom_product.showroom_status == 'available':
                current_status = "On Display - Ready for Sales"
                current_department = "Showroom"
                status_color = "blue"
                progress_percentage = 95
            elif showroom_product.showroom_status == 'pending_review':
                current_status = "Pending Showroom Review"
                current_department = "Showroom"
                status_color = "yellow"
                progress_percentage = 85
        elif assembly_order:
            if assembly_order.status == 'sent_to_showroom':
                current_status = "Sent to Showroom"
                current_department = "Showroom"
                status_color = "purple"
                progress_percentage = 90
            elif assembly_order.status == 'completed':
                current_status = "Assembly Completed"
                current_department = "Assembly"
                status_color = "green"
                progress_percentage = 80
            elif assembly_order.status == 'in_progress':
                current_status = f"In Production ({assembly_order.progress}%)"
                current_department = "Assembly"
                status_color = "blue"
                progress_percentage = 40 + (assembly_order.progress * 0.4)  # 40-80% range
            elif assembly_order.status == 'paused':
                current_status = "Production Paused"
                current_department = "Assembly"
                status_color = "orange"
                progress_percentage = 40 + (assembly_order.progress * 0.4)
            elif assembly_order.status == 'pending':
                if purchase_order and purchase_order.status in ['store_allocated', 'verified_in_store']:
                    current_status = "Materials Ready - Pending Assembly Start"
                    current_department = "Assembly"
                    status_color = "green"
                    progress_percentage = 35
                else:
                    current_status = "Waiting for Materials"
                    current_department = "Assembly"
                    status_color = "orange"
                    progress_percentage = 30
        elif purchase_order:
            if purchase_order.status == 'verified_in_store':
                current_status = "Materials in Stock - Ready for Assembly"
                current_department = "Store"
                status_color = "green"
                progress_percentage = 30
            elif purchase_order.status == 'store_allocated':
                current_status = "Materials Allocated from Stock"
                current_department = "Store"
                status_color = "blue"
                progress_percentage = 25
            elif purchase_order.status == 'insufficient_stock':
                current_status = "Insufficient Stock - Pending Purchase"
                current_department = "Store"
                status_color = "red"
                progress_percentage = 15
            elif purchase_order.status == 'pending_store_check':
                current_status = "Checking Stock Availability"
                current_department = "Store"
                status_color = "yellow"
                progress_percentage = 20
            elif purchase_order.status == 'finance_approved':
                current_status = "Finance Approved - Pending Store Processing"
                current_department = "Store"
                status_color = "blue"
                progress_percentage = 18
            elif purchase_order.status == 'pending_finance_approval':
                current_status = "Awaiting Finance Approval"
                current_department = "Finance"
                status_color = "yellow"
                progress_percentage = 15
            elif purchase_order.status == 'finance_rejected':
                current_status = "Finance Rejected"
                current_department = "Finance"
                status_color = "red"
                progress_percentage = 10
            elif purchase_order.status == 'pending_request':
                current_status = "Pending Purchase Request Approval"
                current_department = "Purchase"
                status_color = "yellow"
                progress_percentage = 10
        else:
            current_status = "Order Created - Pending Processing"
            current_department = "Purchase"
            status_color = "gray"
            progress_percentage = 5
        
        return {
            'current_status': current_status,
            'current_department': current_department,
            'status_color': status_color,
            'progress_percentage': progress_percentage
        }
    
    @staticmethod
    def _calculate_estimated_completion(progress_percentage):
        """Calculate estimated completion date based on progress"""
        days_to_completion = max(1, int((100 - progress_percentage) / 10))
        estimated_date = datetime.utcnow() + timedelta(days=days_to_completion)
        return estimated_date.isoformat()
    
    @staticmethod
    def _determine_priority(progress_percentage):
        """Determine order priority based on progress"""
        if progress_percentage > 80:
            return 'High'
        elif progress_percentage > 40:
            return 'Medium'
        else:
            return 'Low'
    
    @staticmethod
    def _calculate_summary_stats(order_log):
        """Calculate summary statistics for orders"""
        if not order_log:
            return {
                'inPurchase': 0,
                'inFinance': 0,
                'inStore': 0,
                'inAssembly': 0,
                'inShowroom': 0,
                'totalValue': 0,
                'avgProgress': 0
            }
        
        return {
            'inPurchase': len([o for o in order_log if o['currentDepartment'] == 'Purchase']),
            'inFinance': len([o for o in order_log if o['currentDepartment'] == 'Finance']),
            'inStore': len([o for o in order_log if o['currentDepartment'] == 'Store']),
            'inAssembly': len([o for o in order_log if o['currentDepartment'] == 'Assembly']),
            'inShowroom': len([o for o in order_log if o['currentDepartment'] == 'Showroom']),
            'totalValue': sum(o['orderValue'] for o in order_log),
            'avgProgress': sum(o['progressPercentage'] for o in order_log) / len(order_log)
        }
    
    @staticmethod
    def _build_order_timeline(order, purchase_order, assembly_order, showroom_product):
        """Build timeline for order progression"""
        timeline = [
            {
                'stage': 'Order Created',
                'status': 'completed',
                'date': order.created_at.isoformat(),
                'department': 'Production Planning'
            }
        ]
        
        if purchase_order:
            timeline.append({
                'stage': 'Purchase Request',
                'status': 'completed' if purchase_order.status != 'pending_request' else 'active',
                'date': purchase_order.created_at.isoformat(),
                'department': 'Purchase',
                'details': purchase_order.status
            })
        
        if assembly_order:
            timeline.append({
                'stage': 'Assembly Queued',
                'status': 'completed' if assembly_order.status != 'pending' else 'active',
                'date': assembly_order.created_at.isoformat(),
                'department': 'Assembly',
                'details': f"{assembly_order.status} ({assembly_order.progress}%)"
            })
        
        if showroom_product:
            timeline.append({
                'stage': 'Showroom Review',
                'status': 'completed' if showroom_product.showroom_status != 'pending_review' else 'active',
                'date': showroom_product.created_at.isoformat(),
                'department': 'Showroom',
                'details': showroom_product.showroom_status
            })
        
        return timeline
    
    @staticmethod
    def get_order_status_tracking(query: str | None = None):
        """Get real-time order status tracking for the status bar component.
        If query provided, filter to related production and sales orders.
        """
        try:
            from models import SalesOrder, DispatchRequest
            
            # Get production orders (last 30 days)
            production_orders = db.session.query(ProductionOrder).filter(
                ProductionOrder.created_at >= datetime.utcnow() - timedelta(days=30)
            ).order_by(ProductionOrder.created_at.desc()).all()
            
            # Get sales orders (last 30 days)
            sales_orders = db.session.query(SalesOrder).filter(
                SalesOrder.created_at >= datetime.utcnow() - timedelta(days=30)
            ).order_by(SalesOrder.created_at.desc()).all()
            
            production_tracking = []
            sales_tracking = []
            
            # Process Production Orders (Production → Purchase → Store → Assembly → Showroom)
            for order in production_orders:
                purchase_order = PurchaseOrder.query.filter_by(production_order_id=order.id).first()
                assembly_order = AssemblyOrder.query.filter_by(production_order_id=order.id).first()
                showroom_product = ShowroomProduct.query.filter_by(production_order_id=order.id).first()
                
                # Determine production order status (up to showroom)
                current_info = OrderTrackingService._determine_current_department_and_status(
                    order, purchase_order, assembly_order, showroom_product
                )
                
                # Do not skip showroom stage; it must appear under Production Orders
                
                # Skip production orders that have been fully delivered (edge case if encoded)
                if current_info.get('status') == 'delivered':
                    continue

                production_tracking.append({
                    'id': f"PO-{order.id}",
                    'orderNumber': f"PO-{order.id:04d}",
                    'productName': order.product_name,
                    'quantity': order.quantity,
                    'currentDepartment': current_info['current_department'],
                    'status': current_info['status'],
                    'progress': current_info.get('progress'),
                    'updatedAt': current_info.get('updated_at', order.created_at.isoformat()),
                    'createdAt': order.created_at.isoformat(),
                    'type': 'production'
                })
            
            # Process Sales Orders (Customer Order → Payment → Dispatch → Delivery)
            for sales_order in sales_orders:
                try:
                    showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
                    dispatch_request = DispatchRequest.query.filter_by(sales_order_id=sales_order.id).first()
                    
                    # Enforce business rule: Sales tracking starts only after product reaches showroom
                    # Skip sales orders whose product hasn't reached showroom availability
                    if not showroom_product:
                        continue
                    showroom_status = getattr(showroom_product, 'showroom_status', None)
                    if showroom_status not in ['available', 'sold']:
                        # Until showroom availability, treat order as production-only
                        continue

                    # Determine sales order status
                    current_info = OrderTrackingService._determine_current_department_and_status(
                        order=None,
                        purchase_order=None,
                        assembly_order=None,
                        showroom_product=showroom_product,
                        sales_order=sales_order,
                        dispatch_order=dispatch_request
                    )
                    
                    # Skip delivered orders from status tracker as requested
                    if current_info['status'] == 'delivered':
                        continue
                    
                    sales_tracking.append({
                        'id': f"SO-{sales_order.id}",
                        'orderNumber': sales_order.order_number,
                        'productName': showroom_product.name if showroom_product else 'Unknown Product',
                        'quantity': sales_order.quantity,
                        'currentDepartment': current_info['current_department'],
                        'status': current_info['status'],
                        'customerName': sales_order.customer_name,
                        'finalAmount': sales_order.final_amount,
                        'productionOrderId': getattr(showroom_product, 'production_order_id', None),
                        'updatedAt': current_info.get('updated_at', sales_order.updated_at.isoformat()),
                        'createdAt': sales_order.created_at.isoformat(),
                        'type': 'sales'
                    })
                    
                except Exception as e:
                    print(f"Error processing sales order {sales_order.id}: {e}")
                    continue
            
            # If no query, return all recent
            if not query or not str(query).strip():
                return {
                    'productionOrders': production_tracking,
                    'salesOrders': sales_tracking,
                    'summary': {
                        'totalProductionOrders': len(production_tracking),
                        'totalSalesOrders': len(sales_tracking)
                    }
                }

            # Normalize query
            q = str(query).strip().lower()

            def matches_order(o: dict) -> bool:
                try:
                    return (
                        (o.get('orderNumber') or '').lower().find(q) != -1 or
                        (o.get('productName') or '').lower().find(q) != -1 or
                        (o.get('customerName') or '').lower().find(q) != -1 or
                        (o.get('currentDepartment') or '').lower().find(q) != -1 or
                        (o.get('status') or '').lower().find(q) != -1 or
                        (str(o.get('id') or '')).lower().find(q) != -1
                    )
                except Exception:
                    return False

            # First pass: find directly matching items
            matching_production = [o for o in production_tracking if matches_order(o)]
            matching_sales = [o for o in sales_tracking if matches_order(o)]

            # Collect related items: link via production id
            related_production_ids = set()
            for so in matching_sales:
                if so.get('productionOrderId'):
                    related_production_ids.add(so['productionOrderId'])

            # From matching production, find linked sales by production id
            for po in matching_production:
                try:
                    po_id_num = int(str(po['orderNumber']).replace('PO-', '')) if str(po['orderNumber']).startswith('PO-') else None
                except Exception:
                    po_id_num = None
                if po_id_num:
                    related_production_ids.add(po_id_num)

            related_sales = [so for so in sales_tracking if so.get('productionOrderId') in related_production_ids]
            related_production = [po for po in production_tracking if (
                po.get('orderNumber') and po['orderNumber'].startswith('PO-') and
                int(po['orderNumber'].split('PO-')[-1]) in related_production_ids
            )]

            # Union: direct matches + related
            final_production = {id(po): po for po in matching_production + related_production}
            final_sales = {id(so): so for so in matching_sales + related_sales}

            return {
                'productionOrders': list(final_production.values()),
                'salesOrders': list(final_sales.values()),
                'summary': {
                    'totalProductionOrders': len(final_production),
                    'totalSalesOrders': len(final_sales)
                }
            }
            
        except Exception as e:
            raise Exception(f"Error getting order status tracking: {str(e)}")
    
    @staticmethod
    def _determine_current_department_and_status(order, purchase_order, assembly_order, showroom_product, sales_order=None, dispatch_order=None):
        """Determine current department and status for status tracking"""
        
        # Check dispatch/transport status first (most recent)
        if dispatch_order:
            # Company delivery: transport-related
            if dispatch_order.status in ['in_transit', 'assigned_transport']:
                return {
                    'current_department': 'transport',
                    'status': dispatch_order.status,
                    'customer_name': getattr(dispatch_order, 'customer_name', None),
                    'updated_at': getattr(dispatch_order, 'updated_at', datetime.utcnow()).isoformat()
                }
            # Dispatch-facing statuses (including self-delivery flow)
            elif dispatch_order.status in [
                'pending',
                'customer_details_required',
                'ready_for_pickup',
                'entered_for_pickup',
                'entered_for_pickp',
                'vehicle_entered',
                'vehicle_arrived',
                'ready_for_loading',
                'ready_for_load',
                'loaded',
                'sent_to_watchman'
            ]:
                return {
                    'current_department': 'dispatch',
                    'status': dispatch_order.status,
                    'customer_name': getattr(dispatch_order, 'customer_name', None),
                    'updated_at': getattr(dispatch_order, 'updated_at', datetime.utcnow()).isoformat()
                }
            # Completed dispatch: treat sales type-aware
            elif dispatch_order.status == 'completed':
                return {
                    'current_department': 'completed',
                    'status': 'delivered',
                    'customer_name': getattr(dispatch_order, 'customer_name', None),
                    'updated_at': getattr(dispatch_order, 'updated_at', datetime.utcnow()).isoformat()
                }
        
        # Check sales status (ensure any Sales Order appears under Sales even if status missing)
        if sales_order:
            # Finance approval flow for Sales
            finance_status = getattr(sales_order, 'payment_status', None)
            if finance_status in ['pending_finance_approval', 'finance_approved', 'finance_rejected']:
                return {
                    'current_department': 'finance',
                    'status': finance_status,
                    'customer_name': getattr(sales_order, 'customer_name', None),
                    'updated_at': getattr(sales_order, 'updated_at', datetime.utcnow()).isoformat()
                }

            order_status = getattr(sales_order, 'order_status', None)
            if order_status in ['pending_finance_approval', 'finance_approved', 'finance_rejected']:
                return {
                    'current_department': 'finance',
                    'status': order_status,
                    'customer_name': getattr(sales_order, 'customer_name', None),
                    'updated_at': getattr(sales_order, 'updated_at', datetime.utcnow()).isoformat()
                }
            if order_status == 'confirmed':
                return {
                    'current_department': 'sales',
                    'status': 'order_confirmed',
                    'customer_name': getattr(sales_order, 'customer_name', None),
                    'updated_at': getattr(sales_order, 'updated_at', datetime.utcnow()).isoformat()
                }
            elif order_status in ['pending', 'payment_pending']:
                return {
                    'current_department': 'sales',
                    'status': order_status,
                    'customer_name': getattr(sales_order, 'customer_name', None),
                    'updated_at': getattr(sales_order, 'updated_at', datetime.utcnow()).isoformat()
                }
            else:
                return {
                    'current_department': 'sales',
                    'status': 'pending',
                    'customer_name': getattr(sales_order, 'customer_name', None),
                    'updated_at': getattr(sales_order, 'updated_at', datetime.utcnow()).isoformat()
                }
        
        # Check showroom status
        if showroom_product:
            if showroom_product.showroom_status == 'available':
                return {
                    'current_department': 'showroom',
                    'status': 'available_for_sale',
                    'updated_at': getattr(showroom_product, 'updated_at', showroom_product.created_at).isoformat()
                }
            elif showroom_product.showroom_status in ['pending_review', 'testing']:
                return {
                    'current_department': 'showroom',
                    'status': showroom_product.showroom_status,
                    'updated_at': getattr(showroom_product, 'updated_at', showroom_product.created_at).isoformat()
                }
        
        # Check assembly status
        if assembly_order:
            if assembly_order.status == 'completed':
                return {
                    'current_department': 'assembly',
                    'status': 'completed',
                    'progress': 100,
                    'updated_at': getattr(assembly_order, 'updated_at', assembly_order.created_at).isoformat()
                }
            elif assembly_order.status == 'in_progress':
                return {
                    'current_department': 'assembly',
                    'status': 'in_progress',
                    'progress': assembly_order.progress or 0,
                    'updated_at': getattr(assembly_order, 'updated_at', assembly_order.created_at).isoformat()
                }
            elif assembly_order.status in ['pending', 'paused', 'rework']:
                return {
                    'current_department': 'assembly',
                    'status': assembly_order.status,
                    'progress': assembly_order.progress or 0,
                    'updated_at': getattr(assembly_order, 'updated_at', assembly_order.created_at).isoformat()
                }
        
        # Check purchase/store status
        if purchase_order:
            if purchase_order.status == 'verified_in_store':
                return {
                    'current_department': 'store',
                    'status': 'materials_ready',
                    'updated_at': getattr(purchase_order, 'updated_at', purchase_order.created_at).isoformat()
                }
            elif purchase_order.status in ['store_allocated', 'pending_store_check']:
                return {
                    'current_department': 'store',
                    'status': purchase_order.status,
                    'updated_at': getattr(purchase_order, 'updated_at', purchase_order.created_at).isoformat()
                }
            elif purchase_order.status in ['finance_approved', 'pending_finance_approval', 'finance_rejected']:
                return {
                    'current_department': 'finance',
                    'status': purchase_order.status,
                    'updated_at': getattr(purchase_order, 'updated_at', purchase_order.created_at).isoformat()
                }
            elif purchase_order.status in ['pending_request', 'insufficient_stock']:
                return {
                    'current_department': 'purchase',
                    'status': purchase_order.status,
                    'updated_at': getattr(purchase_order, 'updated_at', purchase_order.created_at).isoformat()
                }
        
        # Default - newly created order
        return {
            'current_department': 'production',
            'status': 'pending',
            'updated_at': order.created_at.isoformat()
        }
