/**
 * Composants Popover
 */

import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface PopoverContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PopoverContext = createContext<PopoverContextType | undefined>(undefined);

interface PopoverProps {
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </PopoverContext.Provider>
  );
};

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children, asChild }) => {
  const context = useContext(PopoverContext);
  if (!context) throw new Error('PopoverTrigger must be used within Popover');
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => context.setOpen(!context.open)
    } as any);
  }
  
  return (
    <button onClick={() => context.setOpen(!context.open)}>
      {children}
    </button>
  );
};

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', children, ...props }, ref) => {
    const context = useContext(PopoverContext);
    if (!context) throw new Error('PopoverContent must be used within Popover');
    
    if (!context.open) return null;
    
    const alignmentClasses = {
      start: 'left-0',
      center: 'left-1/2 transform -translate-x-1/2',
      end: 'right-0'
    };
    
    return (
      <>
        {/* Overlay pour fermer le popover */}
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => context.setOpen(false)}
        />
        
        <div
          ref={ref}
          className={cn(
            "absolute z-50 mt-2 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            alignmentClasses[align],
            className
          )}
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
PopoverContent.displayName = "PopoverContent";

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
};