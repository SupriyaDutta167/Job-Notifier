import React from 'react';
import { Badge } from '../ui/Badge';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface ScanStatusBadgeProps {
  status: string;
  className?: string;
}

export const ScanStatusBadge: React.FC<ScanStatusBadgeProps> = ({ status, className }) => {
  const normalized = (status || '').toLowerCase();

  switch (normalized) {
    case 'completed':
      return (
        <Badge
          variant="success"
          className={`flex items-center gap-1 font-medium ${className || ''}`}
          aria-label="Scan Status: Completed"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>✓ Completed</span>
        </Badge>
      );
    case 'running':
      return (
        <Badge
          variant="outline"
          className={`flex items-center gap-1 font-medium bg-blue-50 text-blue-700 border-blue-200 ${className || ''}`}
          aria-label="Scan Status: Running"
        >
          <Clock className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          <span>⏳ Running</span>
        </Badge>
      );
    case 'partial':
      return (
        <Badge
          variant="warning"
          className={`flex items-center gap-1 font-medium ${className || ''}`}
          aria-label="Scan Status: Partial"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>⚠ Partial</span>
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="error"
          className={`flex items-center gap-1 font-medium ${className || ''}`}
          aria-label="Scan Status: Failed"
        >
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>✕ Failed</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="default" className={className} aria-label={`Scan Status: ${status}`}>
          <span>{status}</span>
        </Badge>
      );
  }
};
