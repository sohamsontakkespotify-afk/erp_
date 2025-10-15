import React from 'react';

function Table({ children }) {
  return <table className="w-full text-sm text-left text-foreground/90">{children}</table>;
}

function TableHeader({ children }) {
  return <thead className="text-xs uppercase text-foreground/60">{children}</thead>;
}

function TableBody({ children }) {
  return <tbody className="divide-y divide-border/40">{children}</tbody>;
}

function TableRow({ children, className }) {
  return <tr className={className}>{children}</tr>;
}

function TableHead({ children, className }) {
  return <th className={className + ' px-4 py-3'}>{children}</th>;
}

function TableCell({ children, className }) {
  return <td className={className + ' px-4 py-3'}>{children}</td>;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
