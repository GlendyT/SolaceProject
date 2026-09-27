"use client";

import { useEffect, useState } from "react";
import { Check, Copy, FileCode2, X } from "lucide-react";
import { toast } from "sonner";

interface PayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  payload: unknown;
  subtitle?: string;
}

export function PayloadModal({
  isOpen,
  onClose,
  title,
  payload,
  subtitle,
}: PayloadModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(payload ?? {}, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast.success("Payload copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No fue posible copiar el payload");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileCode2 className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Cerrar modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content / JSON Viewer */}
        <div className="p-6">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                JSON Payload
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    <span className="text-emerald-600">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copiar JSON</span>
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-[380px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 shadow-inner">
              <code>{jsonString}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="button-secondary text-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
