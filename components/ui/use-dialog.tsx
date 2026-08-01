'use client';

/**
 * useConfirm — thay thế window.confirm() bằng Dialog đẹp hơn.
 *
 * Cách dùng:
 *   const { ConfirmDialog, confirm } = useConfirm();
 *
 *   // Trong JSX, đặt <ConfirmDialog /> một lần ở component root.
 *   // Gọi:
 *   const ok = await confirm({ title: '...', description: '...', confirmText: 'Xóa', variant: 'destructive' });
 *   if (ok) { ... }
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

type Resolver = (value: boolean) => void;

export function useConfirm() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<ConfirmOptions>({
    title: 'Xác nhận',
  });
  const resolverRef = React.useRef<Resolver | null>(null);

  const confirm = React.useCallback(
    (opts: ConfirmOptions): Promise<boolean> => {
      setOptions(opts);
      setOpen(true);
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    []
  );

  const handleClose = (result: boolean) => {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
  };

  const ConfirmDialog = React.useCallback(() => {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{options.title}</DialogTitle>
            {options.description && (
              <DialogDescription>
                {typeof options.description === 'string'
                  ? options.description
                  : <div>{options.description}</div>}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              {options.cancelText ?? 'Hủy'}
            </Button>
            <Button
              variant={options.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => handleClose(true)}
            >
              {options.confirmText ?? 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options]);

  return { confirm, ConfirmDialog };
}

// ─── useAlert ────────────────────────────────────────────────────────────────
/**
 * useAlert — thay thế window.alert() bằng Dialog đẹp hơn.
 *
 * Cách dùng:
 *   const { AlertDialog, alert: showAlert } = useAlert();
 *   await showAlert({ title: 'Thành công!', description: 'Đã lưu.' });
 */

interface AlertOptions {
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

type AlertResolver = () => void;

export function useAlert() {
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<AlertOptions>({ title: '' });
  const resolverRef = React.useRef<AlertResolver | null>(null);

  const alert = React.useCallback(
    (opts: AlertOptions): Promise<void> => {
      setOptions(opts);
      setOpen(true);
      return new Promise<void>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    []
  );

  const handleClose = () => {
    setOpen(false);
    resolverRef.current?.();
    resolverRef.current = null;
  };

  const iconMap: Record<string, string> = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    default: 'ℹ️',
  };

  const icon = iconMap[options.variant ?? 'default'];

  const AlertDialog = React.useCallback(() => {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{icon}</span>
              <span>{options.title}</span>
            </DialogTitle>
            {options.description && (
              <DialogDescription>
                {typeof options.description === 'string'
                  ? options.description
                  : <div>{options.description}</div>}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose}>
              {options.confirmText ?? 'Đóng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options]);

  return { alert, AlertDialog };
}
