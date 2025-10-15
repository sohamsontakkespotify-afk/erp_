"""
Notification Service Module
Handles real-time notifications for various system events
"""
from datetime import datetime
from typing import Dict, List, Optional
import json

class NotificationService:
    """Service class for managing notifications"""
    
    # In-memory storage for notifications (in production, use Redis or database)
    _notifications = []
    _max_notifications = 100  # Keep only last 100 notifications
    
    @classmethod
    def create_notification(cls, 
                          notification_type: str,
                          title: str, 
                          message: str,
                          data: Optional[Dict] = None,
                          department: Optional[str] = None,
                          priority: str = 'normal') -> Dict:
        """Create a new notification"""
        
        notification = {
            'id': len(cls._notifications) + 1,
            'type': notification_type,
            'title': title,
            'message': message,
            'data': data or {},
            'department': department,
            'priority': priority,  # low, normal, high, urgent
            'timestamp': datetime.utcnow().isoformat(),
            'read': False
        }
        
        # Add to notifications list
        cls._notifications.append(notification)
        
        # Keep only the most recent notifications
        if len(cls._notifications) > cls._max_notifications:
            cls._notifications = cls._notifications[-cls._max_notifications:]
        
        return notification
    
    @classmethod
    def get_notifications(cls, 
                         department: Optional[str] = None,
                         unread_only: bool = False,
                         limit: int = 50) -> List[Dict]:
        """Get notifications with optional filtering"""
        
        notifications = cls._notifications.copy()
        
        # Filter by department
        if department:
            notifications = [n for n in notifications if n.get('department') == department]
        
        # Filter by read status
        if unread_only:
            notifications = [n for n in notifications if not n.get('read', False)]
        
        # Sort by timestamp (newest first)
        notifications.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Apply limit
        return notifications[:limit]
    
    @classmethod
    def mark_as_read(cls, notification_id: int) -> bool:
        """Mark a notification as read"""
        
        for notification in cls._notifications:
            if notification['id'] == notification_id:
                notification['read'] = True
                return True
        return False
    
    @classmethod
    def mark_all_as_read(cls, department: Optional[str] = None) -> int:
        """Mark all notifications as read, optionally filtered by department"""
        
        count = 0
        for notification in cls._notifications:
            if not notification.get('read', False):
                if department is None or notification.get('department') == department:
                    notification['read'] = True
                    count += 1
        return count
    
    @classmethod
    def get_unread_count(cls, department: Optional[str] = None) -> int:
        """Get count of unread notifications"""
        
        notifications = cls._notifications
        
        if department:
            notifications = [n for n in notifications if n.get('department') == department]
        
        return len([n for n in notifications if not n.get('read', False)])
    
    # Specific notification types for transport/fleet management
    
    @classmethod
    def notify_driver_assigned(cls, driver_name: str, vehicle_number: str, 
                              order_number: str, customer_name: str) -> Dict:
        """Notify when a driver is assigned to a delivery"""
        
        return cls.create_notification(
            notification_type='driver_assigned',
            title='Driver Assigned',
            message=f'Driver {driver_name} (Vehicle: {vehicle_number}) assigned to delivery {order_number}',
            data={
                'driverName': driver_name,
                'vehicleNumber': vehicle_number,
                'orderNumber': order_number,
                'customerName': customer_name,
                'action': 'assigned'
            },
            department='transport',
            priority='normal'
        )
    
    @classmethod
    def notify_driver_available(cls, driver_name: str, vehicle_number: str, 
                               order_number: str, delivery_status: str) -> Dict:
        """Notify when a driver becomes available after delivery completion"""
        
        status_messages = {
            'delivered': 'successfully delivered',
            'cancelled': 'was cancelled',
            'failed': 'failed'
        }
        
        status_msg = status_messages.get(delivery_status, 'completed')
        
        return cls.create_notification(
            notification_type='driver_available',
            title='Driver Available',
            message=f'Driver {driver_name} (Vehicle: {vehicle_number}) is now available. Order {order_number} {status_msg}.',
            data={
                'driverName': driver_name,
                'vehicleNumber': vehicle_number,
                'orderNumber': order_number,
                'deliveryStatus': delivery_status,
                'action': 'available'
            },
            department='transport',
            priority='normal'
        )
    
    @classmethod
    def notify_delivery_status_change(cls, order_number: str, old_status: str, 
                                    new_status: str, driver_name: str, 
                                    vehicle_number: str) -> Dict:
        """Notify when delivery status changes"""
        
        priority = 'high' if new_status in ['delivered', 'failed'] else 'normal'
        
        return cls.create_notification(
            notification_type='delivery_status_change',
            title='Delivery Status Updated',
            message=f'Order {order_number} status changed from {old_status} to {new_status}',
            data={
                'orderNumber': order_number,
                'oldStatus': old_status,
                'newStatus': new_status,
                'driverName': driver_name,
                'vehicleNumber': vehicle_number
            },
            department='transport',
            priority=priority
        )
    
    @classmethod
    def notify_vehicle_status_change(cls, vehicle_number: str, driver_name: str,
                                   old_status: str, new_status: str, 
                                   context: str = '') -> Dict:
        """Notify when vehicle status changes"""
        
        context_msg = f" ({context})" if context else ""
        
        return cls.create_notification(
            notification_type='vehicle_status_change',
            title='Vehicle Status Updated',
            message=f'Vehicle {vehicle_number} ({driver_name}) status changed from {old_status} to {new_status}{context_msg}',
            data={
                'vehicleNumber': vehicle_number,
                'driverName': driver_name,
                'oldStatus': old_status,
                'newStatus': new_status,
                'context': context
            },
            department='fleet',
            priority='normal'
        )