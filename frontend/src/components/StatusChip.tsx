import type { RunStatus } from '../types';

interface StatusChipProps {
  status: RunStatus;
}

const labels: Record<RunStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span className={`status-chip ${status}`}>
      <span className="status-dot" />
      {labels[status]}
    </span>
  );
}
