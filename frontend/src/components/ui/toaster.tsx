import React from 'react'
import { useToast, ToastItem } from '@/hooks/use-toast'

function Icon({ type }: { type?: ToastItem['variant'] }) {
  const common = 'h-4 w-4'
  if (type === 'success') {
    return (
      <svg className={common} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3-3a1 1 0 011.415-1.415l2.293 2.293 6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
    )
  }
  if (type === 'destructive') {
    return (
      <svg className={common} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.536-11.536a1 1 0 00-1.414-1.414L10 7.172 7.879 5.05A1 1 0 106.464 6.464L8.586 8.586 6.464 10.707a1 1 0 101.415 1.415L10 10l2.121 2.122a1 1 0 001.415-1.415L11.414 8.586l2.122-2.122z" clipRule="evenodd"/></svg>
    )
  }
  return (
    <svg className={common} viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 110-16 8 8 0 010 16zm.75-5.5a.75.75 0 10-1.5 0v1a.75.75 0 001.5 0v-1zM10 6a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1z"/></svg>
  )
}

function classesFor(variant?: ToastItem['variant']) {
  switch (variant) {
    case 'success':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800'
    case 'destructive':
      return 'bg-rose-50 border-rose-200 text-rose-800'
    default:
      return 'bg-white border-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800'
  }
}

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToast()
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={`min-w-[300px] max-w-[380px] p-4 rounded-lg border shadow-lg backdrop-blur ${classesFor(t.variant)}`}>
          <div className="flex items-start gap-3">
            <Icon type={t.variant} />
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-semibold text-sm">{t.title}</div>}
              {t.description && <div className="text-sm opacity-90 mt-1">{t.description}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7.879 7.879a1 1 0 011.414 0L10 8.586l.707-.707a1 1 0 111.415 1.415L11.414 10l.708.707a1 1 0 01-1.415 1.415L10 11.414l-.707.708a1 1 0 01-1.414-1.415L8.586 10 7.88 9.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

