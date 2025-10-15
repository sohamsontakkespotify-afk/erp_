#!/usr/bin/env python3
"""
Script to add OrderStatusBar import and component to all department components
"""

import os
import re

# List of component files to modify
COMPONENT_FILES = [
    'frontend/src/components/DispatchDepartment.jsx',
    'frontend/src/components/FinanceDepartment.jsx',
    'frontend/src/components/PurchaseDepartment.jsx',
    'frontend/src/components/SalesDepartment.jsx',
    'frontend/src/components/ShowroomDepartment.jsx',
    'frontend/src/components/StoreDepartment.jsx',
    'frontend/src/components/TransportDepartment.jsx',
    'frontend/src/components/WatchmanDepartment.jsx'
]

def add_import_if_not_exists(content, import_line):
    """Add import if it doesn't already exist"""
    if 'OrderStatusBar' in content:
        print("  - OrderStatusBar import already exists")
        return content
    
    # Find the last import line
    import_pattern = r'^import.*from.*;\s*$'
    lines = content.split('\n')
    last_import_index = -1
    
    for i, line in enumerate(lines):
        if re.match(import_pattern, line.strip()):
            last_import_index = i
    
    if last_import_index != -1:
        lines.insert(last_import_index + 1, import_line)
        print("  - Added OrderStatusBar import")
        return '\n'.join(lines)
    else:
        print("  - Could not find where to add import")
        return content

def add_status_bar_component(content):
    """Add OrderStatusBar component to the layout"""
    if 'OrderStatusBar' in content and '<OrderStatusBar' in content:
        print("  - OrderStatusBar component already exists")
        return content
    
    # Pattern to match after header closing div and before main content
    patterns = [
        # Pattern 1: Look for </div> followed by main content div
        (r'(</div>\s*</div>\s*</div>\s*)\n\s*(\{/\* [^}]* \*/\}?\s*<div className="[^"]*mx-auto[^"]*px-6[^"]*py-8[^"]*">)',
         r'\1\n\n      {/* Order Status Bar */}\n      <div className="max-w-7xl mx-auto px-6 py-4">\n        <OrderStatusBar className="mb-4" />\n      </div>\n\n      \2'),
        
        # Pattern 2: Look for closing header div followed by main content
        (r'(</div>\s*}\s*)\n\s*(\{/\* [^}]* \*/\}?\s*<div className="[^"]*px-6[^"]*py-6[^"]*">)',
         r'\1\n\n                {/* Order Status Bar */}\n                <div className="max-w-7xl mx-auto px-6 py-4">\n                  <OrderStatusBar className="mb-4" />\n                </div>\n\n                \2'),
        
        # Pattern 3: Generic pattern for main content div
        (r'(</div>\s*)\n\s*(\{/\* .*Main Content.* \*/\}?\s*<div)',
         r'\1\n\n      {/* Order Status Bar */}\n      <div className="max-w-7xl mx-auto px-6 py-4">\n        <OrderStatusBar className="mb-4" />\n      </div>\n\n      \2'),
    ]
    
    for pattern, replacement in patterns:
        if re.search(pattern, content, re.MULTILINE | re.DOTALL):
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
            print("  - Added OrderStatusBar component")
            return content
    
    print("  - Could not find where to add OrderStatusBar component")
    return content

def process_file(file_path):
    """Process a single component file"""
    print(f"Processing {file_path}...")
    
    if not os.path.exists(file_path):
        print(f"  - File not found: {file_path}")
        return
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add import
        import_line = "import OrderStatusBar from '@/components/ui/OrderStatusBar';"
        content = add_import_if_not_exists(content, import_line)
        
        # Add component
        content = add_status_bar_component(content)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  - Successfully processed {file_path}")
        
    except Exception as e:
        print(f"  - Error processing {file_path}: {e}")

def main():
    print("Adding OrderStatusBar to all department components...\n")
    
    for file_path in COMPONENT_FILES:
        process_file(file_path)
        print()
    
    print("Done!")

if __name__ == "__main__":
    main()