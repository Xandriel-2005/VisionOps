import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-md sm:p-lg">
      <div 
        ref={modalRef}
        className="bg-surface glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-outline-variant shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
        
        <div className="flex justify-between items-center p-md sm:p-lg border-b border-outline-variant">
          <h2 className="title-lg font-bold text-foreground">{title}</h2>
          <button 
            onClick={onClose}
            className="p-sm rounded-full hover:bg-surface-raised transition-colors text-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-md sm:p-lg overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
