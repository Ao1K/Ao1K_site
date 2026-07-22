'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import Cookies from 'js-cookie';

export type ToastMethod = 'stack' | 'replace';

export interface Toast {
  id: number;
  icon?: ReactNode;
  message: ReactNode;
  dismissKey?: string;
  duration: number;
}

export interface ToastOptions {
  icon?: ReactNode;
  message: ReactNode;
  dismissKey?: string;
  duration?: number;
  addMethod?: ToastMethod;
}

const DISMISSED_COOKIE_KEY = 'ao1kDismissedToasts';
const DEFAULT_DURATION = 6000;

const EMPTY: Toast[] = [];

let toasts: Toast[] = EMPTY;
let nextId = 1;

const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

const emit = () => listeners.forEach((listener) => listener());

const clearTimer = (id: number) => {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
};

const subscribe = (callback: () => void): (() => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

const getSnapshot = (): Toast[] => toasts;
const getServerSnapshot = (): Toast[] => EMPTY;

const readDismissed = (): string[] => {
  const raw = Cookies.get(DISMISSED_COOKIE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isToastDismissed = (dismissKey: string): boolean =>
  readDismissed().includes(dismissKey);

export const dismissToast = (id: number) => {
  clearTimer(id);
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
};

export const dismissToastPermanently = (id: number) => {
  const toast = toasts.find((entry) => entry.id === id);
  if (toast?.dismissKey) {
    const dismissed = readDismissed();
    if (!dismissed.includes(toast.dismissKey)) {
      Cookies.set(DISMISSED_COOKIE_KEY, JSON.stringify([...dismissed, toast.dismissKey]), { expires: 365 });
    }
  }
  dismissToast(id);
};

export const showToast = (options: ToastOptions): number | null => {
  if (options.dismissKey && isToastDismissed(options.dismissKey)) return null;

  const id = nextId++;
  const duration = options.duration ?? DEFAULT_DURATION;

  let remaining = toasts;
  if (options.addMethod === 'replace') {
    remaining = toasts.filter((toast) => {
      const sameKind = options.dismissKey ? toast.dismissKey === options.dismissKey : true;
      if (sameKind) clearTimer(toast.id);
      return !sameKind;
    });
  }

  toasts = [...remaining, { id, icon: options.icon, message: options.message, dismissKey: options.dismissKey, duration }];
  emit();

  if (duration > 0) {
    timers.set(id, setTimeout(() => dismissToast(id), duration));
  }

  return id;
};

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
