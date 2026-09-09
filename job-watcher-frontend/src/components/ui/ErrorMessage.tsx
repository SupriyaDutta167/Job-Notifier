import React from 'react';
import { cn } from '../../lib/utils';

interface ErrorMessageProps {
  message?: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className }) => {
  if (!message) return null;
  return (
    <div className={cn('text-sm font-medium text-red-500', className)}>
      {message}
    </div>
  );
};
