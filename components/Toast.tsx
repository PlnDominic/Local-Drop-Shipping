'use client';

import React from 'react';
import { create } from 'zustand';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));

export const useToast = () => {
  const { addToast } = useToastStore();
  return { showToast: addToast };
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info;
  const colors = {
    success: 'border-[#f04438]/20 bg-white text-[#151515]',
    error: 'border-[#f04438]/40 bg-white text-[#151515]',
    info: 'border-[#d8d8d8] bg-white text-[#151515]'
  };
  const iconColors = {
    success: 'text-[#f04438]',
    error: 'text-[#f04438]',
    info: 'text-[#777]'
  };

  return (
    <div className={`flex items-start gap-3 border p-4 shadow-2xl min-w-[300px] max-w-sm animate-slide-down ${colors[toast.type]}`}>
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconColors[toast.type]}`} />
      <p className="flex-1 text-sm font-semibold leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-[#999] hover:text-[#151515] transition-colors"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};
