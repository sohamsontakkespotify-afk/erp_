"""
Approval Routes
API endpoints for approval management
"""
from flask import Blueprint, request, jsonify
from services.approval_service import ApprovalService

approval_bp = Blueprint('approval', __name__)

@approval_bp.route('/pending', methods=['GET'])
def get_pending_approvals():
    """Get all pending approval requests"""
    try:
        approvals = ApprovalService.get_pending_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/all', methods=['GET'])
def get_all_approvals():
    """Get all approval requests"""
    try:
        approvals = ApprovalService.get_all_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/create', methods=['POST'])
def create_approval_request():
    """Create a new approval request"""
    try:
        data = request.get_json()
        
        if data.get('requestType') == 'free_delivery':
            required_fields = ['salesOrderId', 'requestedBy', 'requestDetails']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            result = ApprovalService.create_free_delivery_approval_request(
                sales_order_id=data['salesOrderId'],
                requested_by=data['requestedBy'],
                request_details=data['requestDetails']
            )
        else:
            # Default to coupon approval request
            required_fields = ['salesOrderId', 'requestedBy', 'couponCode', 'discountAmount', 'requestDetails']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            result = ApprovalService.create_coupon_approval_request(
                sales_order_id=data['salesOrderId'],
                requested_by=data['requestedBy'],
                coupon_code=data['couponCode'],
                discount_amount=data['discountAmount'],
                request_details=data['requestDetails']
            )
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/approve/<int:approval_id>', methods=['POST'])
def approve_request(approval_id):
    """Approve an approval request"""
    try:
        data = request.get_json()
        
        if 'approvedBy' not in data:
            return jsonify({'error': 'Missing required field: approvedBy'}), 400
        
        result = ApprovalService.approve_request(
            approval_id=approval_id,
            approved_by=data['approvedBy'],
            approval_notes=data.get('approvalNotes')
        )
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/reject/<int:approval_id>', methods=['POST'])
def reject_request(approval_id):
    """Reject an approval request"""
    try:
        data = request.get_json()
        
        required_fields = ['approvedBy', 'approvalNotes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = ApprovalService.reject_request(
            approval_id=approval_id,
            approved_by=data['approvedBy'],
            approval_notes=data['approvalNotes']
        )
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
