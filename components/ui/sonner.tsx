'use client'

import { Toaster as SonnerToaster } from 'sonner'

/** Sonner toasts — appearance follows system preference. */
export function Toaster() {
  return (
    <SonnerToaster
      theme="system"
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'border-border/80 bg-card text-card-foreground shadow-soft rounded-xl border font-sans',
          title: 'font-medium',
          description: 'text-muted-foreground',
          closeButton: 'text-muted-foreground hover:text-foreground',
          error:
            'border-destructive/45 bg-destructive/10 text-destructive [&_[data-description]]:text-destructive/90 dark:bg-destructive/15',
        },
      }}
    />
  )
}
