"""
Common helper utility functions
"""
from typing import List, Dict, Any

def calculate_order_value(materials: List[Dict[str, Any]], unit_price: float = 15.0) -> float:
    """
    Calculate total order value based on materials and unit price
    
    Args:
        materials: List of material dictionaries with 'quantity' field
        unit_price: Price per unit (default 15.0)
        
    Returns:
        float: Total calculated order value
    """
    if not materials:
        return 0.0
    
    total_quantity = sum(material.get('quantity', 0) for material in materials)
    return total_quantity * unit_price

def format_currency(amount: float, currency: str = "₹") -> str:
    """
    Format amount as currency
    
    Args:
        amount: Amount to format
        currency: Currency symbol (default ₹)
        
    Returns:
        str: Formatted currency string
    """
    return f"{currency}{amount:,.2f}"

def get_status_color(status: str) -> str:
    """
    Get color code for different status values
    
    Args:
        status: Status string
        
    Returns:
        str: Color code (CSS class or hex color)
    """
    status_colors = {
        # Production statuses
        'pending_materials': 'orange',
        'materials_requested': 'yellow',
        'materials_allocated': 'green',
        
        # Purchase statuses
        'pending_request': 'gray',
        'pending_finance_approval': 'yellow',
        'finance_approved': 'blue',
        'finance_rejected': 'red',
        'pending_store_check': 'yellow',
        'store_allocated': 'green',
        'insufficient_stock': 'red',
        'verified_in_store': 'green',
        
        # Assembly statuses
        'pending': 'gray',
        'in_progress': 'blue',
        'paused': 'orange',
        'completed': 'green',
        'sent_to_showroom': 'purple',
        
        # Showroom statuses
        'available': 'blue',
        'sold': 'green',
        'reserved': 'yellow',
        'pending_review': 'orange',
        
        # Default
        'unknown': 'gray'
    }
    
    return status_colors.get(status.lower(), 'gray')

def calculate_progress_percentage(current_stage: str) -> int:
    """
    Calculate progress percentage based on current stage
    
    Args:
        current_stage: Current processing stage
        
    Returns:
        int: Progress percentage (0-100)
    """
    stage_progress = {
        'order_created': 5,
        'purchase_requested': 10,
        'finance_approval': 15,
        'store_check': 20,
        'materials_allocated': 30,
        'assembly_started': 40,
        'assembly_in_progress': 60,
        'assembly_completed': 80,
        'showroom_review': 90,
        'available_for_sale': 95,
        'sold': 100
    }
    
    return stage_progress.get(current_stage.lower(), 0)

def truncate_text(text: str, max_length: int = 50) -> str:
    """
    Truncate text to specified length with ellipsis
    
    Args:
        text: Text to truncate
        max_length: Maximum length (default 50)
        
    Returns:
        str: Truncated text with ellipsis if needed
    """
    if not text or len(text) <= max_length:
        return text
    
    return text[:max_length-3] + "..."

def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safely divide two numbers, returning default if division by zero
    
    Args:
        numerator: Number to divide
        denominator: Number to divide by
        default: Default value if division by zero (default 0.0)
        
    Returns:
        float: Result of division or default value
    """
    if denominator == 0:
        return default
    return numerator / denominator

def group_by_field(items: List[Dict[str, Any]], field: str) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group list of dictionaries by a specific field
    
    Args:
        items: List of dictionaries to group
        field: Field name to group by
        
    Returns:
        dict: Grouped items by field value
    """
    grouped = {}
    for item in items:
        key = item.get(field, 'unknown')
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(item)
    
    return grouped

def parse_json_safely(json_string: str, default: Any = None) -> Any:
    """
    Safely parse JSON string, returning default if parsing fails
    
    Args:
        json_string: JSON string to parse
        default: Default value if parsing fails
        
    Returns:
        Any: Parsed JSON or default value
    """
    if not json_string:
        return default
    
    try:
        import json
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError):
        return default