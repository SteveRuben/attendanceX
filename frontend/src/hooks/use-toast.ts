import { useCallback, useEffect, useState } from 'react'

export type ToastVariant = 'default' | 'success' | 'destructive'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastState {
  toasts: ToastItem[]
}

const state: ToastState = { toasts: [] }
const listeners: Array<(s: ToastState) => void> = []

function notify() {
  for (const l of listeners) l(state)
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

export function showToast(t: Omit<ToastItem, 'id'>): string {
  const id = genId()
  const toast: ToastItem = { id, variant: 'default', duration: 5000, ...t }
  state.toasts.push(toast)
  notify()
  if (toast.duration && toast.duration > 0) {
    setTimeout(() => dismissToast(id), toast.duration)
  }
  return id
}

export function updateToast(id: string, patch: Partial<Omit<ToastItem, 'id'>>) {
  const idx = state.toasts.findIndex(t => t.id === id)
  if (idx >= 0) {
    state.toasts[idx] = { ...state.toasts[idx], ...patch }
    notify()
  }
}

export function dismissToast(id: string) {
  const idx = state.toasts.findIndex(t => t.id === id)
  if (idx >= 0) {
    state.toasts.splice(idx, 1)
    notify()
  }
}

export function clearToasts() {
  state.toasts = []
  notify()
}

export function useToast() {
  const [data, setData] = useState(state)

  useEffect(() => {
    const listener = (s: ToastState) => setData({ ...s })
    listeners.push(listener)
    return () => {
      const i = listeners.indexOf(listener)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => showToast(t), [])
  const dismiss = useCallback((id: string) => dismissToast(id), [])

  return { toast, dismiss, toasts: data.toasts }
}

