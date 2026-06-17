import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  visible: boolean;
  resolve: ((value: boolean) => void) | null;
}

const initialState: ConfirmState = {
  visible: false,
  message: '',
  title: '',
  confirmText: '确认',
  cancelText: '取消',
  danger: false,
  resolve: null,
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(initialState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        visible: true,
        title: options.title || '',
        message: options.message,
        confirmText: options.confirmText || '确认',
        cancelText: options.cancelText || '取消',
        danger: options.danger || false,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState(initialState);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState(initialState);
  }, []);

  const ConfirmDialog = state.visible ? (
    createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-5" onClick={handleCancel}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
          {state.title && <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-2">{state.title}</h3>}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{state.message}</p>
          <div className="flex gap-2">
            <button onClick={handleCancel}
              className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold">
              {state.cancelText}
            </button>
            <button onClick={handleConfirm}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white ${state.danger ? 'bg-red-500' : 'bg-green-600'}`}>
              {state.confirmText}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  ) : null;

  return { confirm, ConfirmDialog };
}
