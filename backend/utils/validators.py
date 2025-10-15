"""
Input validation utility functions
"""
import re
from typing import Dict, List, Any

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> None:
    """
    Validate that all required fields are present in the data
    
    Args:
        data: Dictionary containing form data
        required_fields: List of required field names
        
    Raises:
        ValueError: If any required field is missing
    """
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None or data[field] == '':
            missing_fields.append(field)
    
    if missing_fields:
        raise ValueError(f'Missing required fields: {", ".join(missing_fields)}')

def validate_email(email: str) -> bool:
    """
    Validate email format
    
    Args:
        email: Email string to validate
        
    Returns:
        bool: True if email is valid, False otherwise
    """
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_phone(phone: str) -> bool:
    """
    Validate phone number format (basic validation)
    
    Args:
        phone: Phone number string to validate
        
    Returns:
        bool: True if phone number is valid, False otherwise
    """
    if not phone:
        return False
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Check if it has 10 digits (basic validation)
    return len(digits) >= 10

def validate_positive_integer(value: Any, field_name: str = "value") -> int:
    """
    Validate that a value is a positive integer
    
    Args:
        value: Value to validate
        field_name: Name of the field for error messages
        
    Returns:
        int: The validated integer value
        
    Raises:
        ValueError: If value is not a positive integer
    """
    try:
        int_value = int(value)
        if int_value <= 0:
            raise ValueError(f'{field_name} must be a positive integer')
        return int_value
    except (ValueError, TypeError):
        raise ValueError(f'{field_name} must be a valid positive integer')

def validate_positive_float(value: Any, field_name: str = "value") -> float:
    """
    Validate that a value is a positive float
    
    Args:
        value: Value to validate
        field_name: Name of the field for error messages
        
    Returns:
        float: The validated float value
        
    Raises:
        ValueError: If value is not a positive float
    """
    try:
        float_value = float(value)
        if float_value <= 0:
            raise ValueError(f'{field_name} must be a positive number')
        return float_value
    except (ValueError, TypeError):
        raise ValueError(f'{field_name} must be a valid positive number')

def validate_status(status: str, valid_statuses: List[str], field_name: str = "status") -> str:
    """
    Validate that a status is in the list of valid statuses
    
    Args:
        status: Status to validate
        valid_statuses: List of valid status values
        field_name: Name of the field for error messages
        
    Returns:
        str: The validated status
        
    Raises:
        ValueError: If status is not valid
    """
    if status not in valid_statuses:
        raise ValueError(f'{field_name} must be one of: {", ".join(valid_statuses)}')
    return status