import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './useConfirm'

type PendingConfirm = {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

/**
 * Replaces window.confirm() with an in-app dialog: matches the rest of the admin's look,
 * doesn't block the JS event loop, and is keyboard/focus-trapped like other admin overlays.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useFocusTrap(Boolean(pending), dialogRef)

  const confirm = useCallback<ConfirmFn>((options) => {
    const normalized = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setPending({ options: normalized, resolve })
    })
  }, [])

  const settle = (result: boolean) => {
    pending?.resolve(result)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="admin-modal-overlay" onClick={() => settle(false)}>
          <div
            className="admin-confirm-dialog"
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.options.title ?? 'Confirmación'}
            onClick={(e) => e.stopPropagation()}
          >
            {pending.options.title && <h3>{pending.options.title}</h3>}
            <p>{pending.options.message}</p>
            <div className="admin-confirm-dialog__actions">
              <button type="button" className="admin-button" onClick={() => settle(false)}>
                {pending.options.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                className={`admin-button admin-button--primary${pending.options.danger ? ' admin-button--danger' : ''}`}
                onClick={() => settle(true)}
                autoFocus
              >
                {pending.options.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
