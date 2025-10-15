#!/usr/bin/env python3
"""
Script to process pending dispatch orders to create sample transport jobs and gate passes
This will populate data for Transport and Watchman departments
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from models import db, DispatchRequest, TransportJob, GatePass, SalesOrder, ShowroomProduct
from datetime import datetime

def process_sample_orders():
    """Process some pending dispatch orders to create sample data"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 Processing pending dispatch orders...")
            
            # Get some pending orders
            pending_orders = DispatchRequest.query.filter_by(status='pending').limit(5).all()
            
            if not pending_orders:
                print("❌ No pending dispatch orders found!")
                return
            
            processed_count = 0
            
            for dispatch_request in pending_orders:
                print(f"\n📋 Processing Order ID: {dispatch_request.id}")
                print(f"   Customer: {dispatch_request.party_name}")
                print(f"   Delivery Type: {dispatch_request.delivery_type}")
                
                # Ensure customer details are complete
                if not dispatch_request.party_contact:
                    dispatch_request.party_contact = "1234567890"
                if not dispatch_request.party_address:
                    dispatch_request.party_address = "Sample Address, City"
                
                if dispatch_request.delivery_type == 'self':
                    # Process as self pickup - create gate pass for watchman
                    dispatch_request.status = 'ready_for_pickup'
                    dispatch_request.dispatch_notes = 'Ready for customer self-pickup'
                    dispatch_request.updated_at = datetime.utcnow()
                    
                    # Create gate pass for watchman
                    gate_pass = GatePass(
                        dispatch_request_id=dispatch_request.id,
                        party_name=dispatch_request.party_name,
                        vehicle_no=f'MH12AB{1000 + dispatch_request.id}',  # Sample vehicle number
                        status='pending'
                    )
                    
                    db.session.add(gate_pass)
                    print(f"   ✅ Created Gate Pass ID: {gate_pass.id} for Watchman")
                    
                elif dispatch_request.delivery_type == 'transport':
                    # Process as transport delivery - create transport job
                    dispatch_request.status = 'assigned_transport'
                    dispatch_request.dispatch_notes = 'Ready for company transport delivery'
                    dispatch_request.updated_at = datetime.utcnow()
                    
                    # Create transport job
                    transport_job = TransportJob(
                        dispatch_request_id=dispatch_request.id,
                        transporter_name=f'Transporter-{dispatch_request.id}',  # Sample transporter
                        vehicle_no=f'MH14CD{2000 + dispatch_request.id}',  # Sample vehicle
                        status='pending'
                    )
                    
                    db.session.add(transport_job)
                    print(f"   ✅ Created Transport Job ID: {transport_job.id} for Transport Department")
                
                processed_count += 1
            
            # Commit all changes
            db.session.commit()
            print(f"\n🎉 Successfully processed {processed_count} dispatch orders!")
            print("📊 Data should now be visible in Transport and Watchman departments")
            
            # Print summary
            transport_jobs_count = TransportJob.query.count()
            gate_passes_count = GatePass.query.count()
            
            print(f"\n📈 Current Data Summary:")
            print(f"   🚚 Transport Jobs: {transport_jobs_count}")
            print(f"   🚪 Gate Passes: {gate_passes_count}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error processing orders: {str(e)}")
            raise

if __name__ == '__main__':
    process_sample_orders()
