"""
Test the employee API to see what data is returned
"""
from app import create_app
from services.hr_service import HRService
import json

app = create_app()

with app.app_context():
    print("Testing HRService.get_employees()")
    print("=" * 80)
    
    employees = HRService.get_employees()
    
    # Find som singh
    som = None
    for emp in employees:
        if 'som' in emp.get('firstName', '').lower() or 'som' in emp.get('lastName', '').lower():
            som = emp
            break
    
    if som:
        print("\nFound Som Singh:")
        print(json.dumps(som, indent=2))
        print(f"\nSalary Type field: {som.get('salaryType')}")
        print(f"Salary Type (snake_case): {som.get('salary_type')}")
    else:
        print("\nSom Singh not found")
        print("\nAll employees:")
        for emp in employees:
            print(f"  - {emp.get('firstName')} {emp.get('lastName')} (ID: {emp.get('id')})")