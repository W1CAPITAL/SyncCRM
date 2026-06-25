'use client';

/**
 * @fileOverview Emissor de Erros - Refatorado para objeto literal para evitar erro de 'super' keyword.
 */

type Listener = (error: any) => void;
const listeners: Record<string, Listener[]> = {};

export const errorEmitter = {
  on(event: string, listener: Listener) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(listener);
  },
  off(event: string, listener: Listener) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((l) => l !== listener);
    }
  },
  emit(event: string, error: any) {
    if (listeners[event]) {
      listeners[event].forEach((l) => l(error));
    }
  }
};
