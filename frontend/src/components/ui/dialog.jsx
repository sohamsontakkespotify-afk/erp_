import React from 'react';

const DialogContext = React.createContext({ open: false, onOpenChange: () => {} });

function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

function DialogTrigger({ children }) {
  return children;
}

function DialogContent({ children, className }) {
  const { open } = React.useContext(DialogContext);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className={"relative z-10 w-full max-w-2xl rounded-lg border border-border bg-background p-4 " + (className || '')}>
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ children }) {
  return <div className="mb-2">{children}</div>;
}

function DialogTitle({ children }) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}

function DialogDescription({ children }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function DialogFooter({ children }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
