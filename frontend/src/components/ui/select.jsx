import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const SelectContext = React.createContext({ 
  value: undefined, 
  onValueChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
  selectedLabel: ''
});

function Select({ value, onValueChange, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  
  return (
    <SelectContext.Provider value={{ 
      value, 
      onValueChange: (newValue, label) => {
        onValueChange(newValue);
        setSelectedLabel(label);
        setIsOpen(false);
      }, 
      isOpen, 
      setIsOpen,
      selectedLabel
    }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({ className, children }) {
  const { isOpen, setIsOpen } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

function SelectValue({ placeholder }) {
  const { value, selectedLabel } = React.useContext(SelectContext);
  return (
    <span className="block truncate">
      {selectedLabel || value || placeholder || ''}
    </span>
  );
}

function SelectContent({ className, children }) {
  const { isOpen } = React.useContext(SelectContext);
  const contentRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contentRef.current && !contentRef.current.contains(event.target)) {
        // This will be handled by the Select component
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      ref={contentRef}
      className={cn(
        'absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
        className
      )}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  );
}

function SelectItem({ value, children }) {
  const { onValueChange } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
      onClick={() => onValueChange && onValueChange(value, children)}
    >
      {children}
    </button>
  );
}

// Fallback: also export a native select for simple usage
function NativeSelect({ value, onChange, children, className }) {
  return (
    <select
      className={cn('h-10 w-full rounded-md border border-input bg-background px-3 text-sm', className)}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {children}
    </select>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, NativeSelect };
