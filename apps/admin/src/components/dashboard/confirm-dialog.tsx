'use client';

import { ActionModal } from './action-modal';
import { Button } from '@xelnova/ui';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirm', message = 'Are you sure?', loading }: ConfirmDialogProps) {
  return (
    <ActionModal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-text-secondary">{message}</p>
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading} size="sm">Delete</Button>
      </div>
    </ActionModal>
  );
}
