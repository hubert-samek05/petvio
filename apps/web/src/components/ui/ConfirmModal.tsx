'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  isOpen,
  title,
  description,
  details,
  confirmLabel = 'Usuń',
  cancelLabel = 'Anuluj',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in"
        onClick={loading ? undefined : onCancel}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-scale-in">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all flex items-center justify-center disabled:opacity-50"
          aria-label="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2 pr-8">{title}</h3>
        {description && <p className="text-sm text-gray-500 leading-relaxed">{description}</p>}
        {details && details.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {details.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm text-gray-500">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 pv-btn-ghost py-3 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Usuwanie…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
